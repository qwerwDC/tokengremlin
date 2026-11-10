// Звук: чиптюн-музыка и эффекты, всё синтезируется на лету.

class Audio8 {
  constructor() { this.ctx = null; this.musicOn = true; this.sfxOn = true; this.vol = 0.8; this.intensity = 0; }

  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain(); this.master.gain.value = this.vol;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12;
    this.master.connect(comp).connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = 0.26; this.mus.connect(this.master);
    const n = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, n, n);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    if (this.pending) { const p = this.pending; this.pending = null; this.music(p, true); }
  }

  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  fadeOut() { this.stopSynth(); }

  tone(type, f0, f1, dur, vol = 0.3, dest, when = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(dest || this.sfx);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.3, ftype = "bandpass", f = 1500, q = 1, dest, when = 0, f1) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = ftype; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(fl).connect(g).connect(dest || this.sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || !this.sfxOn) return;
    switch (name) {
      case "jump": this.tone("square", 280, 620, 0.12, 0.12); break;
      case "djump": this.tone("square", 420, 900, 0.12, 0.12); break;
      case "land": this.noise(0.06, 0.18, "lowpass", 600); break;
      case "step": this.noise(0.03, 0.06, "highpass", 2500); break;
      case "wall": this.noise(0.05, 0.12, "bandpass", 900, 2); break;
      case "dash": this.noise(0.18, 0.25, "bandpass", 600, 1, null, 0, 3000); break;
      case "slide": this.noise(0.3, 0.12, "bandpass", 1200, 1, null, 0, 500); break;
      case "coin": this.tone("square", 988, 988, 0.06, 0.1); this.tone("square", 1319, 1319, 0.16, 0.1, null, 0.06); break;
      case "box": this.tone("square", 523, 523, 0.06, 0.12); this.tone("square", 659, 659, 0.06, 0.12, null, 0.06); this.tone("square", 784, 784, 0.1, 0.12, null, 0.12); break;
      case "item": this.tone("triangle", 400, 1200, 0.2, 0.2); break;
      case "spring": this.tone("triangle", 200, 900, 0.25, 0.3); break;
      case "boost": this.tone("sawtooth", 300, 1400, 0.3, 0.12); break;
      case "zip": this.noise(0.5, 0.1, "bandpass", 3000, 4); break;
      case "hit": this.noise(0.15, 0.4, "lowpass", 900); this.tone("square", 200, 60, 0.2, 0.2); break;
      case "zap": for (let i = 0; i < 5; i++) this.tone("sawtooth", 800 + Math.random() * 900, 200, 0.06, 0.12, null, i * 0.05); break;
      case "slip": this.tone("sine", 900, 200, 0.4, 0.25); this.noise(0.1, 0.3, "lowpass", 500, 1, null, 0.4); break;
      case "splash": this.noise(0.35, 0.35, "lowpass", 2500, 1, null, 0, 400); break;
      case "boom": this.noise(0.5, 0.6, "lowpass", 1200, 1, null, 0, 80); this.tone("sine", 120, 40, 0.4, 0.4); break;
      case "punch": this.tone("square", 300, 80, 0.15, 0.25); this.noise(0.08, 0.3, "bandpass", 1500); break;
      case "boing": this.tone("sine", 200, 500, 0.15, 0.3); this.tone("sine", 500, 250, 0.2, 0.25, null, 0.15); break;
      case "ink": this.noise(0.25, 0.35, "lowpass", 700, 1, null, 0, 200); break;
      case "magnet": this.tone("sawtooth", 120, 600, 0.4, 0.12); break;
      case "shield": this.tone("triangle", 600, 1200, 0.3, 0.15); break;
      case "block": this.tone("square", 1500, 900, 0.1, 0.15); break;
      case "throw": this.noise(0.12, 0.2, "bandpass", 2000, 1, null, 0, 800); break;
      case "crumble": this.noise(0.25, 0.25, "lowpass", 800); break;
      case "laser": this.tone("sawtooth", 1200, 1100, 0.08, 0.04); break;
      case "fan": this.noise(0.2, 0.08, "bandpass", 400, 1); break;
      case "flag": this.tone("square", 659, 659, 0.08, 0.12); this.tone("square", 880, 880, 0.15, 0.12, null, 0.08); break;
      case "beep": this.tone("square", 440, 440, 0.15, 0.2); break;
      case "go": this.tone("square", 880, 880, 0.35, 0.22); break;
      case "finish": [523, 659, 784, 1047].forEach((f, i) => this.tone("square", f, f, 0.15, 0.15, null, i * 0.1)); break;
      case "win": [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone("square", f, f, 0.18, 0.15, null, i * 0.12)); break;
      case "lose": [392, 370, 349, 330].forEach((f, i) => this.tone("triangle", f, f * 0.98, 0.25, 0.2, null, i * 0.22)); break;
      case "pigeon": this.tone("sine", 700, 500, 0.08, 0.15); this.tone("sine", 650, 450, 0.08, 0.12, null, 0.1); break;
      case "bark": this.noise(0.08, 0.3, "bandpass", 700, 3); this.noise(0.08, 0.3, "bandpass", 700, 3, null, 0.14); break;
      case "granny": this.tone("square", 500, 700, 0.15, 0.08); this.tone("square", 700, 400, 0.2, 0.08, null, 0.15); break;
      case "horn": this.tone("sawtooth", 220, 215, 0.6, 0.18); this.tone("sawtooth", 277, 272, 0.6, 0.14); break;
      case "wind": this.noise(1.0, 0.18, "bandpass", 500, 2, null, 0, 1500); break;
      case "tick": this.tone("square", 1200, 1200, 0.03, 0.06); break;
      case "good": this.tone("square", 880, 1320, 0.08, 0.12); break;
      case "perfect": this.tone("square", 1047, 1047, 0.06, 0.12); this.tone("square", 1568, 1568, 0.08, 0.12, null, 0.05); break;
      case "miss": this.tone("square", 180, 120, 0.12, 0.12); break;
      case "smash": this.noise(0.3, 0.35, "highpass", 2500); this.tone("triangle", 1800, 900, 0.1, 0.1); break;
      case "pop": this.tone("sine", 900, 1400, 0.08, 0.2); this.noise(0.05, 0.2, "highpass", 3000); break;
      case "grow": this.tone("square", 200, 800, 0.5, 0.15); break;
      case "freeze": this.noise(0.4, 0.25, "highpass", 4000, 1, null, 0, 8000); this.tone("sine", 1800, 2400, 0.3, 0.08); break;
      case "slow": this.tone("triangle", 600, 150, 0.8, 0.2); break;
      case "squeak": this.tone("square", 1500, 2200, 0.06, 0.08); this.tone("square", 1800, 1300, 0.08, 0.08, null, 0.07); break;
      case "gem": [1318, 1568, 2093].forEach((f, i) => this.tone("square", f, f, 0.08, 0.08, null, i * 0.05)); break;
      case "skid": this.noise(0.18, 0.15, "bandpass", 2500, 2); break;
      case "gate": this.tone("triangle", 330, 660, 0.25, 0.15); this.tone("triangle", 495, 990, 0.25, 0.12, null, 0.12); break;
      case "thunder": this.noise(1.6, 0.6, "lowpass", 400, 1, null, 0, 60); this.noise(0.2, 0.4, "lowpass", 1500); break;
      case "meow": this.meow(1, 0.5); break;
      case "meowbig": this.meow(0.7, 0.8, true); break;
      case "hiss": this.noise(0.5, 0.35, "highpass", 2500, 1, null, 0, 5000); break;
      case "claw": this.noise(0.09, 0.35, "bandpass", 3500, 2, null, 0, 1200); this.noise(0.09, 0.25, "bandpass", 3000, 2, null, 0.06, 900); break;
      case "whit": this.noise(0.08, 0.45, "lowpass", 1400); this.tone("square", 180, 70, 0.12, 0.25); break;
      case "bighit": this.noise(0.3, 0.6, "lowpass", 900, 1, null, 0, 100); this.tone("sine", 140, 40, 0.35, 0.5); break;
      case "charge": this.tone("sawtooth", 100, 900, 0.6, 0.12); this.noise(0.6, 0.15, "bandpass", 800, 1, null, 0, 4000); break;
      case "laserbig": this.tone("sawtooth", 1200, 300, 0.7, 0.2); this.noise(0.7, 0.3, "bandpass", 2000, 0.6); break;
      case "ko": this.tone("square", 220, 55, 0.9, 0.3); this.noise(0.6, 0.4, "lowpass", 600); break;
      case "round": this.tone("square", 523, 523, 0.12, 0.2); this.tone("square", 784, 784, 0.25, 0.2, null, 0.12); break;
      case "swing": this.noise(0.13, 0.28, "bandpass", 2600, 1.2, null, 0, 900); break;
      case "whoosh": this.noise(0.6, 0.4, "bandpass", 300, 1, null, 0, 3000); break;
      case "engine": this.noise(2.5, 0.35, "lowpass", 200, 1, null, 0, 1800); this.tone("sawtooth", 60, 140, 2.5, 0.12); break;
      case "transform": this.tone("sine", 200, 1600, 1.2, 0.25); this.noise(1.2, 0.25, "bandpass", 500, 1, null, 0, 6000); break;
      case "cheer": for (let i = 0; i < 6; i++) this.noise(0.5, 0.06, "bandpass", 800 + i * 300, 1.5, null, i * 0.05); break;
      case "taunt": this.tone("square", 600, 900, 0.08, 0.1); this.tone("square", 600, 900, 0.08, 0.1, null, 0.12); break;
    }
  }

  blip(who) {
    if (!this.ctx || !this.sfxOn) return;
    if (who === "g") this.tone("square", 900 + Math.random() * 300, 700, 0.04, 0.035);
    else if (who === "o") this.tone("sawtooth", 140 + Math.random() * 30, 110, 0.05, 0.05);
    else if (who === "h") this.tone("triangle", 420 + Math.random() * 120, 380, 0.04, 0.07);
    else this.tone("sine", 600, 600, 0.03, 0.04);
  }

  meow(pitch = 1, vol = 0.4, angry = false) {
    if (!this.ctx || !this.sfxOn) return;
    const c = this.ctx, t = c.currentTime, dur = angry ? 0.8 : 0.45;
    const o = c.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(420 * pitch, t);
    o.frequency.linearRampToValueAtTime((angry ? 760 : 680) * pitch, t + dur * 0.35);
    o.frequency.linearRampToValueAtTime(350 * pitch, t + dur);
    const f1 = c.createBiquadFilter(); f1.type = "bandpass"; f1.Q.value = 4; f1.frequency.setValueAtTime(700, t); f1.frequency.linearRampToValueAtTime(1300, t + dur * 0.4);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f1).connect(g).connect(this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------------- Музыка: три собственные песни, играются нотами по партитуре
  music(style, restart = false) {
    if (style) this.lastStyle = style;
    if (!this.ctx) { this.pending = style; return; }
    if (!this.musicOn || !style || !SONGS[style]) { this.stopMusic(); return; }
    if (this.musicStyle === style && this.timer && !restart) return;
    this.stopSynth();
    const c = this.ctx, song = SONGS[style];
    if (!this.pulse) {
      // «NES»-пульс 25% — звучит как старая приставка
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = (2 * Math.sin(Math.PI * k * 0.25)) / (Math.PI * k);
      this.pulse = c.createPeriodicWave(re, im);
      // эхо для мелодии
      this.echo = c.createDelay(1); this.echo.delayTime.value = 0.3;
      const fb = c.createGain(); fb.gain.value = 0.28;
      const wet = c.createGain(); wet.gain.value = 0.35;
      this.echo.connect(fb).connect(this.echo); this.echo.connect(wet).connect(this.mus);
    }
    const step = 60 / song.bpm / 2; // восьмая
    this.echo.delayTime.value = step * 3;
    const bars = song.chords.length;
    let next = c.currentTime + 0.12, i = 0;
    this.musicStyle = style;
    this.timer = setInterval(() => {
      while (next < c.currentTime + 0.2) {
        const bar = Math.floor(i / 8) % bars, s = i % 8;
        const swing = song.swing && s % 2 ? step * song.swing : 0;
        this.musicStep(song, bar, s, i, next + swing - c.currentTime, step);
        next += step; i++;
      }
    }, 25);
  }

  voice(wave, m, when, dur, vol, echo = false, attack = 0.008) {
    const c = this.ctx, t = c.currentTime + Math.max(0, when);
    const o = c.createOscillator(), g = c.createGain();
    if (wave === "pulse") o.setPeriodicWave(this.pulse); else o.type = wave;
    o.frequency.value = hz(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.mus); if (echo) g.connect(this.echo);
    o.start(t); o.stop(t + dur + 0.03);
  }

  musicStep(song, bar, s, i, when, step) {
    const [root, tri] = chord(song.chords[bar]);
    const lead = song.leadParsed[bar * 8 + s];
    if (lead) this.voice(song.leadWave, lead.m + song.shift, when, step * lead.len * 0.95, song.leadVol, true);
    // вторая мелодия (подголосок) — только в напряжённый момент боя
    if (this.intensity && song.hot && lead) this.voice("triangle", lead.m + song.shift - 12, when, step * lead.len * 0.9, song.leadVol * 0.8);
    const b = song.bass[s];
    if (b === "R") this.voice("triangle", root - 12, when, step * 1.7, 0.42);
    else if (b === "O") this.voice("triangle", root, when, step * 0.9, 0.34);
    else if (b === "5") this.voice("triangle", root - 5, when, step * 1.7, 0.36);
    else if (b === "c") for (const n of tri) this.voice("pulse", root + 12 + n, when, step * 0.6, 0.05);
    if (song.arp && song.arp[s] !== ".") this.voice(song.arpWave || "triangle", root + 12 + tri[+song.arp[s]], when, step * 0.9, song.arpVol || 0.07);
    if (this.intensity && song.hot) for (let h = 0; h < 2; h++) this.voice("pulse", root + 24 + tri[(s * 2 + h) % 3], when + h * step / 2, step * 0.45, 0.035);
    if (song.kick[s] === "x") this.tone("sine", 150, 42, 0.16, song.kickVol || 0.55, this.mus, when);
    if (song.snare[s] === "x") { this.noise(0.13, 0.26, "bandpass", 1900, 0.7, this.mus, when); this.tone("triangle", 230, 160, 0.06, 0.12, this.mus, when); }
    if (song.hat[s] === "x") this.noise(0.035, s % 2 ? 0.05 : 0.08, "highpass", 7500, 1, this.mus, when);
    if (this.intensity && song.hot && s % 2) this.noise(0.03, 0.06, "highpass", 9000, 1, this.mus, when + step / 2);
    if (song.waves && s === 0 && bar % 2 === 0) this.noise(step * 14, 0.07, "lowpass", 300, 0.7, this.mus, when, 1100);
    if (song.crash && s === 0 && bar === 0 && i > 0) this.noise(1.2, 0.12, "highpass", 5000, 1, this.mus, when);
  }

  stopSynth() { clearInterval(this.timer); this.timer = null; this.musicStyle = null; }
  stopMusic() { this.stopSynth(); }
}

