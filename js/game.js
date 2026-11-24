'use strict';
/* Pizzeria on Mars — gameplay: level runtime, physics, entities, rendering, HUD */
(function () {
  const T = PM.TILE, A = PM.art, OUT = A.OUT;
  const SOLID = { '#': 1, '=': 1, 'p': 1, 'C': 1, '?': 1 };
  const G = 2100, JUMP = 820, RUN = 275, BOUNCE = 1250, MAXFALL = 950, STOMP = 520;
  const JUMP_BUFFER = 0.24, COYOTE_TIME = 0.16;
  const CH = 512; // chunk width (logical px)

  /* ====================== Level ====================== */
  class Level {
    constructor(idx) {
      this.idx = idx;
      this.def = PM.LEVELS[idx];
      this.theme = this.def.theme;
      this.th = A.THEMES[this.theme];
      const rows = this.def.build();
      this.h = rows.length; this.w = rows[0].length;
      this.pw = this.w * T; this.ph = this.h * T;
      this.tiles = rows.map(r => r.split(''));
      this.items = []; this.enemies = []; this.movers = []; this.lasers = []; this.checkpoints = []; this.gates = [];
      this.anim = {}; // per-tile bump/compress anims
      this.used = {};
      this.gateClosed = false; this.gateT = 0;
      this.boss = null;
      this.start = { x: 2 * T, y: 12 * T };
      for (let ty = 0; ty < this.h; ty++) for (let tx = 0; tx < this.w; tx++) {
        const ch = this.tiles[ty][tx];
        const cx = tx * T + T / 2, cy = ty * T + T / 2, by = (ty + 1) * T;
        let clear = true;
        switch (ch) {
          case 'S': this.start = { x: cx, y: by }; break;
          case 'E': this.goal = { x: cx, y: by }; break;
          case 'K': this.checkpoints.push({ x: cx, y: by, active: false }); break;
          case 'o': case 's': case 'W': case '!':
            this.items.push({ type: ch, x: cx, y: cy, by: cy, t: Math.random() * 6, alive: true }); break;
          case 'a': case 'b': case 'd': this.enemies.push(makeEnemy(ch, cx, by)); break;
          case 'R': this.boss = makeBoss(cx, by); break;
          case 'M': case 'V': this.movers.push({ x: tx * T, y: ty * T + 4, ox: tx * T, oy: ty * T + 4, w: 3 * T, h: 22, axis: ch === 'M' ? 'x' : 'y', range: 4 * T, t: (tx * 0.37) % 6, dx: 0, dy: 0, py: ty * T + 4 }); break;
          case 'L': this.lasers.push({ tx, ty, x: cx, y1: ty * T + 20, period: 3.4, phase: (tx * 0.53) % 3.4, on: false, warn: false }); break;
          case 'G': this.gates.push({ tx, ty }); clear = false; break;
          default: clear = false;
        }
        if (clear) this.tiles[ty][tx] = ' ';
      }
      this.totalSlices = this.items.filter(i => i.type === 's').length;
      if (this.gates.length) this.arenaX = (this.gates[0].tx + 1) * T;
    }
    tileAt(tx, ty) {
      if (tx < 0 || tx >= this.w) return '#';
      if (ty < 0 || ty >= this.h) return ' ';
      return this.tiles[ty][tx];
    }
    isSolid(tx, ty) { const c = this.tileAt(tx, ty); return SOLID[c] === 1 || (c === 'G' && this.gateClosed); }
    isRock(tx, ty) { if (ty >= this.h) return true; return this.tileAt(tx, ty) === '#'; }
  }

  /* ====================== Entities ====================== */
  function makeEnemy(type, x, y) {
    const e = { type, x, y, vx: 0, vy: 0, face: -1, alive: true, dying: 0, t: Math.random() * 5, sx: 1, sy: 1, onGround: false, timer: 0.6 + Math.random() };
    if (type === 'b') { e.w = 38; e.h = 32; }
    if (type === 'a') { e.w = 32; e.h = 40; }
    if (type === 'd') { e.w = 44; e.h = 26; e.ox = x; e.oy = y - T / 2; e.y = e.oy; e.cd = 1.5 + Math.random(); e.float = true; }
    return e;
  }
  function makeBoss(x, y) {
    return { type: 'R', x, y, w: 84, h: 148, vx: 0, vy: 0, face: -1, hp: 6, maxHp: 6, state: 'wait', st: 0, t: 0, inv: 0, step: 0, thrown: 0, alive: true, onGround: true, sx: 1, sy: 1 };
  }

  /* ====================== physics helpers ====================== */
  function moveX(lv, e, dx) {
    e.x += dx; e.hitWall = 0;
    if (dx === 0) return;
    const top = e.y - e.h + 2, bot = e.y - 2;
    const ty0 = Math.floor(top / T), ty1 = Math.floor(bot / T);
    if (dx > 0) {
      const tx = Math.floor((e.x + e.w / 2) / T);
      for (let ty = ty0; ty <= ty1; ty++) if (lv.isSolid(tx, ty)) { e.x = tx * T - e.w / 2 - 0.01; e.vx = 0; e.hitWall = 1; return; }
    } else {
      const tx = Math.floor((e.x - e.w / 2) / T);
      for (let ty = ty0; ty <= ty1; ty++) if (lv.isSolid(tx, ty)) { e.x = (tx + 1) * T + e.w / 2 + 0.01; e.vx = 0; e.hitWall = -1; return; }
    }
  }
  function moveY(lv, e, dy, oneway) {
    const prevBot = e.y;
    e.y += dy; e.onGround = false; e.bump = null;
    const l = e.x - e.w / 2 + 2, r = e.x + e.w / 2 - 2;
    const tx0 = Math.floor(l / T), tx1 = Math.floor(r / T);
    if (dy > 0) {
      const ty = Math.floor(e.y / T);
      for (let tx = tx0; tx <= tx1; tx++) {
        const ch = lv.tileAt(tx, ty);
        let land = lv.isSolid(tx, ty);
        if (!land && oneway && prevBot <= ty * T + 0.5) {
          if (ch === '-') land = true;
          else if (ch === 'H' && lv.tileAt(tx, ty - 1) !== 'H') land = true;
        }
        if (land) { e.y = ty * T; e.vy = 0; e.onGround = true; return; }
      }
    } else if (dy < 0) {
      const ty = Math.floor((e.y - e.h) / T);
      let hit = null;
      for (let tx = tx0; tx <= tx1; tx++) if (lv.isSolid(tx, ty)) { if (!hit || Math.abs((tx + 0.5) * T - e.x) < Math.abs((hit.tx + 0.5) * T - e.x)) hit = { tx, ty }; }
      if (hit) { e.y = (ty + 1) * T + e.h; e.vy = 0; e.bump = hit; }
    }
  }
  const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && a.y - a.h < b.y && b.y - b.h < a.y;

  /* ====================== Game ====================== */
  class Game {
    constructor(idx) {
      this.idx = idx;
      this.lv = new Level(idx);
      this.bd = A.makeBackdrop(this.lv.theme, idx + 1);
      this.hearts = 3; this.slices = 0; this.coins = 0; this.time = 0; this.hit = false;
      this.t = 0; this.acc = 0;
      this.state = 'play'; this.stateT = 0;
      this.respawn = { x: this.lv.start.x, y: this.lv.start.y };
      this.p = this.newPlayer(this.lv.start.x, this.lv.start.y);
      this.cam = { x: PM.clamp(this.p.x - PM.W / 2, 0, this.lv.pw - PM.W), y: 0 };
      this.particles = []; this.popups = []; this.proj = []; this.amb = [];
      this.shake = 0; this.banner = { text: (1) + '-' + (idx + 1), sub: PM.levelName(idx), t: 0, dur: 2.6 };
      this.chunks = new Map(); this.chunkScale = 0;
      this.bossDefeated = false; this.bossActive = false;
      this.result = null;
      this.touchBtns = [
        { id: 'left', x: 90, y: 640, r: 52 }, { id: 'right', x: 214, y: 640, r: 52 },
        { id: 'up', x: 152, y: 548, r: 36 }, { id: 'down', x: 1060, y: 650, r: 36 },
        { id: 'jump', x: 1180, y: 610, r: 64 }
      ];
      this.touchState = {};
    }
    newPlayer(x, y) {
      return { x, y, w: 28, h: 54, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0, inv: 0, speedT: 0, climbing: false, phase: 0, sx: 1, sy: 1, ride: null, drop: 0, prevBot: y, visible: true, state: 'idle', dustT: 0 };
    }

    /* ---------- update ---------- */
    update(dt) {
      this.handleTouch();
      this.acc += Math.min(dt, 0.1);
      const step = 1 / 60;
      while (this.acc >= step) { this.fixed(step); this.acc -= step; }
    }
    handleTouch() {
      const inp = PM.input;
      if (!inp.usingTouch) return;
      for (const b of this.touchBtns) { if (b.id === 'jump') b.x = PM.W - 100; if (b.id === 'down') b.x = PM.W - 220; }
      const now = {};
      for (const id in inp.pointers) {
        const pt = inp.pointers[id];
        for (const b of this.touchBtns) if (Math.hypot(pt.x - b.x, pt.y - b.y) < b.r * 1.25) now[b.id] = true;
      }
      for (const b of this.touchBtns) {
        if (now[b.id] && !this.touchState[b.id]) inp.virtPressed[b.id] = true;
        inp.virt[b.id] = !!now[b.id];
      }
      this.touchState = now;
    }
    fixed(dt) {
      this.t += dt;
      const lv = this.lv, p = this.p;
      if (this.state === 'play' || this.state === 'win') this.time += this.state === 'play' ? dt : 0;
      this.banner.t += dt;
      this.shake = Math.max(0, this.shake - dt * 30);
      if (this.state === 'over' || this.state === 'done') { this.stateT += dt; this.updateParticles(dt); return; }

      // lasers
      for (const L of lv.lasers) {
        const ph = (this.t + L.phase) % L.period;
        const wasOn = L.on;
        L.on = ph > 1.6; L.warn = ph > 1.1 && ph <= 1.6;
        if (L.on && !wasOn && Math.abs(L.x - p.x) < 700) PM.audio.sfx('laser');
        let ty = L.ty + 1; while (ty < lv.h && !lv.isSolid(Math.floor(L.x / T), ty)) ty++;
        L.y2 = ty * T;
      }
      // movers
      for (const m of lv.movers) {
        m.t += dt;
        const k = (1 - Math.cos(m.t * 0.9)) / 2;
        const nx = m.axis === 'x' ? m.ox + k * m.range : m.ox;
        const ny = m.axis === 'y' ? m.oy - k * m.range : m.oy;
        m.dx = nx - m.x; m.dy = ny - m.y; m.py = m.y; m.x = nx; m.y = ny;
      }
      // gate anim
      lv.gateT = PM.clamp(lv.gateT + (lv.gateClosed ? dt : -dt) * 3, 0, 1);
      for (const k in lv.anim) { lv.anim[k] -= dt; if (lv.anim[k] <= 0) delete lv.anim[k]; }

      if (this.state === 'play') this.updatePlayer(dt);
      else if (this.state === 'respawn') { this.stateT += dt; if (this.stateT > 0.9) this.doRespawn(); }
      else if (this.state === 'dying') {
        this.stateT += dt; p.vy += G * 0.7 * dt; p.y += p.vy * dt;
        if (this.stateT > 1.6) { this.state = 'over'; this.stateT = 0; PM.audio.sfx('lose'); }
      } else if (this.state === 'win') this.updateWin(dt);

      this.updateItems(dt);
      this.updateEnemies(dt);
      if (lv.boss) this.updateBoss(dt);
      this.updateProjectiles(dt);
      this.updateParticles(dt);
      this.updateCamera(dt);
    }

    updatePlayer(dt) {
      const lv = this.lv, p = this.p, inp = PM.input;
      p.prevBot = p.y;
      const dir = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
      const spd = p.speedT > 0 ? 1.4 : 1;
      p.inv = Math.max(0, p.inv - dt); p.speedT = Math.max(0, p.speedT - dt); p.drop = Math.max(0, p.drop - dt);
      if (inp.hit('jump')) p.jumpBuf = JUMP_BUFFER;
      else if (inp.down('jump') && p.onGround) p.jumpBuf = Math.max(p.jumpBuf, 0.08);
      else p.jumpBuf -= dt;

      // ride mover
      if (p.ride) { const m = p.ride; moveX(lv, p, m.dx); p.y += m.dy; }

      // ladder
      const ladTx = Math.floor(p.x / T);
      const onLad = this.ladderAt(ladTx, p.y - 4) || this.ladderAt(ladTx, p.y - p.h / 2);
      const ladBelow = this.ladderAt(ladTx, p.y + 4);
      const upK = PM.input.keys.ArrowUp || PM.input.keys.KeyW || inp.virt.up;
      const downK = inp.down('down');
      if (!p.climbing && ((onLad && upK) || (ladBelow && downK && p.onGround))) {
        p.climbing = true; p.vx = 0; p.jumpBuf = 0; p.ride = null;
        if (ladBelow && downK) p.y += 4;
      }
      if (p.climbing) {
        p.x += ((ladTx + 0.5) * T - p.x) * Math.min(1, dt * 14);
        const vy = ((downK ? 1 : 0) - (upK ? 1 : 0)) * 210;
        p.vy = vy; p.vx = 0;
        if (vy) p.phase += dt * 12;
        moveY(lv, p, vy * dt, false);
        // top of ladder: stand on it
        const topTy = this.ladderTop(ladTx, Math.floor((p.y - 2) / T));
        if (vy < 0 && topTy !== null && p.y <= topTy * T) { p.y = topTy * T; p.climbing = false; p.onGround = true; p.vy = 0; }
        if (!this.ladderAt(ladTx, p.y - 4) && !this.ladderAt(ladTx, p.y - p.h / 2)) p.climbing = false;
        if (p.onGround && vy > 0) p.climbing = false;
        if (dir && !upK && !downK) { p.climbing = false; p.vx = dir * 120; }
        if (inp.hit('jump') && !(PM.input.pressed.ArrowUp || PM.input.pressed.KeyW)) { p.climbing = false; p.vy = -JUMP * 0.85; PM.audio.sfx('jump'); }
        p.state = 'climb';
      } else {
        // horizontal
        const acc = p.onGround ? 2600 : 1800;
        if (dir) {
          p.vx += dir * acc * dt * (Math.sign(p.vx) === -dir ? 1.8 : 1);
          p.face = dir;
        } else {
          const f = (p.onGround ? 2500 : 700) * dt;
          p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
        }
        const max = RUN * spd;
        p.vx = PM.clamp(p.vx, -max, max);
        // jump
        p.coyote = p.onGround ? COYOTE_TIME : p.coyote - dt;
        if (downK && p.onGround && inp.hit('jump') && this.onOneWay()) { p.drop = 0.25; p.jumpBuf = 0; p.y += 2; p.onGround = false; }
        if (p.jumpBuf > 0 && p.coyote > 0) {
          p.vy = -JUMP * (spd > 1 ? 1.07 : 1); p.jumpBuf = 0; p.coyote = 0; p.onGround = false; p.ride = null;
          p.sx = 0.75; p.sy = 1.25;
          PM.audio.sfx('jump');
          this.dust(p.x, p.y, 5);
        }
        let g = G;
        if (p.vy >= 0) p.noCut = false;
        if (p.vy < 0 && !inp.down('jump') && !p.noCut) g *= 2.4;
        p.vy = Math.min(p.vy + g * dt, MAXFALL);
        const wasGround = p.onGround, fallV = p.vy;
        moveX(lv, p, p.vx * dt);
        moveY(lv, p, p.vy * dt, p.drop <= 0);
        // movers collision
        p.ride = null;
        if (p.vy >= 0) {
          for (const m of lv.movers) {
            if (Math.abs(p.x - (m.x + m.w / 2)) < m.w / 2 + p.w / 2 - 4 && p.prevBot <= m.py + 3 && p.y >= m.y - 1) {
              p.y = m.y; p.vy = 0; p.onGround = true; p.ride = m; break;
            }
          }
        }
        if (p.onGround && !wasGround && fallV > 300) { p.sx = 1.25; p.sy = 0.78; this.dust(p.x, p.y, 6); PM.audio.sfx('step'); }
        if (p.bump) this.bumpTile(p.bump.tx, p.bump.ty);
        p.state = !p.onGround ? (p.vy < 0 ? 'jump' : 'fall') : (Math.abs(p.vx) > 20 ? 'run' : 'idle');
        if (p.state === 'run') {
          p.phase += dt * Math.abs(p.vx) / 24;
          p.dustT -= dt;
          if (p.dustT <= 0) { p.dustT = 0.12; this.dust(p.x - p.face * 8, p.y, 1); }
        }
      }
      p.sx += (1 - p.sx) * Math.min(1, dt * 12); p.sy += (1 - p.sy) * Math.min(1, dt * 12);
      if (p.speedT > 0 && Math.random() < 0.6) this.particles.push({ x: p.x + PM.rand(-10, 10), y: p.y - PM.rand(5, 50), vx: -p.vx * 0.2, vy: -20, g: 0, life: 0.4, max: 0.4, size: 4, color: '#7ad0ff', kind: 'dot' });
      // bounce pads
      if (p.vy >= 0) {
        const ty = Math.floor((p.y - 1) / T);
        for (const tx of [Math.floor((p.x - p.w / 2 + 4) / T), Math.floor((p.x + p.w / 2 - 4) / T)]) {
          if (lv.tileAt(tx, ty) === 'B' && p.y >= ty * T + T * 0.5) {
            p.vy = -BOUNCE; p.noCut = true; p.onGround = false; p.ride = null; p.sx = 0.7; p.sy = 1.35;
            lv.anim[tx + ',' + ty] = 0.35; PM.audio.sfx('bounce');
            this.burst(tx * T + T / 2, ty * T + T * 0.6, 8, '#ffe06a');
            break;
          }
        }
      }
      this.checkHazards();
      // checkpoints
      for (const cp of lv.checkpoints) {
        if (!cp.active && Math.abs(cp.x - p.x) < 34 && p.y > cp.y - 90 && p.y <= cp.y + 4) {
          cp.active = true; this.respawn = { x: cp.x, y: cp.y };
          PM.audio.sfx('checkpoint'); this.popup(cp.x, cp.y - 100, PM.t('checkpoint'), '#9aff8a');
          this.burst(cp.x, cp.y - 74, 16, '#7aff8a');
        }
      }
      // goal
      const g = lv.goal;
      if (g && (!lv.def.boss || this.bossDefeated) && Math.abs(p.x - g.x) < 30 && Math.abs(p.y - g.y) < 40) this.startWin();
      // falling out
      if (p.y > lv.ph + 80) this.die(true);
      this.p.x = PM.clamp(p.x, p.w / 2, lv.pw - p.w / 2);
    }
    ladderAt(tx, y) { return this.lv.tileAt(tx, Math.floor(y / T)) === 'H'; }
    ladderTop(tx, ty) {
      const lv = this.lv;
      for (let y = ty; y <= ty + 1; y++) if (lv.tileAt(tx, y) === 'H' && lv.tileAt(tx, y - 1) !== 'H') return y;
      return null;
    }
    onOneWay() {
      const p = this.p, ty = Math.floor(p.y / T);
      return this.lv.tileAt(Math.floor(p.x / T), ty) === '-';
    }
    bumpTile(tx, ty) {
      const lv = this.lv, ch = lv.tileAt(tx, ty), key = tx + ',' + ty;
      const cx = tx * T + T / 2, cy = ty * T + T / 2;
      if (ch === 'C') {
        lv.tiles[ty][tx] = ' ';
        PM.audio.sfx('break'); this.shake = Math.max(this.shake, 4);
        for (let i = 0; i < 10; i++) this.particles.push({ x: cx + PM.rand(-14, 14), y: cy + PM.rand(-14, 14), vx: PM.rand(-260, 260), vy: PM.rand(-520, -120), g: 1600, life: 1.1, max: 1.1, size: PM.rand(6, 12), color: i % 2 ? '#cf7c32' : '#8a4a1c', kind: 'debris', rot: Math.random() * 6, vr: PM.rand(-12, 12) });
        if (PM.hash(tx, ty) < 0.5) this.coinPop(cx, cy);
        this.hitEnemiesAbove(tx, ty);
      } else if (ch === '?' && !lv.used[key]) {
        lv.used[key] = true; lv.anim[key] = 0.25;
        PM.audio.sfx('box');
        const r = PM.hash(tx * 7, ty * 3);
        if (this.hearts < 3 && r < 0.4) this.spawnItem('W', cx, cy - T);
        else if (r < 0.55) this.spawnItem('!', cx, cy - T);
        else { for (let i = 0; i < 3; i++) setTimeout(() => this.coinPop(cx, cy - 10), i * 120); }
        this.hitEnemiesAbove(tx, ty);
      } else {
        lv.anim[key] = 0.12;
        PM.audio.sfx('bump');
      }
    }
    hitEnemiesAbove(tx, ty) {
      for (const e of this.lv.enemies) if (e.alive && !e.dying && !e.float && Math.abs(e.x - (tx + 0.5) * T) < T * 0.8 && Math.abs(e.y - ty * T) < 6) this.killEnemy(e, true);
    }
    spawnItem(type, x, y) {
      this.lv.items.push({ type, x, y, by: y, t: 0, alive: true, phys: true, vx: 0, vy: -380, w: 26, h: 26 });
    }
    coinPop(x, y) {
      this.coins++;
      PM.audio.sfx('coin');
      this.particles.push({ x, y: y - 10, vx: 0, vy: -520, g: 1500, life: 0.55, max: 0.55, size: 14, kind: 'coin' });
      this.popup(x, y - 40, '+1', '#ffe07a', 18);
    }

    checkHazards() {
      const lv = this.lv, p = this.p;
      const l = p.x - p.w / 2 + 5, r = p.x + p.w / 2 - 5, top = p.y - p.h + 8, bot = p.y - 1;
      for (let ty = Math.floor(top / T); ty <= Math.floor(bot / T); ty++) {
        for (let tx = Math.floor(l / T); tx <= Math.floor(r / T); tx++) {
          const ch = lv.tileAt(tx, ty);
          if (ch === '^') {
            const down = lv.isSolid(tx, ty - 1) && !lv.isSolid(tx, ty + 1);
            const y0 = down ? ty * T : ty * T + T * 0.45, y1 = down ? ty * T + T * 0.55 : (ty + 1) * T;
            if (bot > y0 && top < y1) this.hurt(tx * T + T / 2);
          } else if (ch === '~') {
            if (bot > ty * T + 16) { this.splash(p.x, ty * T + 12); this.die(false); return; }
          }
        }
      }
      for (const L of lv.lasers) if (L.on && Math.abs(L.x - p.x) < p.w / 2 + 3 && top < L.y2 && bot > L.y1) this.hurt(L.x);
    }
    hurt(fromX) {
      const p = this.p;
      if (p.inv > 0 || this.state !== 'play') return;
      this.hearts--; this.hit = true;
      p.inv = 1.6; p.climbing = false; p.ride = null;
      p.vx = (p.x < fromX ? -1 : 1) * 300; p.vy = -460;
      this.shake = 9;
      PM.audio.sfx('hurt');
      this.burst(p.x, p.y - 30, 10, '#ff6a5a');
      if (this.hearts <= 0) this.gameOver();
    }
    die(fall) {
      if (this.state !== 'play') return;
      this.hearts--; this.hit = true;
      PM.audio.sfx('fall');
      this.shake = 8;
      if (this.hearts <= 0) { this.gameOver(); return; }
      this.state = 'respawn'; this.stateT = 0; this.p.visible = false;
    }
    doRespawn() {
      const r = this.respawn;
      this.p = this.newPlayer(r.x, r.y);
      this.p.inv = 1.8;
      this.state = 'play';
      this.burst(r.x, r.y - 30, 18, '#ffd06a');
    }
    gameOver() {
      this.state = 'dying'; this.stateT = 0;
      PM.audio.silence();
      const p = this.p; p.vy = -700; p.vx = 0; p.state = 'fall'; p.visible = true;
    }
    startWin() {
      this.state = 'win'; this.stateT = 0;
      PM.audio.sfx('door');
      const p = this.p; p.climbing = false;
    }
    updateWin(dt) {
      const p = this.p, g = this.lv.goal;
      this.stateT += dt;
      p.x += (g.x - p.x) * Math.min(1, dt * 6);
      p.vy = Math.min(p.vy + G * dt, MAXFALL); moveY(this.lv, p, p.vy * dt, true);
      p.state = 'idle';
      if (this.stateT > 0.35) { p.alphaWin = Math.max(0, 1 - (this.stateT - 0.35) * 2); }
      if (this.stateT > 0.5 && !this.confetti) {
        this.confetti = true;
        PM.audio.silence(); PM.audio.sfx('win');
        for (let i = 0; i < 80; i++) this.particles.push({ x: g.x + PM.rand(-40, 40), y: g.y - 120, vx: PM.rand(-380, 380), vy: PM.rand(-800, -200), g: 900, life: 2.5, max: 2.5, size: PM.rand(5, 9), color: ['#ffd23a', '#ff5ad0', '#5ad0ff', '#7aff6a', '#ff7a2a'][i % 5], kind: 'conf', rot: Math.random() * 6, vr: PM.rand(-10, 10) });
      }
      if (this.stateT > 2.2 && !this.result) {
        const lv = this.lv;
        const stars = [true, this.slices >= lv.totalSlices, !this.hit];
        this.result = { stars, slices: this.slices, total: lv.totalSlices, coins: this.coins, time: this.time };
        const sd = PM.save.data, key = String(this.idx);
        const old = sd.stars[key] || [false, false, false];
        sd.stars[key] = old.map((v, i) => v || stars[i]);
        const ob = sd.best[key] || { slices: 0, coins: 0, time: 0 };
        sd.best[key] = { slices: Math.max(ob.slices, this.slices), coins: Math.max(ob.coins, this.coins), time: ob.time ? Math.min(ob.time, this.time) : this.time };
        sd.unlocked = Math.max(sd.unlocked, Math.min(PM.LEVELS.length, this.idx + 2));
        sd.current = Math.min(PM.LEVELS.length - 1, this.idx + 1);
        PM.save.write();
        this.state = 'done';
      }
    }

    updateItems(dt) {
      const lv = this.lv, p = this.p;
      const pb = { x: p.x, y: p.y + 4, w: p.w + 14, h: p.h + 10 };
      for (const it of lv.items) {
        if (!it.alive) continue;
        it.t += dt;
        if (it.phys) {
          it.vy = Math.min(it.vy + G * 0.6 * dt, 700);
          const e = { x: it.x, y: it.y + 13, w: 24, h: 26, vx: 0, vy: it.vy };
          moveY(lv, e, it.vy * dt, true);
          it.y = e.y - 13; it.vy = e.vy; if (e.onGround) it.phys = it.vy !== 0;
          it.by = it.y;
        } else it.y = it.by + Math.sin(it.t * 3) * 4;
        if (this.state !== 'play') continue;
        if (overlap(pb, { x: it.x, y: it.y + 14, w: 26, h: 28 })) {
          it.alive = false;
          if (it.type === 's') { this.slices++; PM.audio.sfx('slice'); this.sparkle(it.x, it.y, '#ffd86a'); }
          else if (it.type === 'o') { this.coins++; PM.audio.sfx('coin'); this.sparkle(it.x, it.y, '#fff0a0'); }
          else if (it.type === 'W') { this.hearts = Math.min(3, this.hearts + 1); PM.audio.sfx('heal'); this.popup(it.x, it.y - 30, PM.t('heal'), '#ff8a7a'); this.sparkle(it.x, it.y, '#ff7a6a'); }
          else if (it.type === '!') { p.speedT = 9; PM.audio.sfx('power'); this.popup(it.x, it.y - 30, PM.t('speed'), '#7ad0ff'); this.sparkle(it.x, it.y, '#7ad0ff'); }
        }
      }
    }

    updateEnemies(dt) {
      const lv = this.lv, p = this.p;
      for (const e of lv.enemies) {
        if (!e.alive) continue;
        e.t += dt;
        if (Math.abs(e.x - p.x) > PM.W * 1.2 && !e.dying) continue; // sleep off-screen
        if (e.dying) {
          e.dying += dt;
          if (e.float) { e.vy += G * dt; e.y += e.vy * dt; e.rot = (e.rot || 0) + dt * 10; }
          if (e.dying > 0.7) e.alive = false;
          continue;
        }
        e.sx += (1 - e.sx) * Math.min(1, dt * 10); e.sy += (1 - e.sy) * Math.min(1, dt * 10);
        if (e.type === 'b') {
          e.vx = e.face * 58;
          e.vy = Math.min(e.vy + G * dt, MAXFALL);
          moveX(lv, e, e.vx * dt);
          if (e.hitWall) e.face *= -1;
          moveY(lv, e, e.vy * dt, true);
          if (e.onGround) {
            const ax = Math.floor((e.x + e.face * (e.w / 2 + 2)) / T), ay = Math.floor((e.y + 4) / T);
            const ch = lv.tileAt(ax, ay);
            if (!lv.isSolid(ax, ay) && ch !== '-' || lv.tileAt(ax, ay - 1) === '^') e.face *= -1;
          }
        } else if (e.type === 'a') {
          e.vy = Math.min(e.vy + G * dt, MAXFALL);
          if (e.onGround) {
            e.vx = 0;
            e.timer -= dt;
            if (e.timer <= 0) {
              const dx = p.x - e.x;
              if (Math.abs(dx) < 7 * T) e.face = Math.sign(dx) || e.face;
              const ax = Math.floor((e.x + e.face * T) / T), ay = Math.floor((e.y + 4) / T);
              if (!lv.isSolid(ax, ay) && lv.tileAt(ax, ay) !== '-') e.face *= -1;
              e.vy = -600; e.vx = e.face * 105; e.timer = 0.9 + Math.random() * 0.6; e.sx = 0.8; e.sy = 1.25;
            } else if (e.timer < 0.25) { e.sx = 1.15; e.sy = 0.85; }
          }
          const was = e.onGround;
          moveX(lv, e, e.vx * dt);
          if (e.hitWall) { e.face *= -1; e.vx = -e.vx; }
          moveY(lv, e, e.vy * dt, true);
          if (e.onGround && !was) { e.sx = 1.3; e.sy = 0.75; }
        } else if (e.type === 'd') {
          const nx = e.ox + Math.sin(e.t * 0.75) * T * 2.6;
          e.vx = (nx - e.x) / dt; e.x = nx;
          e.y = e.oy + Math.sin(e.t * 2.3) * 10;
          e.face = e.vx >= 0 ? 1 : -1;
          e.cd -= dt;
          const dx = p.x - e.x, dy = p.y - 30 - e.y;
          if (e.cd <= 0 && Math.abs(dx) < 260 && dy > 0 && dy < 520 && this.state === 'play') {
            const d = Math.hypot(dx, dy);
            this.proj.push({ type: 'bolt', x: e.x, y: e.y + 10, vx: dx / d * 300, vy: dy / d * 300, g: 0, r: 7, life: 3 });
            e.cd = 2.4; PM.audio.sfx('shoot');
          }
        }
        if (e.y > lv.ph + 60) { e.alive = false; continue; }
        const ty = Math.floor((e.y - 6) / T);
        if (!e.float && lv.tileAt(Math.floor(e.x / T), ty) === '~') { this.splash(e.x, ty * T + 12); e.alive = false; continue; }
        // player interaction
        if (this.state !== 'play' || !p.visible) continue;
        if (overlap(p, e)) {
          if (p.vy > 40 && p.prevBot <= e.y - e.h + 16) {
            this.killEnemy(e);
            p.vy = PM.input.down('jump') ? -760 : -STOMP; p.onGround = false; p.sx = 0.8; p.sy = 1.2;
          } else this.hurt(e.x);
        }
      }
    }
    killEnemy(e, fromBelow) {
      e.dying = 0.001; e.sy = e.float ? 1 : 0.35; e.sx = e.float ? 1 : 1.4;
      if (e.float || fromBelow) e.vy = -300;
      if (fromBelow) { e.float = true; }
      PM.audio.sfx('stomp');
      this.shake = Math.max(this.shake, 3);
      for (let i = 0; i < 6; i++) { const a = -Math.PI * (i / 5); this.particles.push({ x: e.x, y: e.y - e.h / 2, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, g: 400, life: 0.5, max: 0.5, size: 9, kind: 'star', color: '#ffe07a' }); }
      this.popup(e.x, e.y - e.h - 10, '+1', '#ffe07a', 18);
      this.coins++;
    }

    /* ---------- boss ---------- */
    updateBoss(dt) {
      const lv = this.lv, b = lv.boss, p = this.p;
      if (!b.alive) return;
      b.t += dt; b.st += dt; b.inv = Math.max(0, b.inv - dt);
      b.sx += (1 - b.sx) * Math.min(1, dt * 8); b.sy += (1 - b.sy) * Math.min(1, dt * 8);
      const spd = 1 + (b.maxHp - b.hp) * 0.1;
      const toP = Math.sign(p.x - b.x) || b.face;
      const setState = s => { b.state = s; b.st = 0; b.thrown = 0; };
      if (b.state === 'wait') {
        if (p.x > lv.arenaX + T * 1.5 && this.state === 'play') {
          lv.gateClosed = true; this.bossActive = true;
          PM.audio.sfx('gate'); this.shake = 8;
          setState('intro'); PM.audio.play('boss');
          this.banner = { text: PM.t('boss'), sub: PM.t('bossIntro'), t: 0, dur: 2.8, boss: true };
          // push player out of gate if overlapping
          if (p.x - p.w / 2 < lv.arenaX) p.x = lv.arenaX + p.w / 2 + 1;
        }
      } else if (b.state === 'intro') {
        b.face = toP;
        if (b.st > 0.3 && !b.roared) { b.roared = true; PM.audio.sfx('roar'); this.shake = 14; }
        if (b.st > 1.8) setState('walk');
      } else if (b.state === 'walk') {
        b.face = toP; b.vx = b.face * 100 * spd;
        if (b.st > 1.3 / spd) { const seq = ['throw', 'charge', 'jump']; setState(seq[b.step++ % 3]); }
      } else if (b.state === 'throw') {
        b.vx = 0; b.face = toP;
        if (b.st > 0.35 + b.thrown * 0.45 && b.thrown < 3) {
          b.thrown++;
          const sx = b.x + b.face * 50, sy = b.y - 110, Tt = 0.85;
          const tx = p.x + p.vx * 0.3, ty = p.y - 20;
          this.proj.push({ type: 'pizza', x: sx, y: sy, vx: (tx - sx) / Tt, vy: (ty - sy - 0.5 * 1400 * Tt * Tt) / Tt, g: 1400, r: 15, life: 3, rot: 0 });
          PM.audio.sfx('throw');
        }
        if (b.st > 1.8) setState('walk');
      } else if (b.state === 'charge') {
        if (b.st < 0.75) { b.vx = 0; b.face = toP; b.sx = 1 + Math.sin(b.st * 60) * 0.03; }
        else {
          b.vx = b.face * 470 * spd;
          if (Math.random() < 0.5) this.dust(b.x - b.face * 30, b.y, 1);
        }
        if (b.hitWall && b.st > 0.75) { setState('stunned'); PM.audio.sfx('thud'); this.shake = 14; this.burst(b.x + b.face * 44, b.y - 60, 14, '#ffd06a'); }
        if (b.st > 4) setState('walk');
      } else if (b.state === 'jump') {
        if (b.st < 0.05 && b.onGround) { b.vy = -1000; b.vx = PM.clamp((p.x - b.x) / 1.0, -420, 420); b.onGround = false; b.sx = 0.8; b.sy = 1.2; PM.audio.sfx('bigjump'); }
        else if (b.onGround && b.st > 0.2) {
          b.vx = 0; this.shake = 12; PM.audio.sfx('thud'); b.sx = 1.25; b.sy = 0.8;
          [-1, 1].forEach(d => this.proj.push({ type: 'wave', x: b.x + d * 40, y: b.y - 14, vx: d * 380, vy: 0, g: 0, r: 14, life: 2.6 }));
          this.dust(b.x, b.y, 12);
          setState('walk');
        }
      } else if (b.state === 'stunned') {
        b.vx = 0;
        if (b.st > 2.0) setState('jump');
      } else if (b.state === 'dead') {
        b.vx = 0;
        if (Math.random() < 0.3) { this.burst(b.x + PM.rand(-50, 50), b.y - PM.rand(20, 140), 8, Math.random() < 0.5 ? '#ff7a2a' : '#ffd23a'); this.shake = 6; }
        if (b.st > 2.2) {
          b.alive = false; this.bossDefeated = true; lv.gateClosed = false;
          for (let i = 0; i < 40; i++) this.particles.push({ x: b.x, y: b.y - 60, vx: PM.rand(-400, 400), vy: PM.rand(-700, -100), g: 1200, life: 1.5, max: 1.5, size: PM.rand(6, 14), color: ['#8a7ea0', '#b4a8c8', '#5e5274', '#fff'][i % 4], kind: 'debris', rot: 0, vr: PM.rand(-10, 10) });
          PM.audio.sfx('explode'); this.shake = 20;
          this.banner = { text: PM.t('bossDefeated'), sub: '', t: 0, dur: 2.5, boss: true };
          PM.audio.play('map');
        }
        return;
      }
      if (b.state !== 'wait' && b.state !== 'dead') {
        b.vy = Math.min(b.vy + G * dt, MAXFALL);
        moveX(lv, b, b.vx * dt);
        moveY(lv, b, b.vy * dt, false);
        if (b.x - b.w / 2 < lv.arenaX) { b.x = lv.arenaX + b.w / 2; b.hitWall = -1; }
      }
      // collision with player
      if (this.state !== 'play' || b.state === 'wait' || b.state === 'intro') return;
      if (overlap(p, b)) {
        if (p.vy > 40 && p.prevBot <= b.y - b.h + 28 && b.inv <= 0) {
          b.hp--; b.inv = 1.1; b.sx = 1.3; b.sy = 0.75;
          p.vy = -820; p.onGround = false; p.noCut = true;
          p.inv = Math.max(p.inv, 2.2); // time to get away after a hit
          PM.audio.sfx('bosshit'); this.shake = 10;
          this.burst(p.x, p.y, 14, '#ffe07a');
          if (b.hp <= 0) { setState('dead'); PM.audio.silence(); PM.audio.sfx('explode'); }
          else if (b.state === 'stunned' || b.state === 'charge') setState('jump');
        } else if (b.state !== 'stunned' && b.inv <= 0.6) this.hurt(b.x);
        else if (p.vy > 0 && p.prevBot <= b.y - b.h + 28) { p.vy = -500; }
      }
    }

    updateProjectiles(dt) {
      const lv = this.lv, p = this.p;
      for (const q of this.proj) {
        q.life -= dt;
        q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.rot !== undefined) q.rot += dt * 10;
        const tx = Math.floor(q.x / T), ty = Math.floor(q.y / T);
        if (q.type === 'wave') {
          if (lv.isSolid(Math.floor((q.x + Math.sign(q.vx) * 14) / T), ty)) q.life = 0;
          if (Math.random() < 0.5) this.dust(q.x, q.y + 14, 1);
        } else if (lv.isSolid(tx, ty) || lv.tileAt(tx, ty) === '~') {
          q.life = 0;
          this.burst(q.x, q.y, 6, q.type === 'pizza' ? '#f8cb4a' : '#ff6a5a');
        }
        if (this.state === 'play' && q.life > 0) {
          const hy = q.type === 'wave' ? 14 : q.r;
          if (Math.abs(q.x - p.x) < p.w / 2 + q.r - 4 && q.y + hy > p.y - p.h + 6 && q.y - hy < p.y - 2) { this.hurt(q.x); if (q.type !== 'wave') q.life = 0; }
        }
      }
      this.proj = this.proj.filter(q => q.life > 0);
    }

    /* ---------- particles ---------- */
    dust(x, y, n) { for (let i = 0; i < n; i++) this.particles.push({ x: x + PM.rand(-8, 8), y: y - 3, vx: PM.rand(-70, 70), vy: PM.rand(-90, -20), g: 120, life: 0.5, max: 0.5, size: PM.rand(4, 8), color: this.lv.th.crustHi, kind: 'puff' }); }
    burst(x, y, n, color) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = PM.rand(80, 320); this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 300, life: 0.6, max: 0.6, size: PM.rand(3, 6), color, kind: 'dot' }); } }
    sparkle(x, y, color) {
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; this.particles.push({ x, y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, g: 0, life: 0.45, max: 0.45, size: 6, color, kind: 'spark' }); }
      this.particles.push({ x, y, vx: 0, vy: 0, g: 0, life: 0.35, max: 0.35, size: 30, color, kind: 'ring' });
    }
    splash(x, y) {
      const col = this.lv.th.liquid === 'acid' ? '#a8f04a' : '#ffa03a';
      for (let i = 0; i < 16; i++) this.particles.push({ x: x + PM.rand(-14, 14), y, vx: PM.rand(-160, 160), vy: PM.rand(-520, -200), g: 1400, life: 0.9, max: 0.9, size: PM.rand(4, 9), color: col, kind: 'dot' });
    }
    popup(x, y, text, color, size = 24) { this.popups.push({ x, y, text, color, size, t: 0 }); }
    updateParticles(dt) {
      for (const q of this.particles) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.vr) q.rot += q.vr * dt; if (q.kind === 'puff') { q.vx *= 0.92; } }
      this.particles = this.particles.filter(q => q.life > 0);
      if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
      for (const u of this.popups) u.t += dt;
      this.popups = this.popups.filter(u => u.t < 1.1);
      // ambient
      const th = this.lv.th;
      if (this.amb.length < 40 && Math.random() < 0.5) {
        const k = th.amb;
        this.amb.push({ x: Math.random() * PM.W, y: k === 'ember' || k === 'bubble' ? PM.H + 10 : Math.random() * PM.H, vx: PM.rand(-15, 15), vy: k === 'ash' ? PM.rand(10, 30) : -PM.rand(15, 50), life: PM.rand(4, 9), max: 9, k, s: PM.rand(1.5, 3.5), p: Math.random() * 6 });
      }
      for (const a of this.amb) { a.life -= dt; a.x += a.vx * dt + Math.sin(this.t * 2 + a.p) * 0.3; a.y += a.vy * dt; }
      this.amb = this.amb.filter(a => a.life > 0);
    }

    updateCamera(dt) {
      const p = this.p, lv = this.lv;
      let target = p.x - PM.W / 2 + p.face * 70;
      let lo = 0, hi = lv.pw - PM.W;
      if (this.bossActive && !this.bossDefeated) lo = lv.arenaX - T;
      target = PM.clamp(target, lo, hi);
      this.cam.x += (target - this.cam.x) * Math.min(1, dt * 5);
      this.cam.x = PM.clamp(this.cam.x, 0, lv.pw - PM.W);
    }

    /* ====================== rendering ====================== */
    draw(c) {
      const lv = this.lv, p = this.p;
      const cx = Math.round(this.cam.x), t = this.t;
      A.drawBackdrop(c, this.bd, cx, t, lv.pw - PM.W);
      // ambient (back)
      this.drawAmbient(c);
      const sx = this.shake ? PM.rand(-1, 1) * this.shake : 0, sy = this.shake ? PM.rand(-1, 1) * this.shake : 0;
      c.save(); c.translate(-cx + sx, sy);
      const vx0 = cx - T, vx1 = cx + PM.W + T;
      // goal (behind tiles)
      if (lv.goal) {
        if (lv.def.boss) {
          A.castle(c, lv.goal.x, lv.goal.y + 6, 1.4, t);
          if (this.bossDefeated) A.trophy(c, lv.goal.x, lv.goal.y, t);
        } else if (lv.goal.x > vx0 - 300 && lv.goal.x < vx1 + 300) A.pizzeria(c, lv.goal.x, lv.goal.y + 4, 1, t);
      }
      for (const cp of lv.checkpoints) if (cp.x > vx0 && cp.x < vx1) A.checkpoint(c, cp.x, cp.y, cp.active, t);
      this.drawChunks(c, cx);
      this.drawDynamicTiles(c, vx0, vx1);
      for (const m of lv.movers) if (m.x + m.w > vx0 && m.x < vx1) A.movPlat(c, m.x, m.y, m.w, m.h);
      // items
      for (const it of lv.items) {
        if (!it.alive || it.x < vx0 || it.x > vx1) continue;
        if (it.type === 's') A.slice(c, it.x, it.y, 1, Math.sin(it.t * 2) * 0.2);
        else if (it.type === 'o') A.coin(c, it.x, it.y, 11, it.t);
        else if (it.type === 'W') { A.glow(c, it.x, it.y, 34, 'rgba(255,200,80,0.5)'); A.pizza(c, it.x, it.y, 16, it.t); }
        else if (it.type === '!') A.powerup(c, it.x, it.y, it.t);
      }
      // enemies
      for (const e of lv.enemies) {
        if (!e.alive || e.x < vx0 - 40 || e.x > vx1 + 40) continue;
        const al = e.dying ? Math.max(0, 1 - e.dying / 0.7) : 1;
        const look = (p.x - e.x) / 200 * (e.face || 1);
        if (e.type === 'b') A.blob(c, e.x, e.y, { t: e.t, face: e.face, sx: e.sx, sy: e.sy, alpha: al, look });
        else if (e.type === 'a') A.alien(c, e.x, e.y, { t: e.t, face: e.face, sx: e.sx, sy: e.sy, alpha: al, look: -look });
        else if (e.type === 'd') A.drone(c, e.x, e.y, { t: e.t, face: e.face, tilt: e.dying ? e.rot : PM.clamp(e.vx / 600, -0.3, 0.3), alpha: al });
      }
      // boss
      const b = lv.boss;
      if (b && b.alive) {
        const flash = b.inv > 0 && Math.floor(b.inv * 16) % 2 === 0;
        A.robotChef(c, b.x, b.y, { t: b.t, face: b.face, sx: b.sx, sy: b.sy, walk: Math.abs(b.vx) > 1, angry: b.state === 'charge', stunned: b.state === 'stunned', throwing: b.state === 'throw' && b.st % 0.45 < 0.15, alpha: flash ? 0.4 : (b.state === 'dead' ? Math.max(0, 1 - b.st / 2.2) : 1) });
      }
      // player
      if (p.visible && !(p.inv > 0 && this.state === 'play' && Math.floor(p.inv * 14) % 2 === 0)) {
        const dying = this.state === 'dying' || this.state === 'over';
        A.hero(c, p.x, p.y, { t, state: dying ? 'fall' : p.state, phase: p.phase, face: p.face, sx: p.sx, sy: p.sy * (dying ? -1 : 1), tilt: p.state === 'run' ? p.face * 0.06 : 0, glow: p.speedT > 0, alpha: p.alphaWin !== undefined ? p.alphaWin : 1 });
      }
      // projectiles
      for (const q of this.proj) {
        if (q.type === 'bolt') A.bolt(c, q.x, q.y, t);
        else if (q.type === 'pizza') A.pizza(c, q.x, q.y, q.r, q.rot);
        else if (q.type === 'wave') {
          c.save(); c.globalAlpha = Math.min(1, q.life);
          A.glow(c, q.x, q.y, 34, 'rgba(255,120,40,0.7)');
          c.beginPath(); c.moveTo(q.x - 16, q.y + 14); c.quadraticCurveTo(q.x, q.y - 26, q.x + 16, q.y + 14); c.closePath(); A.fs(c, '#ffb03a', 2.5);
          c.restore();
        }
      }
      this.drawParticles(c);
      for (const u of this.popups) {
        const k = u.t / 1.1;
        A.text(c, u.text, u.x, u.y - k * 40, { size: u.size, color: u.color, stroke: OUT, lw: 5, alpha: 1 - k });
      }
      c.restore();
      if (this.state === 'respawn') { c.fillStyle = `rgba(20,5,10,${Math.sin(Math.min(1, this.stateT / 0.9) * Math.PI) * 0.6})`; c.fillRect(0, 0, PM.W, PM.H); }
      this.drawHUD(c);
    }
    drawAmbient(c) {
      for (const a of this.amb) {
        const al = Math.min(1, a.life, (a.max - a.life) * 2) * 0.8;
        c.globalAlpha = Math.max(0, al);
        if (a.k === 'ember') { c.fillStyle = '#ffa04a'; c.fillRect(a.x, a.y, a.s, a.s); }
        else if (a.k === 'bubble') { A.circle(c, a.x, a.y, a.s * 1.3); c.strokeStyle = '#b8f06a'; c.lineWidth = 1.2; c.stroke(); }
        else if (a.k === 'sparkle') { const s = a.s * (0.6 + 0.4 * Math.sin(this.t * 5 + a.p)); c.fillStyle = '#f0c0ff'; c.fillRect(a.x - s, a.y - 0.6, s * 2, 1.2); c.fillRect(a.x - 0.6, a.y - s, 1.2, s * 2); }
        else { c.fillStyle = '#6a5058'; c.fillRect(a.x, a.y, a.s, a.s); }
      }
      c.globalAlpha = 1;
    }
    drawParticles(c) {
      for (const q of this.particles) {
        const k = q.life / q.max;
        c.globalAlpha = Math.min(1, k * 1.5);
        switch (q.kind) {
          case 'dot': A.circle(c, q.x, q.y, q.size * k + 1); c.fillStyle = q.color; c.fill(); break;
          case 'puff': A.circle(c, q.x, q.y, q.size * (1.5 - k)); c.fillStyle = q.color; c.globalAlpha *= 0.5; c.fill(); break;
          case 'spark': A.star(c, q.x, q.y, q.size * k + 2, true, q.color, 0); break;
          case 'star': A.star(c, q.x, q.y, q.size, true, q.color, 1.5); break;
          case 'ring': A.circle(c, q.x, q.y, q.size * (1.2 - k)); c.strokeStyle = q.color; c.lineWidth = 3 * k; c.stroke(); break;
          case 'coin': A.coin(c, q.x, q.y, 11, this.t * 3); break;
          case 'debris': case 'conf':
            c.save(); c.translate(q.x, q.y); c.rotate(q.rot);
            if (q.kind === 'conf') { c.fillStyle = q.color; c.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); }
            else { c.fillStyle = q.color; c.fillRect(-q.size / 2, -q.size / 2, q.size, q.size); c.strokeStyle = OUT; c.lineWidth = 1.5; c.strokeRect(-q.size / 2, -q.size / 2, q.size, q.size); }
            c.restore(); break;
        }
      }
      c.globalAlpha = 1;
    }

    /* ---------- tiles ---------- */
    drawChunks(c, cx) {
      const s = Math.min(2, Math.max(1, PM.view.px));
      if (s !== this.chunkScale || PM.dirtyChunks) { this.chunks.clear(); this.chunkScale = s; PM.dirtyChunks = false; }
      const i0 = Math.floor(cx / CH), i1 = Math.floor((cx + PM.W) / CH);
      for (let i = i0; i <= i1; i++) {
        let ch = this.chunks.get(i);
        if (!ch) {
          ch = this.renderChunk(i, s);
          this.chunks.set(i, ch);
          if (this.chunks.size > 10) { for (const k of this.chunks.keys()) { if (k < i0 - 1 || k > i1 + 1) { this.chunks.delete(k); break; } } }
        }
        c.drawImage(ch, i * CH, 0, CH, this.lv.ph);
      }
    }
    renderChunk(i, s) {
      const lv = this.lv;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(CH * s); cv.height = Math.ceil(lv.ph * s);
      const c = cv.getContext('2d');
      c.scale(s, s); c.translate(-i * CH, 0);
      const tx0 = Math.floor(i * CH / T) - 1, tx1 = Math.ceil((i + 1) * CH / T) + 1;
      for (let ty = 0; ty < lv.h; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (tx < 0 || tx >= lv.w) continue;
        const ch = lv.tileAt(tx, ty);
        if (ch === '#') drawRock(c, lv, tx, ty);
        else if (ch === '=') drawGirder(c, lv, tx, ty);
        else if (ch === 'p') drawPipe(c, lv, tx, ty);
        else if (ch === '-') drawPlank(c, lv, tx, ty);
        else if (ch === 'H') A.ladder(c, tx * T, ty * T, T);
        else if (ch === '^') A.spikes(c, tx * T, ty * T, T, lv.isSolid(tx, ty - 1) && !lv.isSolid(tx, ty + 1));
      }
      // decorations on rock tops
      for (let ty = 1; ty < lv.h; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (tx < 0 || tx >= lv.w) continue;
        if (lv.tileAt(tx, ty) === '#' && lv.tileAt(tx, ty - 1) === ' ' && lv.tileAt(tx, ty - 2) === ' ' && PM.hash(tx * 3, ty * 5) < 0.2) drawDeco(c, lv, tx, ty);
      }
      return cv;
    }
    drawDynamicTiles(c, vx0, vx1) {
      const lv = this.lv, t = this.t;
      const tx0 = Math.max(0, Math.floor(vx0 / T)), tx1 = Math.min(lv.w - 1, Math.floor(vx1 / T));
      for (let ty = 0; ty < lv.h; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const ch = lv.tiles[ty][tx];
        if (ch === ' ' || ch === '#') continue;
        const key = tx + ',' + ty, an = lv.anim[key] || 0;
        const x = tx * T, y = ty * T;
        if (ch === 'C') A.crate(c, x, y, T, an > 0 ? Math.sin(an / 0.12 * Math.PI) * 8 : 0);
        else if (ch === '?') A.qbox(c, x, y, T, lv.used[key], t, an > 0 ? Math.sin(an / 0.25 * Math.PI) * 10 : 0);
        else if (ch === 'B') A.bounce(c, x, y, T, an > 0 ? Math.sin(an / 0.35 * Math.PI) : 0);
        else if (ch === '~') drawLiquid(c, lv, tx, ty, t);
        else if (ch === 'G') drawGate(c, x, y, lv.gateT, lv.tileAt(tx, ty - 1) !== 'G');
      }
      for (const L of lv.lasers) {
        if (L.x < vx0 || L.x > vx1) continue;
        if (L.on || L.warn) A.laserBeam(c, L.x, L.y1 + 2, L.y2, t, L.warn);
        A.laserEmitter(c, L.tx * T, L.ty * T, T, L.warn, L.on);
      }
    }

    /* ---------- HUD ---------- */
    drawHUD(c) {
      const t = this.t;
      // slices
      A.rr(c, 18, 16, 380, 62, 18); c.fillStyle = 'rgba(30,8,18,0.6)'; c.fill();
      A.slice(c, 50, 47, 1.15, -0.4);
      A.text(c, '× ' + this.slices + '/' + this.lv.totalSlices, 76, 49, { size: 30, align: 'left', color: '#fff3dc', stroke: OUT, lw: 5 });
      A.coin(c, 210, 47, 13, t * 0.6);
      A.text(c, '× ' + this.coins, 232, 49, { size: 30, align: 'left', color: '#fff3dc', stroke: OUT, lw: 5 });
      for (let i = 0; i < 3; i++) {
        const full = i < this.hearts;
        const pulse = full && this.hearts === 1 ? 1 + Math.sin(t * 10) * 0.08 : 1;
        A.heart(c, 440 + i * 46, 46, 1.55 * pulse, full);
      }
      if (this.p.speedT > 0) {
        const k = this.p.speedT / 9;
        A.rr(c, 420, 74, 130, 10, 5); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fill();
        A.rr(c, 420, 74, 130 * k, 10, 5); c.fillStyle = '#5ab8ff'; c.fill();
      }
      // level tag
      A.text(c, '1-' + (this.idx + 1), PM.W / 2, 34, { size: 26, color: '#ffd8a8', stroke: OUT, lw: 5 });
      A.text(c, PM.fmtTime(this.time), PM.W / 2, 62, { size: 20, color: '#e8c8b0', stroke: OUT, lw: 4 });
      // pause button
      const pb = this.pauseRect = { x: PM.W - 82, y: 16, w: 64, h: 64 };
      const hov = PM.input.mouse.x > pb.x && PM.input.mouse.x < pb.x + pb.w && PM.input.mouse.y > pb.y && PM.input.mouse.y < pb.y + pb.h;
      A.rr(c, pb.x, pb.y, pb.w, pb.h, 16); A.fs(c, hov ? '#5a1e36' : '#3a1024', 3, hov ? '#ffb060' : '#b8564a');
      c.fillStyle = '#f2e6dc'; A.rr(c, pb.x + 21, pb.y + 18, 8, 28, 3); c.fill(); A.rr(c, pb.x + 35, pb.y + 18, 8, 28, 3); c.fill();
      // boss bar
      const b = this.lv.boss;
      if (b && this.bossActive && b.state !== 'wait' && !this.bossDefeated) {
        const w = 420, x = PM.W / 2 - w / 2, y = 92;
        A.text(c, PM.t('boss'), PM.W / 2, y - 4, { size: 22, color: '#ffb0a0', stroke: OUT, lw: 5 });
        A.rr(c, x, y + 10, w, 22, 11); A.fs(c, '#2a0a14', 3);
        const k = Math.max(0, b.hp) / b.maxHp;
        if (k > 0) { A.rr(c, x + 3, y + 13, (w - 6) * k, 16, 8); c.fillStyle = A.lg(c, 0, y + 13, 0, y + 29, ['#ff8a5a', '#d8222a']); c.fill(); }
      }
      // banner
      const bn = this.banner;
      if (bn && bn.t < bn.dur) {
        const k = bn.t, a = Math.min(1, k * 4, (bn.dur - k) * 2.5);
        const sc = PM.ease.outBack(Math.min(1, k * 2.5));
        c.save(); c.globalAlpha = Math.max(0, a);
        c.translate(PM.W / 2, 250); c.scale(sc, sc);
        A.text(c, bn.text, 0, 0, { size: bn.boss ? 64 : 84, title: true, color: bn.boss ? '#ff8a6a' : '#ffd06a', stroke: OUT, lw: 12, shadow: 'rgba(255,120,40,0.8)', blur: 24 });
        if (bn.sub) A.text(c, bn.sub, 0, 70, { size: 34, color: '#fff3dc', stroke: OUT, lw: 7 });
        if (bn.boss && this.lv.boss && this.lv.boss.alive && bn.sub) A.text(c, PM.t('bossHint'), 0, 118, { size: 26, color: '#ffe07a', stroke: OUT, lw: 6 });
        c.restore();
      }
      // touch controls
      if (PM.input.usingTouch && (this.state === 'play' || this.state === 'respawn')) {
        for (const tb of this.touchBtns) {
          const on = PM.input.virt[tb.id];
          A.circle(c, tb.x, tb.y, tb.r); c.fillStyle = on ? 'rgba(255,150,80,0.45)' : 'rgba(30,8,18,0.4)'; c.fill();
          c.lineWidth = 3; c.strokeStyle = 'rgba(255,220,190,0.6)'; c.stroke();
          c.save(); c.translate(tb.x, tb.y); c.fillStyle = 'rgba(255,240,220,0.9)';
          const r = tb.r * 0.38;
          const tri = a => { c.save(); c.rotate(a); c.beginPath(); c.moveTo(r, 0); c.lineTo(-r * 0.6, -r * 0.8); c.lineTo(-r * 0.6, r * 0.8); c.closePath(); c.fill(); c.restore(); };
          if (tb.id === 'left') tri(Math.PI); else if (tb.id === 'right') tri(0); else if (tb.id === 'up') tri(-Math.PI / 2); else if (tb.id === 'down') tri(Math.PI / 2);
          else A.text(c, '⤒', 0, 2, { size: 44, color: '#fff3dc' });
          c.restore();
        }
      }
    }
  }

  /* ====================== static tile painters ====================== */
  function drawRock(c, lv, tx, ty) {
    const th = lv.th, x = tx * T, y = ty * T;
    const liqAbove = lv.tileAt(tx, ty - 1) === '~';
    const up = lv.isRock(tx, ty - 1) || liqAbove, dn = lv.isRock(tx, ty + 1), lf = lv.isRock(tx - 1, ty), rt = lv.isRock(tx + 1, ty);
    let depth = 0; for (let k = 1; k <= 4; k++) { if (lv.isRock(tx, ty - k)) depth++; else break; }
    const R = 12;
    const rTL = !up && !lf ? R : 0, rTR = !up && !rt ? R : 0, rBR = !dn && !rt ? R : 0, rBL = !dn && !lf ? R : 0;
    const x2 = x + T + (rt ? 1 : 0), y2 = y + T + (dn ? 1 : 0);
    c.beginPath();
    c.moveTo(x + rTL, y); c.lineTo(x2 - rTR, y); if (rTR) c.quadraticCurveTo(x2, y, x2, y + rTR);
    c.lineTo(x2, y2 - rBR); if (rBR) c.quadraticCurveTo(x2, y2, x2 - rBR, y2);
    c.lineTo(x + rBL, y2); if (rBL) c.quadraticCurveTo(x, y2, x, y2 - rBL);
    c.lineTo(x, y + rTL); if (rTL) c.quadraticCurveTo(x, y, x + rTL, y);
    c.closePath();
    c.save();
    c.fillStyle = depth >= 3 ? th.rockDeep : depth >= 1 ? th.rockDark : th.rock;
    if (depth === 1 || depth === 2) { c.fillStyle = A.lg(c, 0, y, 0, y + T, depth === 1 ? [th.rock, th.rockDark] : [th.rockDark, th.rockDeep]); }
    c.fill();
    c.clip();
    const h = (a, b) => PM.hash(tx * 13 + a, ty * 7 + b);
    if (th.brick) {
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2;
      for (let r = 0; r < 3; r++) {
        const yy = y + r * 16;
        c.beginPath(); c.moveTo(x, yy); c.lineTo(x + T, yy); c.stroke();
        const off = (r + ty) % 2 ? 0 : 24;
        c.beginPath(); c.moveTo(x + off, yy); c.lineTo(x + off, yy + 16); c.moveTo(x + off + 24 > x + T ? x : x + off + 24, yy); c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(x + 2, y + 2, 20, 4);
    } else {
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2;
      const sy1 = y + 14 + h(1, 1) * 10, sy2 = y + 32 + h(2, 2) * 10;
      c.beginPath(); c.moveTo(x, sy1); c.quadraticCurveTo(x + T / 2, sy1 + (h(3, 3) - 0.5) * 8, x + T, sy1 + 2); c.stroke();
      c.beginPath(); c.moveTo(x, sy2); c.quadraticCurveTo(x + T / 2, sy2 + (h(4, 4) - 0.5) * 8, x + T, sy2 - 2); c.stroke();
      for (let k = 0; k < 3; k++) {
        const px = x + 6 + h(k, 9) * 36, py = y + 8 + h(9, k) * 34, pr = 2 + h(k, k) * 4;
        A.ellipse(c, px, py, pr * 1.3, pr); c.fillStyle = 'rgba(0,0,0,0.16)'; c.fill();
        A.ellipse(c, px - 1, py - 1, pr * 0.8, pr * 0.5); c.fillStyle = 'rgba(255,200,160,0.12)'; c.fill();
      }
      if (h(5, 5) < 0.3) { c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 10 + h(6, 6) * 20, y + 4); c.lineTo(x + 16 + h(7, 7) * 14, y + 20); c.lineTo(x + 12 + h(8, 8) * 20, y + 34); c.stroke(); }
    }
    if (!up) {
      const hl = 9 + PM.hash(tx, ty * 31) * 6, hr = 9 + PM.hash(tx + 1, ty * 31) * 6;
      const hm = 10 + PM.hash(tx * 5, ty) * 7;
      c.beginPath(); c.moveTo(x - 1, y - 1); c.lineTo(x2 + 1, y - 1); c.lineTo(x2 + 1, y + hr);
      c.quadraticCurveTo(x + T * 0.75, y + hm + 4, x + T / 2, y + hm);
      c.quadraticCurveTo(x + T * 0.25, y + hm - 4, x - 1, y + hl); c.closePath();
      c.fillStyle = th.crust; c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = th.crustHi; c.fillRect(x, y + 2, T + 1, 3);
      if (PM.hash(tx * 2, ty * 9) < 0.45) { const dx = x + 8 + PM.hash(tx, 5) * 30; A.ellipse(c, dx, y + hm + 4, 3, 5); c.fillStyle = th.crust; c.fill(); }
    }
    if (!lf) { c.fillStyle = 'rgba(255,190,140,0.12)'; c.fillRect(x, y, 7, T); }
    if (!rt) { c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x + T - 8, y, 8, T); }
    if (!dn) { c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(x, y + T - 9, T, 9); }
    c.restore();
    c.strokeStyle = OUT; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath();
    if (!up) { c.moveTo(x + rTL, y); c.lineTo(x + T - rTR, y); }
    if (!rt) { c.moveTo(x + T, y + rTR); c.lineTo(x + T, y + T - rBR); }
    if (!dn) { c.moveTo(x + T - rBR, y + T); c.lineTo(x + rBL, y + T); }
    if (!lf) { c.moveTo(x, y + T - rBL); c.lineTo(x, y + rTL); }
    if (rTL) { c.moveTo(x, y + rTL); c.quadraticCurveTo(x, y, x + rTL, y); }
    if (rTR) { c.moveTo(x + T - rTR, y); c.quadraticCurveTo(x + T, y, x + T, y + rTR); }
    if (rBR) { c.moveTo(x + T, y + T - rBR); c.quadraticCurveTo(x + T, y + T, x + T - rBR, y + T); }
    if (rBL) { c.moveTo(x + rBL, y + T); c.quadraticCurveTo(x, y + T, x, y + T - rBL); }
    c.stroke();
  }
  function drawGirder(c, lv, tx, ty) {
    const x = tx * T, y = ty * T;
    const lf = lv.tileAt(tx - 1, ty) === '=', rt = lv.tileAt(tx + 1, ty) === '=';
    c.save();
    c.fillStyle = A.lg(c, 0, y, 0, y + T, ['#9a8eb0', '#6e6280', '#4a3f5a']);
    c.fillRect(x, y + 2, T + (rt ? 1 : 0), T - 4);
    c.strokeStyle = '#3a3048'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x, y + T - 8); c.lineTo(x + T / 2, y + 12); c.lineTo(x + T, y + T - 8); c.stroke();
    c.fillStyle = '#b8acc8'; c.fillRect(x, y, T + (rt ? 1 : 0), 10);
    c.fillStyle = '#4a3f5a'; c.fillRect(x, y + T - 9, T + (rt ? 1 : 0), 7);
    c.save(); c.beginPath(); c.rect(x, y + 2, T + (rt ? 1 : 0), 6); c.clip();
    c.fillStyle = '#f5c22b'; c.fillRect(x, y + 2, T + 1, 6);
    c.fillStyle = '#2a2030';
    for (let k = -1; k < 4; k++) { c.beginPath(); c.moveTo(x + k * 16 + 4, y + 8); c.lineTo(x + k * 16 + 12, y + 2); c.lineTo(x + k * 16 + 18, y + 2); c.lineTo(x + k * 16 + 10, y + 8); c.fill(); }
    c.restore();
    [[x + 8, y + 15], [x + T - 8, y + 15]].forEach(p => { A.circle(c, p[0], p[1], 2.2); c.fillStyle = '#d8d0e0'; c.fill(); });
    c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath();
    c.moveTo(x, y); c.lineTo(x + T, y); c.moveTo(x, y + T - 2); c.lineTo(x + T, y + T - 2);
    if (!lf) { c.moveTo(x, y); c.lineTo(x, y + T - 2); }
    if (!rt) { c.moveTo(x + T, y); c.lineTo(x + T, y + T - 2); }
    c.stroke();
    c.restore();
  }
  function drawPipe(c, lv, tx, ty) {
    const x = tx * T, y = ty * T;
    const P = (a, b) => lv.tileAt(a, b) === 'p';
    const h = P(tx - 1, ty) || P(tx + 1, ty), v = P(tx, ty - 1) || P(tx, ty + 1);
    c.save();
    const draw = (horiz) => {
      if (horiz) {
        c.fillStyle = A.lg(c, 0, y + 4, 0, y + T - 4, ['#c0b4d4', '#8a7ea0', '#5a4e70', '#3a3048']); c.fillRect(x, y + 6, T, T - 12);
        c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + T, y + 6); c.moveTo(x, y + T - 6); c.lineTo(x + T, y + T - 6); c.stroke();
        if (!P(tx - 1, ty)) { A.rr(c, x, y + 1, 12, T - 2, 3); A.fs(c, '#9a8eb0', 3); }
        if (!P(tx + 1, ty)) { A.rr(c, x + T - 12, y + 1, 12, T - 2, 3); A.fs(c, '#9a8eb0', 3); }
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x, y + 10, T, 3);
      } else {
        c.fillStyle = A.lg(c, x + 4, 0, x + T - 4, 0, ['#c0b4d4', '#8a7ea0', '#5a4e70', '#3a3048']); c.fillRect(x + 6, y, T - 12, T);
        c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 6, y); c.lineTo(x + 6, y + T); c.moveTo(x + T - 6, y); c.lineTo(x + T - 6, y + T); c.stroke();
        if (!P(tx, ty - 1)) { A.rr(c, x + 1, y, T - 2, 12, 3); A.fs(c, '#9a8eb0', 3); }
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x + 10, y, 3, T);
      }
    };
    if (h && v) { draw(true); draw(false); A.rr(c, x + 3, y + 3, T - 6, T - 6, 8); A.fs(c, '#8a7ea0', 3); }
    else draw(!v);
    c.restore();
  }
  function drawPlank(c, lv, tx, ty) {
    const x = tx * T, y = ty * T, th = lv.th;
    const metal = th.brick || lv.theme === 'crystal';
    const lf = lv.tileAt(tx - 1, ty) === '-', rt = lv.tileAt(tx + 1, ty) === '-';
    c.save();
    c.fillStyle = metal ? A.lg(c, 0, y, 0, y + 16, ['#a89cbc', '#5e5272']) : A.lg(c, 0, y, 0, y + 16, ['#d08a48', '#8a4a1c']);
    c.fillRect(x, y, T + (rt ? 1 : 0), 15);
    c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + T, y); c.moveTo(x, y + 15); c.lineTo(x + T, y + 15);
    if (!lf) { c.moveTo(x, y); c.lineTo(x, y + 15); } if (!rt) { c.moveTo(x + T, y); c.lineTo(x + T, y + 15); }
    c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 24, y + 2); c.lineTo(x + 24, y + 13); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x, y + 3, T, 2);
    if (!lf || !rt) {
      const sx = !lf ? x + 10 : x + T - 10;
      c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(sx, y + 15); c.lineTo(sx, y + 26); c.stroke();
      c.strokeStyle = metal ? '#8a7ea0' : '#a8662e'; c.lineWidth = 2.5; c.stroke();
    }
    c.restore();
  }
  function drawDeco(c, lv, tx, ty) {
    const x = tx * T + T / 2, y = ty * T + 2, r = PM.hash(tx, ty * 3), th = lv.theme;
    c.save();
    if (th === 'crystal') {
      for (let i = 0; i < 3; i++) {
        const a = -0.4 + i * 0.4, hgt = 16 + PM.hash(tx + i, ty) * 18;
        c.save(); c.translate(x + (i - 1) * 7, y); c.rotate(a);
        c.beginPath(); c.moveTo(-5, 0); c.lineTo(-4, -hgt * 0.7); c.lineTo(0, -hgt); c.lineTo(4, -hgt * 0.7); c.lineTo(5, 0); c.closePath();
        A.fs(c, A.lg(c, -5, 0, 5, -hgt, ['#9a4ac0', '#e0a0ff']), 2);
        c.restore();
      }
      A.glow(c, x, y - 12, 26, 'rgba(220,140,255,0.35)');
    } else if (th === 'acid') {
      A.rr(c, x - 2.5, y - 14, 5, 14, 2); A.fs(c, '#d8e0c0', 2);
      c.beginPath(); c.arc(x, y - 14, 10, Math.PI, 0); c.closePath(); A.fs(c, '#8ae04a', 2.2);
      [[-4, -18], [3, -20]].forEach(p => { A.circle(c, x + p[0], y + p[1], 1.8); c.fillStyle = '#e8ffb0'; c.fill(); });
      A.glow(c, x, y - 16, 24, 'rgba(160,255,80,0.35)');
    } else if (th === 'castle') {
      if (r < 0.1) {
        A.rr(c, x - 4, y - 18, 8, 18, 2); A.fs(c, '#e8dcc8', 2);
        c.beginPath(); c.moveTo(x, y - 30); c.quadraticCurveTo(x + 5, y - 22, x, y - 19); c.quadraticCurveTo(x - 5, y - 22, x, y - 30); c.fillStyle = '#ffb03a'; c.fill();
        A.glow(c, x, y - 24, 22, 'rgba(255,170,60,0.6)');
      } else { A.ellipse(c, x, y - 7, 10, 8); A.fs(c, '#d8ccb8', 2); A.circle(c, x - 3.5, y - 8, 2.4); c.fillStyle = OUT; c.fill(); A.circle(c, x + 3.5, y - 8, 2.4); c.fill(); }
    } else {
      if (r < 0.07) { // bone
        c.translate(x, y - 5); c.rotate(-0.2);
        A.rr(c, -10, -2.5, 20, 5, 2); A.fs(c, '#f0e0c8', 2);
        [[-10, -2], [-10, 2], [10, -2], [10, 2]].forEach(p => { A.circle(c, p[0], p[1], 3); A.fs(c, '#f0e0c8', 2); });
      } else if (r < 0.13) { // small antenna/rock pile
        A.ellipse(c, x - 6, y - 5, 9, 6); A.fs(c, lv.th.rockDark, 2.2); A.ellipse(c, x + 6, y - 4, 7, 5); A.fs(c, lv.th.rock, 2.2);
      } else { // martian plant
        c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 2, y - 12, x + 3, y - 20); c.stroke();
        c.strokeStyle = '#d06a3a'; c.lineWidth = 2; c.stroke();
        A.circle(c, x + 3, y - 21, 4); A.fs(c, '#ffb05a', 2);
      }
    }
    c.restore();
  }
  function drawLiquid(c, lv, tx, ty, t) {
    const x = tx * T, y = ty * T, acid = lv.th.liquid === 'acid';
    const surf = lv.tileAt(tx, ty - 1) !== '~';
    c.save();
    const top = surf ? y + 10 : y;
    c.beginPath(); c.moveTo(x, y + T + 1);
    if (surf) { for (let i = 0; i <= 8; i++) { const xx = x + i * T / 8; c.lineTo(xx, top + Math.sin(t * 3 + xx * 0.08) * 3); } }
    else { c.lineTo(x, y); c.lineTo(x + T, y); }
    c.lineTo(x + T + 1, y + T + 1); c.closePath();
    c.fillStyle = acid ? A.lg(c, 0, top, 0, y + T, ['#d8ff7a', '#7ad02a', '#2e6a12']) : A.lg(c, 0, top, 0, y + T, ['#fff08a', '#ff8a1a', '#b02a0a']);
    c.fill();
    if (surf) {
      c.strokeStyle = acid ? '#f0ffc0' : '#fff6c0'; c.lineWidth = 2.5; c.stroke();
      A.glow(c, x + T / 2, top, 40, acid ? 'rgba(170,255,70,0.35)' : 'rgba(255,150,40,0.4)');
      const b = (t * 0.7 + PM.hash(tx, ty)) % 1;
      A.circle(c, x + 10 + PM.hash(tx, 1) * 28, top + 18 - b * 16, 3 * (1 - b) + 1); c.fillStyle = acid ? '#efffb8' : '#ffe07a'; c.fill();
    }
    c.restore();
  }
  function drawGate(c, x, y, k, isTop) {
    if (k <= 0) return;
    c.save();
    c.beginPath(); c.rect(x - 4, y, T + 8, T); c.clip();
    const off = (1 - k) * -T * 4;
    for (let i = 0; i < 4; i++) {
      const bx = x + 6 + i * 11;
      c.fillStyle = OUT; c.fillRect(bx - 1, y + off, 8, T);
      c.fillStyle = '#8a7ea0'; c.fillRect(bx, y + off, 6, T);
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(bx + 1, y + off, 2, T);
    }
    c.fillStyle = OUT; c.fillRect(x, y + T / 2 - 4 + off, T, 8); c.fillStyle = '#6e6282'; c.fillRect(x + 1, y + T / 2 - 3 + off, T - 2, 6);
    c.restore();
  }

  PM.Game = Game;
  PM.Level = Level;
})();
