'use strict';
/* Pizzeria on Mars — music & sound effects, all synthesized with WebAudio */
(function () {
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) return null;
    let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return n + (parseInt(m[3], 10) + 1) * 12;
  }
  const freq = n => 440 * Math.pow(2, (n - 69) / 12);
  const QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus: [0, 5, 7] };
  function chord(name) {
    const m = /^([A-G][#b]?)(.*)$/.exec(name);
    const root = midi(m[1] + '3');
    return { root, tones: (QUAL[m[2]] || QUAL['']).map(i => root + i) };
  }
  function parseBars(bars) {
    return bars.map(b => {
      const tk = b.trim().split(/\s+/);
      while (tk.length < 16) tk.push('.');
      return tk.slice(0, 16);
    });
  }

  /* --- songs --- */
  const SONGS = {
    menu: {
      bpm: 92, swing: 0, chords: ['Fmaj7', 'Em7', 'Dm7', 'C', 'Fmaj7', 'Em7', 'Dm7', 'G'],
      lead: parseBars([
        'A5 - - - - - G5 - E5 - - - - - - -',
        'G5 - - - - - E5 - B4 - - - - - - -',
        'F5 - - - E5 - D5 - A5 - - - - - - -',
        'G5 - - - - - - - . . . . . . . .',
        'C6 - - - B5 - A5 - G5 - - - A5 - - -',
        'B5 - - - G5 - - - E5 - - - . . . .',
        'A5 - - - F5 - D5 - F5 - A5 - D6 - - -',
        'B5 - - - - - - - - - - - . . . .'
      ]),
      leadWave: 'triangle', leadVol: 0.16, pad: true, arp: 'slow', bass: 'whole', drums: null, delay: 0.32
    },
    map: {
      bpm: 118, chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
      lead: parseBars([
        'C5 . E5 . G5 . E5 . C6 - - - G5 - . .',
        'B4 . D5 . G5 . D5 . B5 - - - G5 - . .',
        'A4 . C5 . E5 . C5 . A5 - - - E5 - . .',
        'F5 - G5 - A5 - C6 - B5 - A5 - G5 - - -',
        'E5 . G5 . C6 . G5 . E6 - - - D6 - C6 -',
        'D6 - - - B5 - G5 - D5 - G5 - B5 - - -',
        'C6 - A5 - F5 - A5 - C6 - D6 - C6 - A5 -',
        'B5 - - - G5 - - - D5 - - - . . . .'
      ]),
      leadWave: 'pulse', leadVol: 0.12, arp: 'eighth', bass: 'bounce',
      drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' }, delay: 0.2
    },
    level: {
      bpm: 140, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
      lead: parseBars([
        'E5 - . A5 - . C6 - B5 - A5 - G5 - E5 -',
        'F5 - . A5 - . C6 - . A5 - G5 - F5 - -',
        'E5 - G5 - C6 - . G5 E5 - G5 - C6 - D6 -',
        'D6 - - - B5 - G5 - D5 - G5 - B5 - - -',
        'A5 - . A5 G5 - E5 - . E5 G5 - A5 - C6 -',
        'C6 - A5 - F5 - A5 - C6 - D6 - C6 - A5 -',
        'G5 - E5 - G5 - C6 - E6 - D6 - C6 - G5 -',
        'B5 - - - D6 - - - B5 - G5 - . . . .'
      ]),
      leadWave: 'pulse', leadVol: 0.11, arp: 'sixteenth', bass: 'octave',
      drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx' }, delay: 0.18
    },
    cave: {
      bpm: 112, chords: ['Em', 'C', 'D', 'Bm', 'Em', 'C', 'Am', 'B'],
      lead: parseBars([
        'E5 - - G5 - - B5 - - - A5 - G5 - F#5 -',
        'E5 - - - - - . . G5 - E5 - C5 - - -',
        'F#5 - - A5 - - D6 - - - C6 - B5 - A5 -',
        'B5 - - - - - - - F#5 - - - D5 - - -',
        'E5 - - G5 - - B5 - - - A5 - G5 - B5 -',
        'C6 - - - B5 - G5 - E5 - - - G5 - - -',
        'A5 - - - C6 - - - E6 - - - D6 - C6 -',
        'B5 - - - - - - - D#5 - - - F#5 - - -'
      ]),
      leadWave: 'square', leadVol: 0.09, arp: 'sixteenth', bass: 'pulse8', pad: true,
      drums: { k: 'x.......x..x....', s: '....x.......x...', h: '..x...x...x...x.' }, delay: 0.3
    },
    boss: {
      bpm: 158, chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'],
      lead: parseBars([
        'D5 - D5 . F5 - D5 . A5 - G5 - F5 - E5 -',
        'D5 - D5 . F5 - D5 . C6 - A5 - F5 - A5 -',
        'Bb5 - - - A5 - - - F5 - - - D5 - - -',
        'E5 - - - G5 - - - C6 - - - E5 - - -',
        'D5 - D5 . F5 - D5 . A5 - G5 - F5 - E5 -',
        'D6 - C6 - A5 - F5 - D5 - F5 - A5 - D6 -',
        'G5 - Bb5 - D6 - Bb5 - G5 - D5 - G5 - Bb5 -',
        'A5 - - - C#6 - - - E6 - - - A5 - - -'
      ]),
      leadWave: 'sawtooth', leadVol: 0.07, arp: 'sixteenth', bass: 'driving',
      drums: { k: 'x...x...x...x.x.', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx' }, delay: 0.12
    }
  };

  const AU = PM.audio = {
    ctx: null, master: null, musicGain: null, sfxGain: null, current: null, wanted: null,
    timer: null, step: 0, nextTime: 0, noiseBuf: null, pulseWave: null,
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { this.ctx = new AC(); } catch (e) { return; }
        const c = this.ctx;
        this.master = c.createGain(); this.master.gain.value = 0.9;
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 4;
        this.master.connect(comp); comp.connect(c.destination);
        this.musicGain = c.createGain(); this.musicGain.connect(this.master);
        this.sfxGain = c.createGain(); this.sfxGain.connect(this.master);
        // delay bus for lead
        this.delay = c.createDelay(1); this.delay.delayTime.value = 0.3;
        this.delayFb = c.createGain(); this.delayFb.gain.value = 0.3;
        this.delayWet = c.createGain(); this.delayWet.gain.value = 0.25;
        this.delay.connect(this.delayFb); this.delayFb.connect(this.delay);
        this.delay.connect(this.delayWet); this.delayWet.connect(this.musicGain);
        // noise
        const len = c.sampleRate;
        this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        // 25% pulse
        const N = 32, re = new Float32Array(N), im = new Float32Array(N);
        for (let k = 1; k < N; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25) * 1.0;
        this.pulseWave = c.createPeriodicWave(re, im);
        this.applyVolumes();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.wanted && this.current !== this.wanted) this.play(this.wanted, true);
    },
    applyVolumes() {
      if (!this.ctx) return;
      const s = PM.save.data, t = this.ctx.currentTime;
      this.musicGain.gain.setTargetAtTime(s.music * 0.7, t, 0.05);
      this.sfxGain.gain.setTargetAtTime(s.sfx, t, 0.02);
    },
    play(name, force) {
      this.wanted = name;
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (this.current === name && !force) return;
      this.stop();
      const song = SONGS[name];
      if (!song) return;
      this.current = name;
      this.song = song;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.08;
      this.delay.delayTime.value = (60 / song.bpm) * 0.75;
      this.delayWet.gain.value = song.delay || 0.2;
      this.songOut = this.ctx.createGain();
      this.songOut.gain.value = 0;
      this.songOut.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.6);
      this.songOut.connect(this.musicGain);
      this.timer = setInterval(() => this.schedule(), 25);
    },
    stop() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      if (this.songOut && this.ctx) {
        const g = this.songOut, t = this.ctx.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + 0.25);
        setTimeout(() => { try { g.disconnect(); } catch (e) { /* ignore */ } }, 400);
      }
      this.songOut = null;
      this.current = null;
    },
    silence() { this.wanted = null; this.stop(); },
    schedule() {
      const c = this.ctx, song = this.song;
      if (!song || !this.songOut) return;
      const stepDur = 60 / song.bpm / 4;
      while (this.nextTime < c.currentTime + 0.12) {
        this.playStep(this.step, this.nextTime, stepDur);
        this.nextTime += stepDur;
        this.step++;
      }
    },
    playStep(step, t, sd) {
      const s = this.song, out = this.songOut;
      const bars = s.lead.length;
      const bar = Math.floor(step / 16) % bars, i = step % 16;
      const ch = chord(s.chords[bar % s.chords.length]);
      // lead
      const tok = s.lead[bar][i];
      if (tok !== '.' && tok !== '-') {
        let len = 1;
        while (i + len < 16 && s.lead[bar][i + len] === '-') len++;
        const n = midi(tok);
        if (n) this.tone(out, s.leadWave, freq(n), t, len * sd * 0.95, s.leadVol, { vib: len > 2, toDelay: true, cutoff: 3200 });
      }
      // pad
      if (s.pad && i === 0) ch.tones.forEach(n => this.tone(out, 'sawtooth', freq(n + 12), t, sd * 16, 0.025, { attack: 0.5, cutoff: 900, detune: 7 }));
      // arp
      if (s.arp) {
        const div = s.arp === 'slow' ? 4 : s.arp === 'eighth' ? 2 : 1;
        if (i % div === 0) {
          const k = (i / div) % ch.tones.length;
          const n = ch.tones[(i / div) % 2 === 0 ? k : ch.tones.length - 1 - k] + 24;
          this.tone(out, s.arp === 'slow' ? 'triangle' : 'square', freq(n), t, sd * div * 0.6, s.arp === 'slow' ? 0.05 : 0.028, { cutoff: 2400 });
        }
      }
      // bass
      const r = ch.root - 12;
      switch (s.bass) {
        case 'whole': if (i === 0) this.tone(out, 'triangle', freq(r), t, sd * 15, 0.2, { attack: 0.05 }); break;
        case 'bounce': if (i % 4 === 0) this.tone(out, 'triangle', freq(i % 8 === 0 ? r : r + 7), t, sd * 2.5, 0.24); break;
        case 'octave': if (i % 2 === 0) this.tone(out, 'triangle', freq(i % 4 === 0 ? r : r + 12), t, sd * 1.6, 0.24); break;
        case 'pulse8': if (i % 2 === 0) this.tone(out, 'sawtooth', freq(r), t, sd * 1.4, 0.07, { cutoff: 500 }); break;
        case 'driving': this.tone(out, 'sawtooth', freq(i % 8 === 6 ? r + 12 : r), t, sd * 0.85, 0.075, { cutoff: 700 }); break;
      }
      // drums
      if (s.drums) {
        if (s.drums.k[i] === 'x') this.kick(out, t, 0.5);
        if (s.drums.s[i] === 'x') this.snare(out, t, 0.22);
        if (s.drums.h[i] === 'x') this.hat(out, t, i % 4 === 2 ? 0.09 : 0.05);
      }
    },
    tone(out, wave, f, t, dur, vol, o = {}) {
      const c = this.ctx;
      const osc = c.createOscillator();
      if (wave === 'pulse') osc.setPeriodicWave(this.pulseWave); else osc.type = wave;
      osc.frequency.setValueAtTime(f, t);
      if (o.detune) osc.detune.value = (Math.random() - 0.5) * o.detune * 2;
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.slide), t + dur);
      if (o.vib) {
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(dur, 0.4));
        lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
      }
      const g = c.createGain();
      const a = o.attack || 0.008;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + a);
      g.gain.setValueAtTime(vol, t + Math.max(a, dur - 0.04));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
      let node = osc;
      if (o.cutoff) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.cutoff; node.connect(f2); node = f2; }
      node.connect(g); g.connect(out);
      if (o.toDelay) g.connect(this.delay);
      osc.start(t); osc.stop(t + dur + 0.12);
    },
    noise(out, t, dur, vol, type, fr, q = 1) {
      const c = this.ctx;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = fr; f.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
      return f;
    },
    kick(out, t, vol) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
    },
    snare(out, t, vol) { this.noise(out, t, 0.16, vol, 'bandpass', 1800, 0.8); this.tone(out, 'triangle', 190, t, 0.05, vol * 0.6); },
    hat(out, t, vol) { this.noise(out, t, 0.04, vol, 'highpass', 7000); },

    /* --- sfx --- */
    sfx(name) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const c = this.ctx, t = c.currentTime + 0.005, o = this.sfxGain;
      const T = (w, f, d, v, op) => this.tone(o, w, f, t + ((op && op.at) || 0), d, v, op);
      switch (name) {
        case 'jump': T('square', 330, 0.14, 0.13, { slide: 2.2, cutoff: 3000 }); break;
        case 'bigjump': T('square', 220, 0.35, 0.14, { slide: 4, cutoff: 3000 }); T('triangle', 440, 0.3, 0.1, { slide: 3 }); break;
        case 'coin': T('square', 988, 0.06, 0.1, { cutoff: 5000 }); T('square', 1319, 0.18, 0.1, { at: 0.06, cutoff: 5000 }); break;
        case 'slice': [784, 988, 1175, 1568].forEach((f, i) => T('triangle', f, 0.09, 0.14, { at: i * 0.04 })); break;
        case 'heal': [523, 659, 784, 1047].forEach((f, i) => T('triangle', f, 0.14, 0.16, { at: i * 0.07 })); break;
        case 'power': for (let i = 0; i < 8; i++) T('square', 330 * Math.pow(1.19, i), 0.07, 0.08, { at: i * 0.045, cutoff: 4000 }); break;
        case 'stomp': T('square', 520, 0.12, 0.16, { slide: 0.3 }); this.noise(o, t, 0.1, 0.25, 'lowpass', 1200); break;
        case 'hurt': T('sawtooth', 440, 0.35, 0.16, { slide: 0.3, cutoff: 1800 }); this.noise(o, t, 0.2, 0.15, 'bandpass', 600); break;
        case 'bump': T('triangle', 140, 0.1, 0.25, { slide: 0.6 }); break;
        case 'break': this.noise(o, t, 0.3, 0.4, 'lowpass', 900); T('square', 160, 0.12, 0.12, { slide: 0.5 }); break;
        case 'box': T('square', 523, 0.08, 0.1); T('square', 784, 0.12, 0.1, { at: 0.07 }); break;
        case 'bounce': T('sine', 180, 0.35, 0.3, { slide: 4 }); T('square', 360, 0.2, 0.06, { slide: 3, cutoff: 2000 }); break;
        case 'checkpoint': [659, 784, 1047].forEach((f, i) => T('pulse', f, 0.12, 0.12, { at: i * 0.08 })); break;
        case 'laser': T('sawtooth', 900, 0.12, 0.04, { slide: 0.5, cutoff: 3000 }); break;
        case 'shoot': T('square', 880, 0.1, 0.06, { slide: 0.4 }); break;
        case 'throw': this.noise(o, t, 0.15, 0.15, 'bandpass', 2500, 2); T('triangle', 600, 0.12, 0.08, { slide: 1.5 }); break;
        case 'thud': this.kick(o, t, 0.8); this.noise(o, t, 0.35, 0.35, 'lowpass', 400); break;
        case 'roar': T('sawtooth', 110, 0.9, 0.18, { slide: 0.6, cutoff: 900 }); T('sawtooth', 116, 0.9, 0.14, { slide: 0.55, cutoff: 700 }); break;
        case 'bosshit': T('square', 300, 0.25, 0.2, { slide: 0.4 }); this.noise(o, t, 0.25, 0.3, 'bandpass', 1500); break;
        case 'explode': this.noise(o, t, 1.2, 0.6, 'lowpass', 700); this.kick(o, t, 1); this.kick(o, t + 0.2, 0.7); break;
        case 'select': T('square', 660, 0.05, 0.07, { cutoff: 3000 }); break;
        case 'click': T('square', 880, 0.05, 0.09, { cutoff: 4000 }); T('square', 1320, 0.07, 0.07, { at: 0.04, cutoff: 4000 }); break;
        case 'step': T('triangle', 523, 0.06, 0.08); break;
        case 'fall': T('square', 600, 0.6, 0.1, { slide: 0.15, cutoff: 2000 }); break;
        case 'door': [392, 523, 659, 784, 1047].forEach((f, i) => T('pulse', f, 0.12, 0.1, { at: i * 0.06 })); break;
        case 'win': {
          const seq = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [988, 0.6], [1047, 0.72], [1319, 0.84]];
          seq.forEach(([f, a]) => T('pulse', f, 0.16, 0.13, { at: a }));
          [523, 659, 784].forEach(f => T('triangle', f, 1.0, 0.08, { at: 0.84 }));
          this.kick(o, t, 0.4); this.kick(o, t + 0.84, 0.5);
          break;
        }
        case 'lose': [[494, 0], [466, 0.25], [440, 0.5], [415, 0.75]].forEach(([f, a]) => T('square', f, a === 0.75 ? 0.8 : 0.22, 0.1, { at: a, cutoff: 1800, vib: a === 0.75 })); break;
        case 'star': T('triangle', 1047, 0.12, 0.14); T('triangle', 1568, 0.25, 0.12, { at: 0.08 }); break;
        case 'gate': this.noise(o, t, 0.5, 0.35, 'lowpass', 300); T('square', 80, 0.4, 0.12, { slide: 0.6 }); break;
      }
    }
  };
})();
