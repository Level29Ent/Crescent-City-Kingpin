import type { SfxName } from './world.ts';
export type AudioSettings = { music: number; ambient: number; sfx: number; muted: boolean };
// Procedural audio: no unavailable external clips, one context and three independent volume buses.
export class AudioController {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: Record<'music' | 'ambient' | 'sfx', GainNode>;
  private settings: AudioSettings = { music: .35, ambient: .35, sfx: .7, muted: false };
  private noise!: AudioBuffer;
  private engineOsc!: OscillatorNode;
  private engineGain!: GainNode;
  private ambience!: BiquadFilterNode;
  private sirenWanted = false;
  private beat = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(signal: AbortSignal) { signal.addEventListener('abort', () => this.dispose(), { once: true }); }
  start() {
    if (this.ctx) { void this.ctx.resume(); return; }
    try { this.ctx = new AudioContext(); } catch { return; }
    const c = this.ctx;
    const limiter = c.createDynamicsCompressor();
    this.master = c.createGain(); this.master.connect(limiter).connect(c.destination);
    this.buses = { music: c.createGain(), ambient: c.createGain(), sfx: c.createGain() };
    Object.values(this.buses).forEach(g => g.connect(this.master));
    this.configure(this.settings);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const street = c.createBufferSource(); street.buffer = this.noise; street.loop = true;
    this.ambience = c.createBiquadFilter(); this.ambience.type = 'lowpass'; this.ambience.frequency.value = 450;
    const ambientGain = c.createGain(); ambientGain.gain.value = .09;
    street.connect(this.ambience).connect(ambientGain).connect(this.buses.ambient); street.start();
    this.engineOsc = c.createOscillator(); this.engineOsc.type = 'sawtooth';
    this.engineGain = c.createGain(); this.engineGain.gain.value = 0;
    const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 450;
    this.engineOsc.connect(filter).connect(this.engineGain).connect(this.buses.sfx); this.engineOsc.start();
    // Sparse jazz-like bass and chord voicings; interval is disposed on page teardown.
    this.timer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const notes = [130.81, 155.56, 196, 233.08, 174.61, 207.65, 261.63, 311.13];
      const root = notes[this.beat % notes.length]!;
      this.tone(this.buses.music, root / 2, root / 2, .32, .12, 'triangle');
      if (this.beat % 2 === 0) [1, 1.25, 1.5].forEach(v => this.tone(this.buses.music, root * v, root * v, .65, .025, 'sine'));
      if (this.sirenWanted) this.tone(this.buses.sfx, this.beat % 2 ? 660 : 880, this.beat % 2 ? 880 : 660, .35, .1, 'sine');
      if (this.beat % 8 === 0 && this.ambience.frequency.value > 700) this.tone(this.buses.ambient, 1800, 1200, .15, .025, 'sine');
      this.beat++;
    }, 450);
    void c.resume();
  }
  configure(settings: AudioSettings) {
    this.settings = { ...settings };
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(settings.muted ? 0 : .8, this.ctx.currentTime, .05);
    for (const key of ['music', 'ambient', 'sfx'] as const) this.buses[key].gain.setTargetAtTime(Math.max(0, Math.min(1, settings[key])), this.ctx.currentTime, .05);
  }
  environment(bayou: boolean, rain = false) { if (this.ctx && this.ambience) this.ambience.frequency.setTargetAtTime(rain ? 1800 : bayou ? 1000 : 450, this.ctx.currentTime, 1); }
  engine(speed: number | null) {
    if (!this.ctx) return;
    this.engineGain.gain.setTargetAtTime(speed === null ? 0 : .04 + Math.min(1, speed) * .1, this.ctx.currentTime, .12);
    this.engineOsc.frequency.setTargetAtTime(38 + (speed ?? 0) * 110, this.ctx.currentTime, .1);
  }
  siren(on: boolean) { this.sirenWanted = on; }
  private tone(out: AudioNode, from: number, to: number, duration: number, volume: number, shape: OscillatorType) {
    const c = this.ctx!; const t = c.currentTime;
    const oscillator = c.createOscillator(); oscillator.type = shape;
    oscillator.frequency.setValueAtTime(from, t); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
    const gain = c.createGain(); gain.gain.setValueAtTime(.0001, t); gain.gain.linearRampToValueAtTime(volume, t + .008); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(gain).connect(out); oscillator.start(); oscillator.stop(t + duration + .03);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  sfx(name: SfxName, volume = 1) {
    if (!this.ctx) return;
    const bus = this.buses.sfx;
    const combat = ['pistol', 'smg', 'shotgun', 'enemyShot', 'bump'].includes(name);
    if (combat) {
      const c = this.ctx; const source = c.createBufferSource(); source.buffer = this.noise;
      const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = name === 'shotgun' ? 1800 : 3200;
      const gain = c.createGain(); gain.gain.setValueAtTime(.3 * volume, c.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .18);
      source.connect(filter).connect(gain).connect(bus); source.start(0, 0, .2);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      this.tone(bus, 140, 40, .13, .2 * volume, 'sine'); return;
    }
    const bad = ['hurt', 'death', 'deny', 'wanted'].includes(name);
    const cash = ['cash', 'buy', 'capture', 'job'].includes(name);
    this.tone(bus, bad ? 220 : cash ? 660 : 950, bad ? 80 : cash ? 1320 : 700, name === 'click' ? .04 : .22, .15 * volume, bad ? 'sawtooth' : 'triangle');
  }
  dispose() { if (this.timer) clearInterval(this.timer); void this.ctx?.close(); this.ctx = null; }
}
export const createSound = (signal: AbortSignal) => new AudioController(signal);
