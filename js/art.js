'use strict';
/* Pizzeria on Mars — all procedural art (used when no generated image is available) */
(function () {
  const A = PM.art = {};
  const OUT = A.OUT = '#2a0c18';
  const TAU = Math.PI * 2;

  /* ---------- primitives ---------- */
  A.rr = function (c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };
  A.fs = function (c, fill, lw = 2.5, stroke = OUT) {
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (lw) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  };
  A.circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); };
  A.ellipse = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); };
  A.lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
  A.rg = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
  A.glow = function (c, x, y, r, color, alpha = 1) {
    c.save(); c.globalAlpha *= alpha;
    c.fillStyle = A.rg(c, x, y, 0, r, [color, 'rgba(0,0,0,0)']);
    c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  };
  A.text = function (c, str, x, y, o = {}) {
    c.save();
    if (o.alpha !== undefined) c.globalAlpha *= Math.max(0, o.alpha);
    c.font = o.font || PM.font(o.size || 28, o.weight || 800, o.title);
    c.textAlign = o.align || 'center';
    c.textBaseline = o.base || 'middle';
    if (o.maxW) { const w = c.measureText(str).width; if (w > o.maxW) { const s = o.maxW / w; c.translate(x, y); c.scale(s, 1); x = 0; y = 0; } }
    if (o.shadow) { c.shadowColor = o.shadow; c.shadowBlur = o.blur || 14; }
    if (o.stroke) { c.lineWidth = o.lw || 6; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(str, x, y); }
    c.shadowBlur = 0;
    c.fillStyle = o.color || '#fde7c8';
    c.fillText(str, x, y);
    c.restore();
  };
  // draw a generated sprite image anchored bottom-centre with height h; returns true if drawn
  A.img = function (c, key, x, y, h, flip, ay = 1) {
    const im = PM.img[key];
    if (!im) return false;
    const w = h * im.width / im.height;
    c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
    c.drawImage(im, -w / 2, -h * ay, w, h);
    c.restore();
    return true;
  };
  A.imgFit = function (c, key, x, y, w, h) { // fit inside box, centred
    const im = PM.img[key]; if (!im) return false;
    const s = Math.min(w / im.width, h / im.height);
    c.drawImage(im, x + (w - im.width * s) / 2, y + (h - im.height * s) / 2, im.width * s, im.height * s);
    return true;
  };
  A.cover = function (c, key, ox = 0, oy = 0, zoom = 1) {
    const im = PM.img[key]; if (!im) return false;
    const s = Math.max(PM.W / im.width, PM.H / im.height) * zoom;
    const w = im.width * s, h = im.height * s;
    c.drawImage(im, (PM.W - w) / 2 + ox, (PM.H - h) / 2 + oy, w, h);
    return true;
  };

  /* ---------- themes ---------- */
  A.THEMES = {
    canyon: { sky: ['#1b0a22', '#4a1630', '#a83a2c', '#e0703a'], planet: ['#f08850', '#c0402a', '#6a1a1e'], far: '#6e2230', mid: '#8e3024', haze: 'rgba(255,130,70,0.22)',
      rock: '#b0432c', rockDark: '#7a2a20', rockDeep: '#5a1c1a', crust: '#e2703c', crustHi: '#f7a868', liquid: 'lava', amb: 'ember', star: true },
    acid: { sky: ['#0b1410', '#1f2a1c', '#4e5a22', '#9aa83a'], planet: ['#c8e070', '#7a9a2a', '#2a3a12'], far: '#2e3220', mid: '#4a3524', haze: 'rgba(160,230,60,0.18)',
      rock: '#8a4a2e', rockDark: '#5e2e20', rockDeep: '#3e1e18', crust: '#7ab83a', crustHi: '#b8e85a', liquid: 'acid', amb: 'bubble', star: true },
    crystal: { sky: ['#0e0820', '#2a1248', '#6a2a80', '#c05aa0'], planet: ['#e0a0f0', '#9a4ac0', '#3a1650'], far: '#2e1442', mid: '#4a1e5a', haze: 'rgba(200,120,255,0.2)',
      rock: '#6e3a7e', rockDark: '#4a2458', rockDeep: '#2e143a', crust: '#b46ad8', crustHi: '#e0a8f8', liquid: 'acid', amb: 'sparkle', star: true },
    castle: { sky: ['#080306', '#1e0810', '#4a0e16', '#8a1a1a'], planet: ['#ff6a4a', '#a01818', '#3a0608'], far: '#220a12', mid: '#321018', haze: 'rgba(255,60,40,0.18)',
      rock: '#4a2a3e', rockDark: '#32192a', rockDeep: '#1e0e1a', crust: '#6e3e58', crustHi: '#9a6080', liquid: 'lava', amb: 'ash', star: true, brick: true }
  };

  /* ---------- hero: chef astronaut ---------- */
  function leg(c, hx, hy, ang, col) {
    c.save(); c.translate(hx, hy); c.rotate(ang);
    A.rr(c, -4.5, -2, 9, 16, 4); A.fs(c, col, 2.5);
    A.rr(c, -5.5, 11, 13, 8, 3.5); A.fs(c, '#6a5f78', 2.5);
    c.restore();
  }
  A.hero = function (c, x, y, o) {
    const t = o.t || 0, st = o.state || 'idle', ph = o.phase || 0;
    c.save(); c.translate(x, y);
    if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
    c.rotate(o.tilt || 0);
    c.scale((o.face || 1) * (o.sx || 1), o.sy || 1);
    if (o.glow) A.glow(c, 0, -34, 52, 'rgba(90,200,255,0.55)', 0.6 + Math.sin(t * 20) * 0.2);
    const key = (st === 'jump' || st === 'fall') && PM.img.hero_jump ? 'hero_jump' : 'hero';
    if (PM.img[key]) {
      const bob = st === 'run' ? -Math.abs(Math.sin(ph)) * 4 : (st === 'idle' ? Math.sin(t * 2.5) * 1 : 0);
      const rot = st === 'run' ? Math.sin(ph * 2) * 0.05 : 0;
      c.rotate(rot);
      A.img(c, key, 0, bob + 2, 70);
      c.restore();
      return;
    }
    let la = 0, lb = 0, bob = 0;
    if (st === 'run') { la = Math.sin(ph) * 0.75; lb = -la; bob = -Math.abs(Math.cos(ph)) * 3; }
    else if (st === 'jump') { la = -0.7; lb = 0.45; bob = -1; }
    else if (st === 'fall') { la = 0.35; lb = -0.25; }
    else if (st === 'climb') { la = Math.sin(ph) * 0.4; lb = -la; }
    else bob = Math.sin(t * 2.5) * 0.8;
    c.translate(0, bob);
    // scarf tail
    const w = Math.sin(t * 12) * 2.5, fly = st === 'run' || st === 'jump' || st === 'fall' ? 1 : 0.4;
    c.beginPath(); c.moveTo(-5, -40);
    c.quadraticCurveTo(-16, -42 + w, -27 * fly - 6, -37 + w * 1.5 + (1 - fly) * 14);
    c.lineTo(-25 * fly - 6, -31 + w * 1.5 + (1 - fly) * 14);
    c.quadraticCurveTo(-14, -35, -5, -34); c.closePath();
    A.fs(c, '#d8322a', 2.5);
    // backpack
    A.rr(c, -19, -43, 10, 21, 3); A.fs(c, '#a094b2', 2.5);
    A.circle(c, -14, -37, 2.2); A.fs(c, t % 1 < 0.5 ? '#ff9a3a' : '#ffd36a', 0);
    // back leg
    leg(c, -4, -18, lb, '#d6cedd');
    // body
    A.rr(c, -12, -44, 25, 29, 9); A.fs(c, '#f4f0f4', 2.5);
    c.save(); A.rr(c, -12, -44, 25, 29, 9); c.clip();
    c.fillStyle = 'rgba(120,100,150,0.18)'; c.fillRect(-12, -24, 25, 10); c.restore();
    A.rr(c, -12, -23, 25, 5, 2); A.fs(c, '#ef7a2c', 2);
    A.rr(c, -7, -38, 11, 9, 2.5); A.fs(c, '#5a4878', 2);
    ['#ff4a3a', '#ffd23a', '#4ac8ff'].forEach((col, i) => { A.circle(c, -4.5 + i * 3.2, -33.5, 1.3); c.fillStyle = col; c.fill(); });
    // front leg
    leg(c, 5, -18, la, '#f4f0f4');
    // pizza box + arms
    const bx = st === 'climb' ? 4 : 10, by = st === 'climb' ? -46 : -33;
    c.lineCap = 'round';
    c.strokeStyle = OUT; c.lineWidth = 10;
    c.beginPath(); c.moveTo(2, -38); c.lineTo(bx + 1, by + 3); c.stroke();
    c.strokeStyle = '#ecE6ee'; c.lineWidth = 5.5; c.stroke();
    if (st !== 'climb') {
      A.rr(c, bx - 1, by - 4, 23, 9, 2); A.fs(c, '#f2e2c2', 2.5);
      c.fillStyle = '#d8322a'; c.fillRect(bx + 3, by - 1, 15, 2.2);
      A.circle(c, bx + 1, by + 2, 3.6); A.fs(c, '#f4f0f4', 2);
      A.circle(c, bx + 20, by + 2, 3.6); A.fs(c, '#f4f0f4', 2);
    } else {
      A.circle(c, bx + 1, by + 3, 4); A.fs(c, '#f4f0f4', 2);
    }
    // helmet
    A.circle(c, 0, -56, 16.5); A.fs(c, '#f7f3f7', 3);
    c.save(); A.circle(c, 0, -56, 16.5); c.clip(); c.fillStyle = 'rgba(110,90,140,0.18)'; c.fillRect(-17, -50, 34, 12); c.restore();
    A.ellipse(c, 4.5, -55.5, 11.5, 10.5); A.fs(c, A.lg(c, 0, -66, 6, -45, ['#3a5ad0', '#152060', '#0a0f2a']), 2.5);
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2.2;
    c.beginPath(); c.arc(4.5, -55.5, 7.5, -2.7, -1.8); c.stroke();
    A.circle(c, 10, -50, 1.4); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill();
    // chef hat (union outline trick)
    const puffs = [[-8, -76, 7.5], [0, -80, 9], [8, -76, 7.5]];
    c.fillStyle = OUT;
    puffs.forEach(p => { A.circle(c, p[0], p[1], p[2] + 2.5); c.fill(); });
    c.fillRect(-11.5, -77.5, 23, 9.5);
    c.fillStyle = '#ffffff';
    puffs.forEach(p => { A.circle(c, p[0], p[1], p[2]); c.fill(); });
    c.fillRect(-9, -76, 18, 6);
    c.fillStyle = 'rgba(140,120,170,0.25)'; c.fillRect(-9, -73, 18, 3);
    c.restore();
  };

  /* ---------- enemies ---------- */
  A.alien = function (c, x, y, o) {
    c.save(); c.translate(x, y); c.scale((o.face || 1) * (o.sx || 1), o.sy || 1);
    if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
    if (A.img(c, 'alien', 0, 2, 50, true)) { c.restore(); return; }
    const t = o.t || 0;
    A.ellipse(c, -9, -3, 7, 4); A.fs(c, '#4e8e2a', 2.5);
    A.ellipse(c, 9, -3, 7, 4); A.fs(c, '#4e8e2a', 2.5);
    const sw = Math.sin(t * 6) * 3;
    c.strokeStyle = OUT; c.lineWidth = 2.5;
    [[-7, -1], [7, 1]].forEach(([ax, s]) => {
      c.beginPath(); c.moveTo(ax, -32); c.quadraticCurveTo(ax * 1.6, -44, ax * 1.8 + sw * s, -50); c.stroke();
      A.circle(c, ax * 1.8 + sw * s, -51, 4); A.fs(c, '#b8f06a', 2.2);
    });
    A.ellipse(c, 0, -20, 19, 18); A.fs(c, A.lg(c, 0, -38, 0, -2, ['#9ae05a', '#5aa82e']), 2.8);
    A.ellipse(c, 0, -12, 12, 7); c.fillStyle = 'rgba(220,255,160,0.35)'; c.fill();
    [[-12, -26, 2.5], [13, -18, 2], [-10, -10, 1.8]].forEach(s => { A.circle(c, s[0], s[1], s[2]); c.fillStyle = 'rgba(40,90,20,0.45)'; c.fill(); });
    A.circle(c, 1, -25, 9); A.fs(c, '#fffbe8', 2.5);
    const lk = PM.clamp(o.look || 0, -1, 1) * 3;
    A.circle(c, 1 - lk, -25, 4.5); c.fillStyle = '#1a0a10'; c.fill();
    A.circle(c, -1 - lk, -27, 1.6); c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.moveTo(-6, -13); c.quadraticCurveTo(0, -4, 6, -13); c.closePath(); A.fs(c, '#4a0a1a', 2);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-4, -12.5); c.lineTo(-2.5, -9.5); c.lineTo(-1, -12.5); c.fill();
    c.beginPath(); c.moveTo(1, -12.5); c.lineTo(2.5, -9.5); c.lineTo(4, -12.5); c.fill();
    c.restore();
  };

  A.blob = function (c, x, y, o) {
    c.save(); c.translate(x, y);
    const t = o.t || 0, wob = Math.sin(t * 7) * 0.06;
    c.scale((o.face || 1) * (1 + wob) * (o.sx || 1), (1 - wob) * (o.sy || 1));
    if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
    if (A.img(c, 'blob', 0, 3, 46, true)) { c.restore(); return; }
    c.beginPath();
    c.moveTo(-24, 0);
    c.bezierCurveTo(-26, -26, -14, -40, 0, -40);
    c.bezierCurveTo(14, -40, 26, -26, 24, 0);
    for (let i = 0; i < 4; i++) { const x0 = 24 - i * 12; c.quadraticCurveTo(x0 - 6, 5 + Math.sin(t * 8 + i) * 2, x0 - 12, 0); }
    c.closePath();
    A.fs(c, A.lg(c, 0, -40, 0, 0, ['#c37af0', '#8e3cc8', '#6a2496']), 2.8);
    A.ellipse(c, -9, -30, 6, 3.5, -0.5); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
    const lk = PM.clamp(o.look || 0, -1, 1) * 2;
    [[-9, -25, 6.5], [8, -27, 7.5]].forEach(e => { A.circle(c, e[0], e[1], e[2]); A.fs(c, '#fff', 2.2); A.circle(c, e[0] - lk - 1, e[1] + 1, e[2] * 0.45); c.fillStyle = '#1a0a10'; c.fill(); });
    const m = 0.6 + Math.sin(t * 5) * 0.4;
    A.ellipse(c, 0, -10, 13, 4 + m * 4); A.fs(c, '#4a0a20', 2.2);
    c.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) { const tx = -9 + i * 6; c.beginPath(); c.moveTo(tx - 2.5, -10 - (4 + m * 4) * 0.7); c.lineTo(tx, -10 - (4 + m * 4) * 0.2); c.lineTo(tx + 2.5, -10 - (4 + m * 4) * 0.7); c.fill(); }
    A.ellipse(c, 2, -7 + m * 2, 5, 2.2); c.fillStyle = '#ff7aa0'; c.fill();
    const d = (t * 0.8) % 1;
    A.circle(c, 16, -6 + d * 10, 2.5 * (1 - d)); c.fillStyle = '#8e3cc8'; c.fill();
    c.restore();
  };

  A.drone = function (c, x, y, o) {
    const t = o.t || 0;
    c.save(); c.translate(x, y); c.rotate(o.tilt || 0);
    if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
    const fl = 6 + Math.sin(t * 40) * 3;
    c.beginPath(); c.moveTo(-6, 6); c.lineTo(0, 8 + fl); c.lineTo(6, 6); c.closePath();
    c.fillStyle = '#ffb03a'; c.fill();
    if (A.img(c, 'drone', 0, 14, 44, (o.face || 1) > 0)) { c.restore(); return; }
    c.beginPath(); c.arc(0, -2, 14, Math.PI, 0); A.fs(c, A.lg(c, 0, -16, 0, 0, ['#c8bcd8', '#8a7ca0']), 2.5);
    A.ellipse(c, 0, 1, 27, 9); A.fs(c, A.lg(c, 0, -8, 0, 10, ['#a596b8', '#5e5072']), 2.8);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI + 0.3;
      A.circle(c, Math.cos(a) * 20, 3 + Math.sin(a) * 3, 2.2);
      c.fillStyle = ((Math.floor(t * 6) + i) % 2) ? '#ffd23a' : '#ff5a3a'; c.fill();
    }
    A.circle(c, 0, -5, 7.5); A.fs(c, '#1a0a14', 2);
    A.glow(c, 0, -5, 14, 'rgba(255,40,40,0.8)', 0.7 + Math.sin(t * 8) * 0.3);
    A.circle(c, 0, -5, 4); c.fillStyle = '#ff3a3a'; c.fill();
    A.circle(c, -1.5, -6.5, 1.3); c.fillStyle = '#fff'; c.fill();
    c.restore();
  };

  A.robotChef = function (c, x, y, o) {
    const t = o.t || 0;
    c.save(); c.translate(x, y); c.scale((o.face || 1) * (o.sx || 1), o.sy || 1);
    if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
    if (o.angry) A.glow(c, 0, -60, 110, 'rgba(255,40,30,0.35)', 0.6 + Math.sin(t * 20) * 0.3);
    if (PM.img.robot_chef) {
      // generated sprite faces left; face=+1 means looking right
      A.img(c, 'robot_chef', 0, 4, 150, true);
    } else {
      const step = o.walk ? Math.sin(t * 10) : 0;
      // legs
      [[-18, step], [18, -step]].forEach(([lx, s]) => {
        A.rr(c, lx - 8, -40 - s * 3, 16, 34, 5); A.fs(c, '#6e6282', 3);
        A.rr(c, lx - 14, -10, 28, 10, 4); A.fs(c, '#4a3f5a', 3);
      });
      // back arm
      A.rr(c, -50, -96, 18, 44, 8); A.fs(c, '#7e7294', 3);
      // body
      A.rr(c, -40, -104, 80, 66, 16); A.fs(c, A.lg(c, -40, -104, 40, -38, ['#b4a8c8', '#8a7ea0', '#5e5274']), 3.2);
      A.rr(c, -26, -92, 52, 52, 10); A.fs(c, '#efe6e0', 2.5);
      A.pizza(c, 0, -68, 13, t * 0.5, 0);
      [[-34, -98], [34, -98], [-34, -44], [34, -44]].forEach(r => { A.circle(c, r[0], r[1], 2.5); A.fs(c, '#d8d0e0', 1.5); });
      // head
      A.rr(c, -30, -140, 60, 40, 12); A.fs(c, A.lg(c, 0, -140, 0, -100, ['#c4b8d8', '#8a7ea0']), 3.2);
      A.rr(c, -24, -131, 48, 15, 6); A.fs(c, '#1a0a14', 2.5);
      const eyeCol = o.stunned ? '#ffd23a' : '#ff3a2a';
      [[-11, 1], [11, -1]].forEach(([ex, s]) => {
        c.save(); c.translate(ex, -123); c.rotate(o.stunned ? 0 : s * 0.3);
        A.rr(c, -7, -3, 14, 6, 3); c.fillStyle = eyeCol; c.fill(); c.restore();
        A.glow(c, ex, -123, 16, o.stunned ? 'rgba(255,210,60,0.6)' : 'rgba(255,40,30,0.7)');
      });
      c.beginPath(); c.moveTo(-18, -110); c.quadraticCurveTo(-8, -100, 0, -108); c.quadraticCurveTo(8, -100, 18, -110);
      c.quadraticCurveTo(8, -104, 0, -111); c.quadraticCurveTo(-8, -104, -18, -110); A.fs(c, '#4a3f5a', 2.5);
      // chef hat
      const pf = [[-16, -160, 12], [0, -168, 14], [16, -160, 12]];
      c.fillStyle = OUT; pf.forEach(p => { A.circle(c, p[0], p[1], p[2] + 3); c.fill(); }); c.fillRect(-23, -158, 46, 20);
      c.fillStyle = '#fff'; pf.forEach(p => { A.circle(c, p[0], p[1], p[2]); c.fill(); }); c.fillRect(-20, -155, 40, 15);
      c.fillStyle = '#d8322a'; c.fillRect(-20, -146, 40, 4);
      // front arm with pizza cutter
      const sw = o.throwing ? -1.2 : Math.sin(t * 3) * 0.15;
      c.save(); c.translate(36, -92); c.rotate(sw);
      A.rr(c, -9, -6, 18, 46, 8); A.fs(c, '#9a8eb0', 3);
      c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 38); c.lineTo(18, 52); c.stroke();
      c.strokeStyle = '#d8a050'; c.lineWidth = 3; c.stroke();
      c.save(); c.translate(24, 58); c.rotate(t * 8);
      A.circle(c, 0, 0, 13); A.fs(c, '#d8dde8', 2.5);
      for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(-10, 0); c.lineTo(10, 0); c.strokeStyle = '#8a8fa0'; c.lineWidth = 1.5; c.stroke(); }
      c.restore();
      c.restore();
    }
    if (o.stunned) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + i * TAU / 3;
        A.star(c, Math.cos(a) * 34, -178 + Math.sin(a) * 8, 7, true, '#ffd23a');
      }
    }
    c.restore();
  };

  /* ---------- items ---------- */
  A.slice = function (c, x, y, s = 1, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    if (A.img(c, 'pizza_slice', 0, 0, 34, false, 0.5)) { c.restore(); return; }
    c.beginPath(); c.moveTo(0, 15); c.lineTo(-13, -9); c.lineTo(13, -9); c.closePath();
    A.fs(c, '#f8cb4a', 2.5);
    [[-4, -3, 3.4], [4, 1, 3], [0, 8, 2.4]].forEach(p => { A.circle(c, p[0], p[1], p[2]); A.fs(c, '#d8382a', 1.5); });
    A.rr(c, -15, -15, 30, 8, 4); A.fs(c, '#d98a3a', 2.5);
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(-10, -13, 12, 2);
    c.restore();
  };
  A.pizza = function (c, x, y, r, rot = 0, lw = 2.5) {
    c.save(); c.translate(x, y); c.rotate(rot);
    if (PM.img.pizza_whole && r > 10) { c.drawImage(PM.img.pizza_whole, -r * 1.15, -r * 1.15, r * 2.3, r * 2.3); c.restore(); return; }
    A.circle(c, 0, 0, r); A.fs(c, '#d98a3a', lw);
    A.circle(c, 0, 0, r * 0.8); c.fillStyle = '#f8cb4a'; c.fill();
    c.strokeStyle = 'rgba(160,80,20,0.5)'; c.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { c.beginPath(); const a = i * Math.PI / 3; c.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); c.lineTo(-Math.cos(a) * r * 0.8, -Math.sin(a) * r * 0.8); c.stroke(); }
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.5; A.circle(c, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.13); c.fillStyle = '#d8382a'; c.fill(); }
    c.restore();
  };
  A.coin = function (c, x, y, r, t) {
    const sx = Math.cos(t * 4);
    c.save(); c.translate(x, y);
    if (PM.img.coin) { c.scale(Math.max(0.15, Math.abs(sx)), 1); c.drawImage(PM.img.coin, -r * 1.1, -r * 1.1, r * 2.2, r * 2.2); c.restore(); return; }
    c.scale(Math.max(0.12, Math.abs(sx)), 1);
    A.circle(c, 0, 0, r); A.fs(c, A.lg(c, -r, -r, r, r, ['#fff0a0', '#f5c22b', '#d08a10']), 2.5);
    A.circle(c, 0, 0, r * 0.62); c.strokeStyle = '#c88010'; c.lineWidth = 2; c.stroke();
    A.rr(c, -2, -r * 0.4, 4, r * 0.8, 2); c.fillStyle = sx > 0 ? '#fff6c0' : '#c88010'; c.fill();
    c.restore();
  };
  A.powerup = function (c, x, y, t) {
    c.save(); c.translate(x, y);
    A.glow(c, 0, 0, 32, 'rgba(80,170,255,0.6)', 0.6 + Math.sin(t * 5) * 0.3);
    if (A.img(c, 'powerup', 0, 0, 38, false, 0.5)) { c.restore(); return; }
    A.rr(c, -11, -10, 22, 24, 6); A.fs(c, A.lg(c, -11, 0, 11, 0, ['#5aa8ff', '#2a5ad0', '#1a3a90']), 2.5);
    A.rr(c, -9, -16, 18, 7, 2); A.fs(c, '#8a8098', 2.5);
    c.beginPath(); c.moveTo(2, -6); c.lineTo(-5, 3); c.lineTo(0, 3); c.lineTo(-2, 11); c.lineTo(6, 0); c.lineTo(1, 0); c.lineTo(4, -6); c.closePath();
    A.fs(c, '#ffd23a', 1.5);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-8, -7, 3, 14);
    c.restore();
  };
  A.star = function (c, x, y, r, filled = true, col = '#ffcf2e', lw = 2.5) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
    A.fs(c, filled ? col : 'rgba(40,14,26,0.85)', lw, filled ? OUT : '#7a4a5a');
  };
  A.heart = function (c, x, y, s, full = true, t = 0) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(0, 7);
    c.bezierCurveTo(-14, -3, -9, -15, 0, -8);
    c.bezierCurveTo(9, -15, 14, -3, 0, 7); c.closePath();
    A.fs(c, full ? A.lg(c, 0, -12, 0, 8, ['#ff6a5a', '#d8222a']) : '#5a3a30', 2.2 / s * 1.3);
    if (full) { A.ellipse(c, -4.5, -6.5, 2.8, 1.8, -0.6); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill(); }
    c.restore();
  };
  A.lock = function (c, x, y, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.arc(0, -6, 7, Math.PI, 0); c.lineWidth = 7; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = '#d8d0e0'; c.stroke();
    A.rr(c, -10, -6, 20, 16, 3); A.fs(c, '#e8e0f0', 2.5);
    A.circle(c, 0, 0, 2.5); c.fillStyle = OUT; c.fill(); c.fillRect(-1, 0, 2, 5);
    c.restore();
  };
  A.gear = function (c, x, y, r) {
    c.save(); c.translate(x, y);
    c.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16, rr = i % 2 ? r * 0.72 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); A.fs(c, '#f2e6dc', 2.5);
    A.circle(c, 0, 0, r * 0.35); A.fs(c, '#3a1424', 2.5);
    c.restore();
  };

  /* ---------- level props ---------- */
  A.crate = function (c, x, y, s, hit = 0) {
    c.save(); c.translate(x + s / 2, y + s / 2 - hit);
    if (PM.img.crate) { c.drawImage(PM.img.crate, -s / 2, -s / 2, s, s); c.restore(); return; }
    const h = s / 2 - 1;
    A.rr(c, -h, -h, h * 2, h * 2, 3); A.fs(c, '#cf7c32', 3);
    c.strokeStyle = '#8a4a1c'; c.lineWidth = 4;
    c.strokeRect(-h + 5, -h + 5, h * 2 - 10, h * 2 - 10);
    c.beginPath(); c.moveTo(-h + 6, -h + 6); c.lineTo(h - 6, h - 6); c.moveTo(h - 6, -h + 6); c.lineTo(-h + 6, h - 6); c.stroke();
    c.strokeStyle = 'rgba(255,220,160,0.4)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-h + 4, -h + 3); c.lineTo(h - 4, -h + 3); c.stroke();
    [[-h + 4, -h + 4], [h - 4, -h + 4], [-h + 4, h - 4], [h - 4, h - 4]].forEach(p => { A.circle(c, p[0], p[1], 1.6); c.fillStyle = '#5a2a10'; c.fill(); });
    c.restore();
  };
  A.qbox = function (c, x, y, s, used, t, hit = 0) {
    c.save(); c.translate(x + s / 2, y + s / 2 - hit);
    const h = s / 2 - 1;
    if (!used && PM.img.box) { c.drawImage(PM.img.box, -h, -h, h * 2, h * 2); }
    else {
      A.rr(c, -h, -h, h * 2, h * 2, 4); A.fs(c, used ? '#8a7466' : A.lg(c, 0, -h, 0, h, ['#fff6e4', '#eadac0']), 3);
      if (!used) {
        c.strokeStyle = 'rgba(160,120,80,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-h + 3, -h + 7); c.lineTo(h - 3, -h + 7); c.stroke();
        A.circle(c, 0, 3, 12); A.fs(c, '#d8322a', 2);
      }
    }
    if (!used) {
      const b = Math.sin(t * 4) * 1.5;
      A.text(c, '?', 0, 4 + b, { size: 24, title: true, color: '#fff6dc', stroke: OUT, lw: 5 });
    } else {
      [[-h + 5, -h + 5], [h - 5, -h + 5], [-h + 5, h - 5], [h - 5, h - 5]].forEach(p => { A.circle(c, p[0], p[1], 2); c.fillStyle = '#4a3a30'; c.fill(); });
    }
    c.restore();
  };
  A.spikes = function (c, x, y, s, down) {
    c.save(); c.translate(x, y + (down ? 0 : s)); if (down) c.scale(1, -1);
    if (PM.img.spikes) { c.drawImage(PM.img.spikes, 0, -s * 0.75, s, s * 0.75); c.restore(); return; }
    A.rr(c, 1, -8, s - 2, 8, 2); A.fs(c, '#5a4e66', 2.5);
    for (let i = 0; i < 3; i++) {
      const bx = 2 + i * (s - 4) / 3, w = (s - 4) / 3;
      c.beginPath(); c.moveTo(bx, -7); c.lineTo(bx + w / 2, -s * 0.62); c.lineTo(bx + w, -7); c.closePath(); A.fs(c, '#c8c2d4', 2.3);
      c.beginPath(); c.moveTo(bx + w / 2, -s * 0.62); c.lineTo(bx + w, -7); c.lineTo(bx + w / 2 + 1, -7); c.closePath(); c.fillStyle = 'rgba(60,40,80,0.35)'; c.fill();
    }
    c.restore();
  };
  A.bounce = function (c, x, y, s, comp) {
    c.save(); c.translate(x + s / 2, y + s);
    const k = 1 - comp * 0.5;
    if (PM.img.bounce_pad) { c.scale(1, k); A.img(c, 'bounce_pad', 0, 0, s * 0.62); c.restore(); return; }
    c.beginPath(); c.moveTo(-20, 0); c.lineTo(-15, -9); c.lineTo(15, -9); c.lineTo(20, 0); c.closePath(); A.fs(c, '#5e5272', 2.5);
    c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath();
    const top = -9 - 14 * k;
    for (let i = 0; i <= 4; i++) c.lineTo(i % 2 ? 7 : -7, -9 + (top + 9) * i / 4);
    c.stroke(); c.strokeStyle = '#c8c0d8'; c.lineWidth = 1.5; c.stroke();
    A.ellipse(c, 0, top, 21, 7); A.fs(c, A.lg(c, 0, top - 7, 0, top + 7, ['#fff08a', '#f5b81a']), 2.8);
    A.ellipse(c, -6, top - 2, 7, 2); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill();
    c.restore();
  };
  A.ladder = function (c, x, y, s) {
    c.save();
    [x + 9, x + s - 9].forEach(rx => { c.fillStyle = OUT; c.fillRect(rx - 4, y, 8, s); c.fillStyle = '#a8662e'; c.fillRect(rx - 2, y, 4, s); });
    for (let i = 0; i < 2; i++) { const ry = y + 10 + i * 24; c.fillStyle = OUT; c.fillRect(x + 8, ry - 3, s - 16, 7); c.fillStyle = '#c98040'; c.fillRect(x + 9, ry - 1, s - 18, 3); }
    c.restore();
  };
  A.checkpoint = function (c, x, y, active, t) {
    c.save(); c.translate(x, y);
    A.rr(c, -12, -8, 24, 8, 3); A.fs(c, '#5e5272', 2.5);
    A.rr(c, -3, -70, 6, 64, 2); A.fs(c, '#9a8eb0', 2.5);
    if (active) {
      const w = Math.sin(t * 8);
      c.beginPath(); c.moveTo(3, -68); c.quadraticCurveTo(18, -72 + w * 3, 32, -64 + w * 2); c.quadraticCurveTo(18, -58 + w * 3, 3, -50); c.closePath();
      A.fs(c, '#ef7a2c', 2.5);
      A.slice(c, 15, -60, 0.35, -1.6);
    }
    const col = active ? '#5aff6a' : '#ff4a3a';
    A.glow(c, 0, -74, active ? 30 + Math.sin(t * 6) * 6 : 16, active ? 'rgba(90,255,110,0.6)' : 'rgba(255,70,50,0.4)');
    A.circle(c, 0, -74, 6); A.fs(c, col, 2.5);
    c.restore();
  };
  A.laserEmitter = function (c, x, y, s, warn, on) {
    c.save(); c.translate(x + s / 2, y);
    A.rr(c, -16, 0, 32, 18, 4); A.fs(c, '#5e5272', 2.5);
    A.rr(c, -9, 14, 18, 8, 3); A.fs(c, '#3a3048', 2.5);
    A.circle(c, 0, 21, 4); c.fillStyle = on ? '#ff3a3a' : warn ? '#ff9a3a' : '#6a2a2a'; c.fill();
    c.restore();
  };
  A.laserBeam = function (c, x, y1, y2, t, warn) {
    c.save();
    if (warn) {
      c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 50);
      c.fillStyle = '#ff6a4a'; c.fillRect(x - 1.5, y1, 3, y2 - y1);
    } else {
      const w = 9 + Math.sin(t * 60) * 2;
      c.fillStyle = 'rgba(255,40,40,0.25)'; c.fillRect(x - w * 1.6, y1, w * 3.2, y2 - y1);
      c.fillStyle = '#ff2a3a'; c.fillRect(x - w / 2, y1, w, y2 - y1);
      c.fillStyle = '#ffe0e0'; c.fillRect(x - 1.5, y1, 3, y2 - y1);
      A.glow(c, x, y2, 22, 'rgba(255,80,40,0.8)');
    }
    c.restore();
  };
  A.movPlat = function (c, x, y, w, h) {
    c.save();
    A.rr(c, x, y, w, h, 6); A.fs(c, A.lg(c, 0, y, 0, y + h, ['#a89cbc', '#6e6280', '#4a3f5a']), 3);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 6, y + 3, w - 12, 2);
    for (let i = 0; i < w / 24; i++) { A.circle(c, x + 12 + i * 24, y + h / 2, 2.2); A.fs(c, '#d0c8dc', 1.4); }
    for (let i = 0; i < 3; i++) { A.circle(c, x + w * (i + 1) / 4, y + h + 2, 2.5); c.fillStyle = '#ff5a3a'; c.fill(); }
    c.restore();
  };
  A.bolt = function (c, x, y, t) {
    A.glow(c, x, y, 16, 'rgba(255,60,60,0.8)');
    A.ellipse(c, x, y, 4, 9); c.fillStyle = '#ffd0d0'; c.fill();
  };

  /* ---------- buildings ---------- */
  A.pizzeria = function (c, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (PM.img.pizzeria) {
      A.glow(c, 0, -120, 200, 'rgba(255,80,200,0.25)', 0.8 + Math.sin(t * 3) * 0.2);
      A.img(c, 'pizzeria', 0, 6, 300);
      c.restore(); return;
    }
    // dish
    c.save(); c.translate(-118, -168); c.rotate(-0.5);
    A.ellipse(c, 0, 0, 26, 12); A.fs(c, '#8a6aa8', 3); A.circle(c, 0, 0, 3); c.fillStyle = OUT; c.fill(); c.restore();
    A.rr(c, -124, -160, 8, 30, 2); A.fs(c, '#6a5a80', 2.5);
    // main body
    A.rr(c, -140, -150, 280, 150, 10); A.fs(c, A.lg(c, 0, -150, 0, 0, ['#5a2a6a', '#3e1a4e', '#2a1036']), 3.5);
    // upper floor
    A.rr(c, -100, -215, 200, 72, 8); A.fs(c, A.lg(c, 0, -215, 0, -143, ['#6a3478', '#45205a']), 3.5);
    // brick lines
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.5;
    for (let r = 0; r < 7; r++) { c.beginPath(); c.moveTo(-136, -138 + r * 20); c.lineTo(136, -138 + r * 20); c.stroke(); }
    // windows
    const win = (wx, wy, ww, wh) => {
      A.rr(c, wx, wy, ww, wh, 4); A.fs(c, A.lg(c, 0, wy, 0, wy + wh, ['#ffe9a0', '#ffb040']), 3);
      c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke();
      A.glow(c, wx + ww / 2, wy + wh / 2, ww, 'rgba(255,190,80,0.35)');
    };
    win(-120, -110, 44, 40); win(76, -110, 44, 40); win(-80, -200, 34, 32); win(46, -200, 34, 32);
    // door
    c.beginPath(); c.moveTo(-30, 0); c.lineTo(-30, -70); c.arc(0, -70, 30, Math.PI, 0); c.lineTo(30, 0); c.closePath();
    A.fs(c, A.lg(c, 0, -100, 0, 0, ['#fff0b0', '#ffa040', '#e06a20']), 3.5);
    A.glow(c, 0, -40, 80, 'rgba(255,170,60,0.5)', 0.8 + Math.sin(t * 2) * 0.15);
    c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -100); c.lineTo(0, 0); c.stroke();
    // steps
    A.rr(c, -44, -6, 88, 8, 2); A.fs(c, '#6a5478', 2.5);
    // neon sign
    const fl = Math.sin(t * 17) > -0.9 ? 1 : 0.35;
    A.rr(c, -78, -178, 156, 44, 8); A.fs(c, '#2a0c24', 3);
    c.save(); c.globalAlpha = fl;
    A.glow(c, 0, -156, 120, 'rgba(255,70,200,0.55)');
    c.strokeStyle = '#ff5ad0'; c.lineWidth = 3; A.rr(c, -72, -172, 144, 32, 6); c.stroke();
    A.text(c, 'PIZZA', 0, -154, { size: 30, title: true, color: '#ffe0f8', shadow: '#ff40c0', blur: 18 });
    c.restore();
    // giant slice on roof
    c.save(); c.translate(30, -250); c.rotate(-0.35 + Math.sin(t * 1.5) * 0.04); c.scale(2.6, 2.6); A.slice(c, 0, 0, 1, Math.PI); c.restore();
    // string lights
    for (let i = 0; i < 12; i++) {
      const lx = -136 + i * 24.7, ly = -150 + Math.sin(i / 11 * Math.PI) * 10;
      A.circle(c, lx, ly, 3); c.fillStyle = ['#ffd23a', '#ff5ad0', '#5ad0ff'][(i + Math.floor(t * 3)) % 3]; c.fill();
    }
    c.restore();
  };
  A.castle = function (c, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const tower = (tx, w, h) => {
      A.rr(c, tx - w / 2, -h, w, h, 4); A.fs(c, A.lg(c, 0, -h, 0, 0, ['#4a2a44', '#2a1426']), 3);
      c.beginPath(); c.moveTo(tx - w / 2 - 6, -h + 2); c.lineTo(tx, -h - w * 0.9); c.lineTo(tx + w / 2 + 6, -h + 2); c.closePath(); A.fs(c, '#3a1a30', 3);
      for (let k = 0; k < 2; k++) { const wy = -h + 30 + k * 40; if (wy > -20) continue; A.rr(c, tx - 6, wy, 12, 18, 6); A.fs(c, '#ff4a2a', 2); A.glow(c, tx, wy + 9, 20, 'rgba(255,60,30,0.6)', 0.7 + Math.sin(t * 3 + tx) * 0.3); }
    };
    tower(-110, 50, 150); tower(110, 50, 150); tower(-50, 44, 190); tower(50, 44, 190);
    A.rr(c, -90, -120, 180, 120, 6); A.fs(c, A.lg(c, 0, -120, 0, 0, ['#5a3050', '#2e1428']), 3.5);
    for (let i = 0; i < 7; i++) { A.rr(c, -88 + i * 26, -134, 16, 16, 2); A.fs(c, '#4a2442', 3); }
    c.beginPath(); c.moveTo(-28, 0); c.lineTo(-28, -50); c.arc(0, -50, 28, Math.PI, 0); c.lineTo(28, 0); c.closePath(); A.fs(c, '#1a0810', 3);
    A.glow(c, 0, -30, 50, 'rgba(255,50,30,0.4)');
    c.save(); c.translate(0, -100); c.scale(1.6, 1.6); A.slice(c, 0, 0, 1, Math.PI); c.restore();
    c.restore();
  };
  A.trophy = function (c, x, y, t) {
    c.save(); c.translate(x, y);
    A.glow(c, 0, -70, 110, 'rgba(255,210,80,0.5)', 0.8 + Math.sin(t * 4) * 0.2);
    for (let i = 0; i < 8; i++) { c.save(); c.rotate(t * 0.5 + i * Math.PI / 4); c.fillStyle = 'rgba(255,230,140,0.18)'; c.beginPath(); c.moveTo(0, -70); c.lineTo(-12, -190); c.lineTo(12, -190); c.closePath(); c.translate(0, 0); c.restore(); }
    A.rr(c, -34, -26, 68, 26, 5); A.fs(c, '#7a5a90', 3);
    A.rr(c, -24, -40, 48, 16, 4); A.fs(c, '#9a7ab0', 3);
    const b = Math.sin(t * 3) * 5;
    A.pizza(c, 0, -80 + b, 34, t * 0.8);
    A.circle(c, 0, -80 + b, 36); c.strokeStyle = 'rgba(255,230,100,0.9)'; c.lineWidth = 3; c.stroke();
    c.restore();
  };

  /* ---------- logo ---------- */
  A.logo = function (c, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s); c.rotate(-0.06);
    const l1 = PM.t('title1'), l2 = PM.t('title2');
    // orbit ring (back)
    c.save(); c.rotate(-0.1);
    c.shadowColor = '#ff7a2a'; c.shadowBlur = 18;
    c.strokeStyle = '#ff8a3a'; c.lineWidth = 5;
    c.beginPath(); c.ellipse(10, 18, 250, 92, 0, Math.PI * 1.02, Math.PI * 1.98, false); c.stroke();
    c.restore();
    const draw = (str, ty, size, xo) => {
      c.font = `${size}px ${PM.FONT_TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineJoin = 'round';
      c.lineWidth = 16; c.strokeStyle = OUT; c.strokeText(str, xo, ty + 4);
      c.lineWidth = 12; c.strokeStyle = '#7a1e12'; c.strokeText(str, xo, ty);
      c.shadowColor = 'rgba(255,140,40,0.9)'; c.shadowBlur = 24 + Math.sin(t * 3) * 8;
      c.fillStyle = A.lg(c, 0, ty - size / 2, 0, ty + size / 2, ['#fff0a0', '#ffb43a', '#f06a1e']);
      c.fillText(str, xo, ty);
      c.shadowBlur = 0;
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.save(); c.beginPath(); c.rect(-400, ty - size / 2, 800, size * 0.28); c.clip(); c.fillText(str, xo, ty); c.restore();
    };
    draw(l1, -26, 84, -10);
    draw(l2, 52, 84, 30);
    // orbit ring (front)
    c.save(); c.rotate(-0.1);
    c.shadowColor = '#ff7a2a'; c.shadowBlur = 18;
    c.strokeStyle = '#ffa04a'; c.lineWidth = 5;
    c.beginPath(); c.ellipse(10, 18, 250, 92, 0, Math.PI * 0.05, Math.PI * 0.95, false); c.stroke();
    c.restore();
    // slice rocket
    c.save(); c.translate(210, -40 + Math.sin(t * 2) * 5); c.rotate(-0.6); c.scale(2.2, 2.2);
    A.glow(c, 0, 18, 18, 'rgba(255,150,40,0.8)');
    A.slice(c, 0, 0, 1, Math.PI * 0.95);
    c.restore();
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + i;
      const sx = -230 + ((i * 97) % 460), sy = -80 + ((i * 53) % 170);
      const r = 3 + Math.sin(a * 3) * 2;
      if (r > 1.5) { c.fillStyle = '#ffe9b0'; c.beginPath(); c.moveTo(sx, sy - r * 2); c.lineTo(sx + r * 0.5, sy); c.lineTo(sx, sy + r * 2); c.lineTo(sx - r * 0.5, sy); c.closePath(); c.fill(); c.beginPath(); c.moveTo(sx - r * 2, sy); c.lineTo(sx, sy - r * 0.5); c.lineTo(sx + r * 2, sy); c.lineTo(sx, sy + r * 0.5); c.closePath(); c.fill(); }
    }
    c.restore();
  };

  /* ---------- UI widgets ---------- */
  A.button = function (c, b, hover, t) {
    const sc = hover ? 1.05 : 1;
    c.save(); c.translate(b.x + b.w / 2, b.y + b.h / 2); c.scale(sc, sc);
    const x = -b.w / 2, y = -b.h / 2;
    if (hover) { c.shadowColor = 'rgba(255,140,50,0.8)'; c.shadowBlur = 22; }
    A.rr(c, x, y + 4, b.w, b.h, 16); c.fillStyle = OUT; c.fill();
    c.shadowBlur = 0;
    const prim = b.primary;
    A.rr(c, x, y, b.w, b.h, 16);
    A.fs(c, prim ? A.lg(c, 0, y, 0, y + b.h, ['#ff9a3a', '#e0581e', '#b8361a']) : A.lg(c, 0, y, 0, y + b.h, ['#5a1e36', '#3a1024', '#2a0a1a']), 3, hover ? '#ffb060' : (prim ? '#ffd08a' : '#9a3e44'));
    A.rr(c, x + 6, y + 4, b.w - 12, b.h * 0.36, 10); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fill();
    if (b.icon) b.icon(c, x + 30, 0);
    A.text(c, b.label, b.icon ? 14 : 0, 2, { size: b.size || 30, color: '#fff3dc', stroke: prim ? '#7a2010' : null, lw: 5, maxW: b.w - (b.icon ? 70 : 30) });
    c.restore();
  };
  A.panel = function (c, x, y, w, h, title) {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30;
    A.rr(c, x, y, w, h, 20); c.fillStyle = 'rgba(36,10,22,0.94)'; c.fill();
    c.shadowBlur = 0;
    A.rr(c, x, y, w, h, 20); c.lineWidth = 3; c.strokeStyle = '#8a3a44'; c.stroke();
    A.rr(c, x + 6, y + 6, w - 12, h - 12, 15); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,150,90,0.25)'; c.stroke();
    if (title) {
      c.font = PM.font(30, 800);
      const tw = c.measureText(title).width + 48;
      A.rr(c, x + 24, y - 24, tw, 48, 14); A.fs(c, '#3a1024', 3, '#b8564a');
      A.text(c, title, x + 24 + tw / 2, y + 2, { size: 30, color: '#ffe3c0' });
    }
    c.restore();
  };
  A.flag = function (c, lang, x, y, w, h) {
    c.save(); A.rr(c, x, y, w, h, 5); c.clip();
    if (lang === 'cs') {
      c.fillStyle = '#ffffff'; c.fillRect(x, y, w, h / 2);
      c.fillStyle = '#d7141a'; c.fillRect(x, y + h / 2, w, h / 2);
      c.fillStyle = '#11457e'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * 0.5, y + h / 2); c.lineTo(x, y + h); c.closePath(); c.fill();
    } else {
      c.fillStyle = '#012169'; c.fillRect(x, y, w, h);
      c.strokeStyle = '#fff'; c.lineWidth = h * 0.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + h); c.moveTo(x + w, y); c.lineTo(x, y + h); c.stroke();
      c.strokeStyle = '#c8102e'; c.lineWidth = h * 0.08; c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = h * 0.32; c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); c.stroke();
      c.strokeStyle = '#c8102e'; c.lineWidth = h * 0.18; c.stroke();
    }
    c.restore();
    A.rr(c, x, y, w, h, 5); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
  };

  /* ---------- backgrounds ---------- */
  A.makeStars = function (n, seed) {
    const r = PM.seeded(seed), s = [];
    for (let i = 0; i < n; i++) s.push({ x: r() * PM.W, y: r() * PM.H * 0.6, r: 0.6 + r() * 1.6, p: r() * TAU, sp: 1 + r() * 3 });
    return s;
  };
  A.drawStars = function (c, stars, t, ox = 0) {
    for (const s of stars) {
      const a = 0.4 + 0.6 * Math.abs(Math.sin(t * s.sp * 0.5 + s.p));
      c.globalAlpha = a; c.fillStyle = '#fff4e0';
      let x = (s.x - ox) % PM.W; if (x < 0) x += PM.W;
      c.fillRect(x, s.y, s.r, s.r);
      if (s.r > 1.9 && a > 0.85) { c.fillRect(x - 3, s.y + s.r / 2 - 0.5, 6 + s.r, 1); c.fillRect(x + s.r / 2 - 0.5, s.y - 3, 1, 6 + s.r); }
    }
    c.globalAlpha = 1;
  };
  A.planet = function (c, x, y, r, cols, t) {
    A.glow(c, x, y, r * 1.6, cols[0] + '55');
    A.circle(c, x, y, r); c.fillStyle = A.rg(c, x - r * 0.35, y - r * 0.35, r * 0.1, r * 1.1, cols); c.fill();
    const rr = PM.seeded(7);
    c.save(); A.circle(c, x, y, r); c.clip();
    for (let i = 0; i < 9; i++) {
      const a = rr() * TAU, d = rr() * r * 0.8, cr = r * (0.06 + rr() * 0.14);
      A.circle(c, x + Math.cos(a) * d, y + Math.sin(a) * d, cr); c.fillStyle = 'rgba(0,0,0,0.16)'; c.fill();
      A.circle(c, x + Math.cos(a) * d - cr * 0.2, y + Math.sin(a) * d - cr * 0.2, cr * 0.8); c.fillStyle = 'rgba(255,255,255,0.06)'; c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,0.25)'; A.circle(c, x + r * 0.45, y + r * 0.4, r * 1.05); c.fill();
    c.restore();
  };
  // tileable mesa silhouette strip
  function mesaLayer(W, H, seed, baseY, varY, col, detail) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), r = PM.seeded(seed);
    const mesas = [];
    let x = 0;
    while (x < W) { const w = 120 + r() * 260; mesas.push({ x, w, top: baseY - r() * varY, taper: 10 + r() * 30 }); x += w * (0.6 + r() * 0.5); }
    const drawM = (m, off) => {
      const x0 = m.x + off;
      c.beginPath(); c.moveTo(x0, H);
      c.lineTo(x0 + m.taper * 0.4, m.top + 40); c.lineTo(x0 + m.taper, m.top + 6);
      const steps = 6;
      for (let i = 0; i <= steps; i++) c.lineTo(x0 + m.taper + (m.w - m.taper * 2) * i / steps, m.top + (i % 2 ? 3 : 0) + (i === 3 ? -4 : 0));
      c.lineTo(x0 + m.w - m.taper * 0.4, m.top + 40); c.lineTo(x0 + m.w, H); c.closePath();
      c.fillStyle = col; c.fill();
      if (detail) {
        c.save(); c.clip();
        c.fillStyle = 'rgba(255,170,110,0.13)'; c.fillRect(x0, m.top, m.w * 0.3, H);
        c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 2;
        for (let k = 1; k < 6; k++) { c.beginPath(); c.moveTo(x0, m.top + k * 26); c.lineTo(x0 + m.w, m.top + k * 26 + 4); c.stroke(); }
        c.fillStyle = 'rgba(255,200,150,0.3)'; c.fillRect(x0 + m.taper, m.top, m.w - m.taper * 2, 3);
        c.restore();
      }
    };
    for (const m of mesas) { drawM(m, 0); drawM(m, -W); drawM(m, W); }
    return cv;
  }
  A.makeBackdrop = function (theme, seed = 1) {
    const th = A.THEMES[theme];
    const W = 2048;
    return {
      theme, th, W,
      far: mesaLayer(W, PM.H, seed * 11 + 3, 470, 130, th.far, false),
      mid: mesaLayer(W, PM.H, seed * 17 + 5, 560, 110, th.mid, true),
      stars: A.makeStars(140, seed * 31),
      rocks: Array.from({ length: 7 }, (_, i) => { const r = PM.seeded(seed * 100 + i); return { x: r() * W, y: 60 + r() * 300, s: 10 + r() * 26, sp: r() * 2, rot: r() * 6 }; })
    };
  };
  function tileLayer(c, cv, off, alphaMirror) {
    const W = cv.width;
    let x = -(off % W); if (x > 0) x -= W;
    for (; x < PM.W; x += W) c.drawImage(cv, x, 0);
  }
  function tileImage(c, im, off) {
    const h = PM.H, w = im.width * h / im.height;
    let x = -(off % (w * 2)); if (x > 0) x -= w * 2;
    for (let i = 0; x < PM.W; i++, x += w) {
      const idx = Math.floor((x + off) / w + 0.5);
      if (idx % 2) { c.save(); c.translate(x + w, 0); c.scale(-1, 1); c.drawImage(im, 0, 0, w, h); c.restore(); }
      else c.drawImage(im, x, 0, w, h);
    }
  }
  A.drawBackdrop = function (c, bd, camX, t, maxCam = 0) {
    const th = bd.th;
    const skyImg = PM.img['sky_' + bd.theme];
    if (skyImg) {
      const range = maxCam * 0.08;
      const s = Math.max(PM.H / skyImg.height, (PM.W + range) / skyImg.width);
      const w = skyImg.width * s, h = skyImg.height * s;
      c.drawImage(skyImg, -camX * 0.08, (PM.H - h) * 0.55, w, h);
    } else {
      c.fillStyle = A.lg(c, 0, 0, 0, PM.H, th.sky); c.fillRect(0, 0, PM.W, PM.H);
      A.drawStars(c, bd.stars, t, camX * 0.02);
      A.planet(c, 980 - camX * 0.03 % 400, 170, 110, th.planet, t);
      c.globalAlpha = 0.9; tileLayer(c, bd.far, camX * 0.15); c.globalAlpha = 1;
    }
    for (const r of bd.rocks) {
      let x = (r.x - camX * 0.22 + t * 6) % bd.W; if (x < 0) x += bd.W;
      if (x > PM.W + 40) continue;
      const y = r.y + Math.sin(t * 0.6 + r.sp * 3) * 6;
      c.save(); c.translate(x, y); c.rotate(r.rot + t * 0.1 * (r.sp - 1));
      c.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, rr = r.s * (0.7 + ((i * 37) % 5) / 12); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8); }
      c.closePath(); A.fs(c, th.far, 2, 'rgba(20,5,10,0.6)');
      c.restore();
    }
    c.globalAlpha = skyImg ? 0.75 : 1;
    tileLayer(c, bd.mid, camX * 0.35);
    c.globalAlpha = 1;
    c.fillStyle = A.lg(c, 0, PM.H * 0.45, 0, PM.H, ['rgba(0,0,0,0)', th.haze]); c.fillRect(0, PM.H * 0.45, PM.W, PM.H * 0.55);
  };

  /* ---------- map plateau ---------- */
  A.plateau = function (c, x, y, w, h, seed, col = '#b0432c') {
    const r = PM.seeded(seed);
    c.save();
    c.beginPath();
    const pts = [];
    const n = 9;
    for (let i = 0; i <= n; i++) pts.push([x - w / 2 + w * i / n, y + (r() - 0.5) * 6]);
    c.moveTo(pts[0][0], pts[0][1]);
    pts.forEach(p => c.lineTo(p[0], p[1]));
    c.lineTo(x + w / 2 - 6, y + h * 0.4); c.lineTo(x + w / 2 - 24 - r() * 20, y + h * 0.75); c.lineTo(x + w * 0.15, y + h);
    c.lineTo(x - w * 0.12, y + h * 0.95); c.lineTo(x - w / 2 + 26 + r() * 16, y + h * 0.7); c.lineTo(x - w / 2 + 4, y + h * 0.35); c.closePath();
    A.fs(c, A.lg(c, 0, y, 0, y + h, [col, '#7a2a22', '#3a1018']), 3);
    c.clip();
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 2;
    for (let k = 1; k < 7; k++) { c.beginPath(); c.moveTo(x - w / 2, y + 14 + k * h / 8); c.lineTo(x + w / 2, y + 10 + k * h / 8 + (r() - 0.5) * 8); c.stroke(); }
    for (let k = 0; k < 5; k++) { const cx = x - w / 2 + r() * w; c.beginPath(); c.moveTo(cx, y + 10); c.lineTo(cx + (r() - 0.5) * 20, y + h * 0.5); c.stroke(); }
    c.fillStyle = 'rgba(255,170,100,0.15)'; c.fillRect(x - w / 2, y, w * 0.25, h);
    c.restore();
    // top surface
    c.beginPath(); c.ellipse(x, y + 2, w / 2 - 2, 13, 0, 0, TAU); A.fs(c, A.lg(c, 0, y - 12, 0, y + 14, ['#f39a5a', '#d8603a']), 2.5);
  };
})();
