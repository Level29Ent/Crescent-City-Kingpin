import type { SfxName } from "./game.ts";

export type Sound = { sfx(name: SfxName, gain?: number, pan?: number): void; engine(speed01: number | null): void; siren(on: boolean): void; start(): void };

const url = (n: string) => new URL(`./assets/${n}.mp3`, import.meta.url).href;

export function createSound(signal: AbortSignal): Sound {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let noise: AudioBuffer;
  const bufs: Record<string, AudioBuffer | undefined> = {};
  let sirenGain: GainNode | null = null;
  let sirenWanted = false;
  let sirenSrc: AudioBufferSourceNode | null = null;
  let engOsc: OscillatorNode | null = null, engOsc2: OscillatorNode | null = null, engGain: GainNode | null = null, engLp: BiquadFilterNode | null = null;
  let engineTarget: number | null = null;

  const loop = (name: string, gain: number): AudioBufferSourceNode | null => {
    const b = bufs[name];
    if (!ctx || !b) return null;
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.loop = true;
    const g = ctx.createGain();
    g.gain.value = gain;
    s.connect(g).connect(master);
    s.start();
    return s;
  };

  const startSiren = () => {
    if (!ctx || !bufs.siren || sirenSrc) return;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenSrc = ctx.createBufferSource();
    sirenSrc.buffer = bufs.siren;
    sirenSrc.loop = true;
    sirenSrc.connect(sirenGain).connect(master);
    sirenSrc.start();
  };
  const applySiren = () => {
    if (!ctx) return;
    if (sirenWanted) startSiren();
    sirenGain?.gain.setTargetAtTime(sirenWanted ? 0.3 : 0, ctx.currentTime, 0.4);
  };

  const load = async (name: string, after?: () => void) => {
    try {
      const r = await fetch(url(name));
      if (!r.ok || !ctx) return;
      bufs[name] = await ctx.decodeAudioData(await r.arrayBuffer());
      after?.();
    } catch { /* missing clip: stay silent */ }
  };

  const ensureEngine = () => {
    if (!ctx || engOsc) return;
    engOsc = ctx.createOscillator(); engOsc.type = "sawtooth";
    engOsc2 = ctx.createOscillator(); engOsc2.type = "square";
    engLp = ctx.createBiquadFilter(); engLp.type = "lowpass"; engLp.frequency.value = 400;
    engGain = ctx.createGain(); engGain.gain.value = 0;
    const g2 = ctx.createGain(); g2.gain.value = 0.4;
    engOsc.connect(engLp); engOsc2.connect(g2).connect(engLp);
    engLp.connect(engGain).connect(master);
    engOsc.start(); engOsc2.start();
  };
  const applyEngine = () => {
    if (!ctx) return;
    ensureEngine();
    const t = ctx.currentTime;
    const s = engineTarget;
    if (s === null) { engGain!.gain.setTargetAtTime(0, t, 0.15); return; }
    const f = 38 + s * 110;
    engOsc!.frequency.setTargetAtTime(f, t, 0.08);
    engOsc2!.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    engLp!.frequency.setTargetAtTime(250 + s * 900, t, 0.1);
    engGain!.gain.setTargetAtTime(0.1 + s * 0.14, t, 0.1);
  };

  const init = () => {
    if (ctx) { if (ctx.state === "suspended") void ctx.resume(); return; }
    try {
      ctx = new AudioContext();
    } catch { return; }
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let seed = 12345; // deterministic cosmetic noise
    for (let i = 0; i < d.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = seed / 2147483648 - 1; }
    void ctx.resume();
    void load("music-jazz", () => loop("music-jazz", 0.25));
    void load("ambience-street", () => loop("ambience-street", 0.35));
    void load("siren", applySiren);
    void load("cash");
    applyEngine();
  };

  const target = (pan: number) => {
    const c = ctx!;
    const out: AudioNode = master;
    if (!pan || !c.createStereoPanner) return out;
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(master);
    return p;
  };

  const nz = (out: AudioNode, t: number, dur: number, gain: number, type: BiquadFilterType, f0: number, f1: number) => {
    const c = ctx!;
    const s = c.createBufferSource(); s.buffer = noise;
    const flt = c.createBiquadFilter(); flt.type = type;
    flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt).connect(g).connect(out);
    s.start(t, 0, dur + 0.05);
  };
  const tone = (out: AudioNode, t: number, dur: number, gain: number, type: OscillatorType, f0: number, f1: number) => {
    const c = ctx!;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  };
  const clip = (out: AudioNode, name: string, t: number, rate: number, gain: number) => {
    const b = bufs[name];
    if (!b) return false;
    const s = ctx!.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
    const g = ctx!.createGain(); g.gain.value = gain;
    s.connect(g).connect(out);
    s.start(t, 0, Math.min(1.6, b.duration));
    return true;
  };

  const sfx = (name: SfxName, gain = 1, pan = 0) => {
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    const gg = ctx.createGain();
    gg.gain.value = Math.min(1.5, Math.max(0, gain));
    gg.connect(target(pan));
    const o: AudioNode = gg;
    switch (name) {
      case "pistol": nz(o, t, 0.16, 0.7, "highpass", 3000, 600); tone(o, t, 0.1, 0.4, "square", 300, 60); break;
      case "smg": nz(o, t, 0.08, 0.5, "bandpass", 4500, 1500); tone(o, t, 0.05, 0.25, "square", 420, 120); break;
      case "shotgun": nz(o, t, 0.7, 0.95, "lowpass", 5000, 150); tone(o, t, 0.4, 0.7, "sine", 120, 35); break;
      case "enemyShot": nz(o, t, 0.2, 0.25, "lowpass", 1400, 300); break;
      case "hit": tone(o, t, 0.05, 0.25, "square", 900, 700); break;
      case "headshot": tone(o, t, 0.25, 0.3, "sine", 1800, 2400); tone(o, t + 0.04, 0.2, 0.2, "sine", 2700, 3200); break;
      case "hurt": tone(o, t, 0.2, 0.6, "sine", 160, 50); nz(o, t, 0.1, 0.3, "lowpass", 800, 200); break;
      case "cash": if (!clip(o, "cash", t, 1, 0.8)) { tone(o, t, 0.15, 0.3, "triangle", 1200, 1200); tone(o, t + 0.08, 0.2, 0.3, "triangle", 1700, 1700); } break;
      case "buy": if (!clip(o, "cash", t, 0.85, 0.8)) tone(o, t, 0.25, 0.3, "triangle", 900, 1400); break;
      case "job": if (!clip(o, "cash", t, 1.2, 0.8)) tone(o, t, 0.3, 0.3, "triangle", 700, 1600); break;
      case "capture": if (!clip(o, "cash", t, 0.7, 0.8)) tone(o, t, 0.5, 0.3, "triangle", 500, 1000); break;
      case "click": tone(o, t, 0.04, 0.2, "square", 1500, 1200); break;
      case "bump": nz(o, t, 0.35, 0.8, "lowpass", 900, 80); tone(o, t, 0.3, 0.7, "sine", 90, 30); break;
      case "door": nz(o, t, 0.08, 0.4, "bandpass", 900, 400); tone(o, t + 0.09, 0.1, 0.4, "sine", 140, 70); break;
      case "wanted": tone(o, t, 0.25, 0.3, "square", 660, 660); tone(o, t + 0.28, 0.25, 0.3, "square", 880, 880); tone(o, t + 0.56, 0.25, 0.3, "square", 660, 660); break;
      case "deny": tone(o, t, 0.22, 0.3, "sawtooth", 110, 90); break;
      case "death": tone(o, t, 1.2, 0.4, "sawtooth", 400, 40); nz(o, t, 0.3, 0.3, "lowpass", 1000, 100); break;
    }
    // release panner/gain nodes automatically once sources end
  };

  const events = ["pointerdown", "keydown"] as const;
  const onGesture = () => init();
  for (const e of events) addEventListener(e, onGesture, { signal, capture: true });
  signal.addEventListener("abort", () => {
    const c = ctx;
    ctx = null;
    void c?.close().catch(() => {});
  });

  return {
    sfx,
    start: init,
    engine(s) {
      engineTarget = s === null ? null : Math.max(0, Math.min(1, s));
      if (ctx) applyEngine();
    },
    siren(on) {
      sirenWanted = on;
      applySiren();
    },
  };
}