// ---------------- Партитуры. Одна «клетка» = восьмая нота, 8 клеток = такт.
// «-» тянуть ноту, «.» пауза. Бас: R корень, O октава, 5 квинта, c аккорд-«ум-па».
const NOTE = { c: 0, "c#": 1, db: 1, d: 2, "d#": 3, eb: 3, e: 4, f: 5, "f#": 6, gb: 6, g: 7, "g#": 8, ab: 8, a: 9, "a#": 10, bb: 10, b: 11 };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
function chord(name) {
  const m = /^([A-G][#b]?)(m?)$/.exec(name);
  const r = NOTE[m[1].toLowerCase()];
  return [48 + (r > 7 ? r - 12 : r), m[2] ? [0, 3, 7] : [0, 4, 7]];
}
function parse(str) {
  const t = str.replace(/\|/g, " ").trim().split(/\s+/), out = new Array(t.length).fill(null);
  for (let i = 0; i < t.length; i++) {
    const m = /^([a-g][#b]?)(\d)$/.exec(t[i]);
    if (!m) continue;
    let len = 1; while (t[i + len] === "-") len++;
    out[i] = { m: 12 * (+m[2] + 1) + NOTE[m[1]], len };
  }
  return out;
}

const SONGS = {
  // Спокойная тема: титры, вступление, кат-сцены
  chill: {
    bpm: 88, swing: 0.2, shift: 0, leadWave: "triangle", leadVol: 0.18,
    chords: "F Am Dm C  Bb F Gm C".split(/\s+/),
    lead: `a5 - c6 - a5 g5 f5 - | e5 - - g5 a5 - e5 - | f5 - a5 - d6 - c6 a5 | g5 - - - e5 - c5 -
           d5 - f5 - bb5 - a5 g5 | a5 - - - f5 - c5 - | bb4 - d5 - g5 - f5 d5 | e5 - - - . . c5 .`,
    bass: "R...5...", arp: "0.1.2.1.", arpVol: 0.05,
    kick: "x.......", snare: "....x...", hat: ".x.x.x.x", kickVol: 0.35,
  },
  // Бег по уровням — бодрая
  run: {
    bpm: 140, shift: 0, leadWave: "pulse", leadVol: 0.1, crash: true,
    chords: "G Em C D  G Em C D  Em C G D  Em C D D".split(/\s+/),
    lead: `g5 . b5 d6 b5 . g5 . | e5 . g5 b5 a5 g5 e5 . | c5 - e5 g5 c6 - b5 a5 | a5 - f#5 - d5 - - .
           g5 . b5 d6 g6 - d6 b5 | e6 - d6 b5 g5 - e5 g5 | a5 - g5 e5 c5 - e5 g5 | f#5 - a5 - d6 - - .
           b5 - - e6 d6 - b5 -  | c6 - - g5 e5 - c5 -   | d6 - b5 - g5 - b5 d6  | c6 - a5 - f#5 - a5 -
           e5 g5 b5 e6 - d6 b5 g5 | c5 e5 g5 c6 - b5 a5 g5 | a5 - - - f#5 - d5 - | d5 . f#5 . a5 . d6 .`,
    bass: "R.O.R.O.", arp: "0.1.2.1.", arpVol: 0.035,
    kick: "x...x.x.", snare: "..x...x.", hat: "xxxxxxxx",
  },
  // Босс OMNI
  boss: {
    bpm: 160, shift: -12, leadWave: "pulse", leadVol: 0.13, hot: true, crash: true,
    chords: "Dm Dm Bb C  Dm Dm Gm A  Bb C Dm Dm  Gm A Dm A".split(/\s+/),
    lead: `d5 . d5 f5 a5 . g5 f5 | e5 . d5 e5 f5 - a5 - | bb5 . a5 g5 f5 . g5 a5 | g5 - e5 - c5 - e5 -
           d5 . d5 f5 a5 . d6 c6 | a5 . f5 a5 d6 - e6 f6 | d6 . c6 bb5 a5 . g5 f5 | e5 - c#5 - a4 - - -
           f5 - bb5 - d6 - c6 bb5 | g5 - c6 - e6 - d6 c6 | a5 - d6 - f6 - e6 d6 | a5 . a5 . d6 . a5 .
           bb5 - d6 - g6 - d6 bb5 | c#6 - e6 - a6 - e6 c#6 | d6 - a5 - f5 - a5 - | c#6 . e6 . a6 - . .`,
    bass: "RORORORO",
    kick: "x..xx...", snare: "..x...x.", hat: "xxxxxxxx",
  },
  // Финал — фанфары
  ending: {
    bpm: 128, shift: -12, leadWave: "pulse", leadVol: 0.14, crash: true,
    chords: "C F G C  Am F G G".split(/\s+/),
    lead: `c5 - e5 g5 c6 - g5 - | a5 - f5 a5 c6 - a5 - | b5 - g5 b5 d6 - b5 g5 | c6 - - - g5 . c6 .
           e6 - c6 a5 e5 - a5 c6 | f6 - c6 a5 f5 - a5 c6 | d6 - b5 g5 d6 - e6 f6 | g6 - - - . . g5 .`,
    bass: "R.c.5.c.",
    kick: "x...x...", snare: "..x...x.", hat: "x.x.x.x.", kickVol: 0.45,
  },
};
for (const k in SONGS) {
  const s = SONGS[k];
  s.leadParsed = parse(s.lead);
  if (s.leadParsed.length !== s.chords.length * 8) console.warn("song", k, s.leadParsed.length, s.chords.length * 8);
}

export const audio = new Audio8();
