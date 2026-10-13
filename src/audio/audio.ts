// Procedural music and sound effects with WebAudio. No audio files.

type Mood = { root: number; scale: number[]; prog: number[][]; bpm: number; pad: number; arp: number; bass: number; perc: number; wave: OscillatorType };

const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];
const DOR = [0, 2, 3, 5, 7, 9, 10];

const MOODS: Record<string, Mood> = {
  village: { root: 60, scale: MAJ, prog: [[0, 2, 4], [3, 5, 0], [5, 0, 2], [4, 6, 1]], bpm: 92, pad: 0.05, arp: 0.06, bass: 0.07, perc: 0.0, wave: 'triangle' },
  wonder: { root: 62, scale: MAJ, prog: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]], bpm: 70, pad: 0.06, arp: 0.05, bass: 0.05, perc: 0, wave: 'sine' },
  mystery: { root: 57, scale: DOR, prog: [[0, 2, 4], [6, 1, 3], [3, 5, 0], [4, 6, 1]], bpm: 66, pad: 0.06, arp: 0.04, bass: 0.06, perc: 0, wave: 'sine' },
  tension: { root: 55, scale: MIN, prog: [[0, 2, 4], [5, 0, 2], [0, 2, 4], [6, 1, 3]], bpm: 100, pad: 0.05, arp: 0.045, bass: 0.09, perc: 0.04, wave: 'sawtooth' },
  action: { root: 57, scale: MIN, prog: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]], bpm: 138, pad: 0.04, arp: 0.05, bass: 0.1, perc: 0.08, wave: 'square' },
  sad: { root: 58, scale: MIN, prog: [[0, 2, 4], [3, 5, 0], [5, 0, 2], [4, 6, 1]], bpm: 60, pad: 0.06, arp: 0.035, bass: 0.05, perc: 0, wave: 'sine' },
  triumph: { root: 60, scale: MAJ, prog: [[0, 2, 4], [4, 6, 1], [5, 0, 2], [3, 5, 0]], bpm: 112, pad: 0.06, arp: 0.06, bass: 0.09, perc: 0.05, wave: 'triangle' },
  night: { root: 59, scale: DOR, prog: [[0, 2, 4], [3, 5, 0], [0, 2, 4], [4, 6, 1]], bpm: 72, pad: 0.05, arp: 0.04, bass: 0.04, perc: 0, wave: 'triangle' },
  cave: { root: 52, scale: MIN, prog: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [6, 1, 3]], bpm: 84, pad: 0.06, arp: 0.035, bass: 0.08, perc: 0.03, wave: 'triangle' },
  void: { root: 54, scale: [0, 1, 3, 5, 7, 8, 10], prog: [[0, 2, 4], [1, 3, 5], [5, 0, 2], [6, 1, 3]], bpm: 76, pad: 0.07, arp: 0.04, bass: 0.07, perc: 0.02, wave: 'sawtooth' },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  mood: string = 'none';
  nextTime = 0;
  step = 0;
  timer: number | null = null;
  musicVol = 0.5;
  sfxVol = 0.7;
  noiseBuf: AudioBuffer | null = null;

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    } catch { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.gain.value = this.musicVol;
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxVol;
    // a simple feedback delay as "reverb" on music
    const delay = c.createDelay(1); delay.delayTime.value = 0.32;
    const fb = c.createGain(); fb.gain.value = 0.32;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    this.musicBus.connect(this.master);
    this.musicBus.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(this.master);
    this.sfxBus.connect(this.master);
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  setVolumes(music: number, sfx: number) {
    this.musicVol = music; this.sfxVol = sfx;
    if (this.ctx) {
      this.musicBus.gain.setTargetAtTime(music, this.ctx.currentTime, 0.1);
      this.sfxBus.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
    }
  }

  play(mood: string) {
    if (mood === this.mood) return;
    this.mood = mood;
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.1;
  }

  private schedule() {
    const c = this.ctx;
    if (!c || this.mood === 'none' || !MOODS[this.mood]) return;
    const m = MOODS[this.mood];
    const stepDur = 60 / m.bpm / 2; // eighth notes
    if (this.nextTime < c.currentTime) this.nextTime = c.currentTime + 0.05;
    while (this.nextTime < c.currentTime + 0.25) {
      this.playStep(m, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private deg(m: Mood, d: number, oct = 0) {
    const n = m.scale.length;
    const o = Math.floor(d / n);
    return m.root + m.scale[((d % n) + n) % n] + 12 * (o + oct);
  }

  private playStep(m: Mood, step: number, t: number, sd: number) {
    const bar = Math.floor(step / 8) % m.prog.length;
    const chord = m.prog[bar];
    const s = step % 8;
    if (s === 0) {
      for (const d of chord) this.tone(mtof(this.deg(m, d)), t, sd * 8, m.pad, 'sine', 0.6, sd * 3);
      this.tone(mtof(this.deg(m, chord[0], -2)), t, sd * 3.5, m.bass, 'triangle', 0.02, 0.3);
    }
    if (s === 4 && m.bass) this.tone(mtof(this.deg(m, chord[m.perc ? 0 : 2], -2)), t, sd * 3, m.bass * 0.8, 'triangle', 0.02, 0.3);
    if (m.perc && m.bpm > 120 && s % 2 === 1) this.tone(mtof(this.deg(m, chord[0], -2)), t, sd * 0.9, m.bass * 0.6, 'triangle', 0.01, 0.1);
    // arpeggio with some seeded variation
    const pattern = [0, 1, 2, 1, 2, 0, 1, 2];
    const rnd = Math.sin(step * 12.9898 + bar * 78.233) * 43758.5453 % 1;
    if (Math.abs(rnd) > (m.bpm < 80 ? 0.45 : 0.15)) {
      const d = chord[pattern[s]] + (s >= 4 ? 7 : 0);
      this.tone(mtof(this.deg(m, d, 1)), t, sd * 1.6, m.arp, m.wave === 'sawtooth' || m.wave === 'square' ? 'triangle' : m.wave, 0.005, sd * 1.2);
    }
    if (m.perc) {
      if (s === 0 || s === 4) this.kick(t, m.perc * 2.2);
      if (s === 2 || s === 6) this.hat(t, m.perc);
      if (m.bpm > 120 && s % 2 === 1) this.hat(t, m.perc * 0.5);
    }
  }

  private tone(f: number, t: number, dur: number, vol: number, type: OscillatorType, att = 0.01, rel = 0.2, bus?: GainNode) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.setTargetAtTime(0, t + Math.max(att, dur - rel), rel / 3 + 0.01);
    o.connect(g); g.connect(bus ?? this.musicBus);
    o.start(t); o.stop(t + dur + rel + 0.2);
  }
  private kick(t: number, vol: number) {
    const c = this.ctx!;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.25);
  }
  private hat(t: number, vol: number, bus?: GainNode) {
    const c = this.ctx!;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(bus ?? this.musicBus); s.start(t); s.stop(t + 0.06);
  }
  private noise(t: number, dur: number, vol: number, freq: number, type: BiquadFilterType = 'lowpass', sweepTo?: number) {
    const c = this.ctx!;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t); s.stop(t + dur + 0.05);
  }

  sfx(name: string, pitch = 1) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + 0.01;
    const b = this.sfxBus;
    switch (name) {
      case 'blip': this.tone(320 * pitch * (0.95 + Math.random() * 0.1), t, 0.04, 0.05, 'square', 0.002, 0.02, b); break;
      case 'select': this.tone(660, t, 0.06, 0.12, 'triangle', 0.003, 0.05, b); this.tone(990, t + 0.06, 0.08, 0.1, 'triangle', 0.003, 0.06, b); break;
      case 'hover': this.tone(520, t, 0.03, 0.05, 'triangle', 0.002, 0.02, b); break;
      case 'remember': for (const [i, f] of [523, 659, 784].entries()) this.tone(f, t + i * 0.08, 0.3, 0.08, 'sine', 0.01, 0.25, b); break;
      case 'tick': this.tone(1200, t, 0.02, 0.05, 'square', 0.001, 0.01, b); break;
      case 'qte': this.tone(880, t, 0.08, 0.12, 'square', 0.002, 0.05, b); break;
      case 'ok': this.tone(784, t, 0.08, 0.12, 'triangle', 0.003, 0.05, b); this.tone(1175, t + 0.07, 0.12, 0.12, 'triangle', 0.003, 0.08, b); break;
      case 'fail': this.tone(220, t, 0.25, 0.15, 'sawtooth', 0.005, 0.2, b); this.tone(165, t + 0.12, 0.35, 0.15, 'sawtooth', 0.005, 0.3, b); break;
      case 'hit': this.noise(t, 0.18, 0.5, 900, 'lowpass', 200); this.tone(110, t, 0.12, 0.25, 'square', 0.002, 0.1, b); break;
      case 'swing': this.noise(t, 0.2, 0.25, 600, 'bandpass', 2400); break;
      case 'whoosh': this.noise(t, 0.6, 0.3, 300, 'bandpass', 1800); break;
      case 'break': this.noise(t, 0.25, 0.4, 2000, 'lowpass', 300); this.tone(90, t, 0.1, 0.2, 'square', 0.001, 0.08, b); break;
      case 'place': this.noise(t, 0.08, 0.35, 1200, 'lowpass', 400); break;
      case 'step': this.noise(t, 0.05, 0.12, 700, 'lowpass', 300); break;
      case 'craft': for (const [i, f] of [392, 523, 659, 784].entries()) this.tone(f, t + i * 0.06, 0.2, 0.1, 'triangle', 0.003, 0.15, b); break;
      case 'item': this.tone(880, t, 0.08, 0.1, 'sine', 0.003, 0.08, b); this.tone(1320, t + 0.08, 0.15, 0.1, 'sine', 0.003, 0.12, b); break;
      case 'bark': this.tone(520, t, 0.07, 0.18, 'sawtooth', 0.002, 0.05, b); this.tone(380, t + 0.03, 0.08, 0.15, 'square', 0.002, 0.05, b); break;
      case 'rumble': this.noise(t, 1.6, 0.6, 140, 'lowpass', 60); break;
      case 'fray': this.noise(t, 1.2, 0.25, 3000, 'bandpass', 600); this.tone(1400, t, 1.0, 0.04, 'sine', 0.3, 0.6, b); this.tone(1480, t, 1.0, 0.04, 'sine', 0.3, 0.6, b); break;
      case 'gloam': this.tone(140, t, 0.4, 0.15, 'sawtooth', 0.02, 0.3, b); this.tone(147, t, 0.4, 0.12, 'sawtooth', 0.02, 0.3, b); break;
      case 'chime': for (const [i, f] of [784, 988, 1175, 1568].entries()) this.tone(f, t + i * 0.1, 0.5, 0.07, 'sine', 0.01, 0.4, b); break;
      case 'splash': this.noise(t, 0.5, 0.4, 1800, 'lowpass', 300); break;
      case 'door': this.noise(t, 0.3, 0.25, 500, 'lowpass', 200); this.tone(180, t, 0.2, 0.1, 'triangle', 0.01, 0.1, b); break;
      case 'beacon': for (const [i, f] of [262, 392, 523, 784, 1047].entries()) this.tone(f, t + i * 0.12, 1.6, 0.07, 'sine', 0.05, 1.2, b); break;
      case 'powerdown': { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(40, t + 1.5); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.6); o.connect(g); g.connect(b); o.start(t); o.stop(t + 1.7); break; }
      case 'thud': this.tone(70, t, 0.3, 0.4, 'sine', 0.002, 0.25, b); this.noise(t, 0.15, 0.3, 400, 'lowpass', 100); break;
      case 'cheer': this.noise(t, 1.2, 0.18, 1500, 'bandpass', 2500); for (let i = 0; i < 6; i++) this.tone(600 + Math.random() * 600, t + Math.random() * 0.6, 0.2, 0.03, 'triangle', 0.01, 0.15, b); break;
      case 'drip': this.tone(1400, t, 0.06, 0.08, 'sine', 0.002, 0.05, b); break;
      case 'mash': this.tone(500 + Math.random() * 200, t, 0.04, 0.08, 'square', 0.001, 0.03, b); break;
      case 'heart': this.tone(60, t, 0.12, 0.3, 'sine', 0.005, 0.1, b); this.tone(60, t + 0.18, 0.12, 0.25, 'sine', 0.005, 0.1, b); break;
    }
  }
}

export const audio = new Audio();
