// Audio fluido: todo sample e' aparado (silencio da ponta), normalizado e ganha
// micro-fade nas pontas; vozes da mesma chave saem com fade em vez de corte seco.
const NAMES = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'minigun', 'reload',
  'hit', 'hitmarker', 'death', 'jump', 'step', 'step2', 'land', 'pickup', 'slide', 'flag', 'capture', 'ui', 'ui_hover',
  'ui_click', 'ui_back', 'iris', 'levelup', 'unlock', 'empty', 'swap', 'ads', 'whoosh', 'headshot', 'killstamp', 'music',
  'explosion', 'pan', // existiam mas nao carregavam: granada e bigorna tocavam ruido sintetico
  'tick', 'go', 'win', 'lose', 'ding', 'poof', 'bolt']; // momentos que eram mudos (contagem, rodada, fim, assist, renascer)

class Audio {
  constructor() {
    this.ctx = null;
    this.buf = {};
    this.voices = new Map();
    this.vol = { master: 0.8, music: 0.45, sfx: 1 };
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    this.master = ctx.createGain();
    this.master.gain.value = this.vol.master;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
    this.uiBus = ctx.createGain(); this.uiBus.gain.value = 0.7; this.uiBus.connect(this.master);
    // musica passa por um "gramofone": passa-faixa + chiado de vinil
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.vol.music;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140;
    this.musicBus.connect(hp).connect(lp).connect(this.master);
    this.crackle();
    for (const n of NAMES) this.load(n);
  }

  async load(name) {
    try {
      const r = await fetch(`./sfx/${name}.mp3`);
      if (!r.ok) return;
      const raw = await this.ctx.decodeAudioData(await r.arrayBuffer());
      const pol = name === 'music' ? raw : this.polish(raw);
      // arquivo mudo (veio vazio do gerador) = usa o sintetizado
      if (pol) this.buf[name] = pol;
      if (name === 'music' && this.wantMusic) this.music(true);
    } catch { /* sem o arquivo, cai no sintetizador */ }
  }

  polish(b) {
    const ch = b.numberOfChannels, sr = b.sampleRate;
    let start = b.length, end = 0, peak = 0;
    for (let c = 0; c < ch; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) {
        const a = Math.abs(d[i]);
        if (a > peak) peak = a;
        if (a > 0.025) { if (i < start) start = i; if (i > end) end = i; }
      }
    }
    if (end <= start || peak < 0.05) return null;
    start = Math.max(0, start - Math.floor(sr * 0.002));
    end = Math.min(b.length, end + Math.floor(sr * 0.04));
    const len = end - start;
    const out = this.ctx.createBuffer(ch, len, sr);
    const g = peak > 0 ? 0.9 / peak : 1;
    const fin = Math.floor(sr * 0.003), fout = Math.min(Math.floor(sr * 0.035), len >> 1);
    for (let c = 0; c < ch; c++) {
      const src = b.getChannelData(c), dst = out.getChannelData(c);
      for (let i = 0; i < len; i++) {
        let v = src[start + i] * g;
        if (i < fin) v *= i / fin;
        if (i > len - fout) v *= (len - i) / fout;
        dst[i] = v;
      }
    }
    return out;
  }

  crackle() {
    const ctx = this.ctx, sr = ctx.sampleRate;
    const b = ctx.createBuffer(1, sr * 4, sr);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.0004) d[i] += (Math.random() * 2 - 1) * 0.5;
    }
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.35;
    s.connect(g).connect(this.musicBus); s.start();
  }

  setVolumes(v) {
    Object.assign(this.vol, v);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music, t, 0.05);
  }

  setListener(pos, fwd, up) {
    if (!this.ctx) return;
    if (![pos.x, pos.y, pos.z, fwd.x, fwd.y, fwd.z].every(Number.isFinite)) return;
    const l = this.ctx.listener, t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(pos.x, t, 0.02); l.positionY.setTargetAtTime(pos.y, t, 0.02); l.positionZ.setTargetAtTime(pos.z, t, 0.02);
      l.forwardX.setTargetAtTime(fwd.x, t, 0.02); l.forwardY.setTargetAtTime(fwd.y, t, 0.02); l.forwardZ.setTargetAtTime(fwd.z, t, 0.02);
      l.upX.value = up.x; l.upY.value = up.y; l.upZ.value = up.z;
    } else {
      l.setPosition(pos.x, pos.y, pos.z);
      l.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }
  }

  // fanfarra "lendaria comica" do elite: apito de escorregador subindo, ta-da-DAAA de metais com vibrato
  // e um prato de orquestra no fim (tudo sintetizado, sem sample)
  fanfare(vol = 0.8) {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime + 0.02, out = ctx.createGain();
    out.gain.value = vol * this.vol.sfx; out.connect(this.uiBus);
    // apito subindo
    const w = ctx.createOscillator(), wg = ctx.createGain();
    w.type = 'sine'; w.frequency.setValueAtTime(380, t0); w.frequency.exponentialRampToValueAtTime(1700, t0 + 0.42);
    wg.gain.setValueAtTime(0, t0); wg.gain.linearRampToValueAtTime(0.35, t0 + 0.05); wg.gain.linearRampToValueAtTime(0, t0 + 0.45);
    w.connect(wg).connect(out); w.start(t0); w.stop(t0 + 0.5);
    // metais: ta (G4), da (C5), DAAA (acorde de do maior, segurado com vibrato)
    const brass = (freqs, at, dur, peak) => {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, at); lp.frequency.linearRampToValueAtTime(3200, at + 0.06); lp.Q.value = 2;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(peak, at + 0.03); g.gain.setTargetAtTime(peak * 0.7, at + 0.05, 0.1); g.gain.setTargetAtTime(0, at + dur, 0.08);
      lp.connect(g).connect(out);
      for (const f of freqs) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        if (dur > 0.5) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 6; lg.gain.value = f * 0.012; lfo.connect(lg).connect(o.frequency); lfo.start(at + 0.15); lfo.stop(at + dur + 0.4); }
        o.connect(lp); o.start(at); o.stop(at + dur + 0.4);
      }
    };
    brass([392], t0 + 0.48, 0.12, 0.22);
    brass([523.25], t0 + 0.64, 0.12, 0.22);
    brass([523.25, 659.25, 783.99, 1046.5], t0 + 0.82, 1.15, 0.16);
    // prato: ruido em agudo com cauda longa
    const len = Math.floor(ctx.sampleRate * 1.6), nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    const n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = nb; hp.type = 'highpass'; hp.frequency.value = 5200; ng.gain.value = 0.32;
    n.connect(hp).connect(ng).connect(out); n.start(t0 + 0.82);
  }

  // opts: vol, rate, jitter, pos [x,y,z], ui, key, max
  play(name, o = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const b = this.buf[name];
    const g = ctx.createGain();
    const vol = (o.vol ?? 1) * this.vol.sfx;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    let node = g;
    if (o.pos && o.pos.every(Number.isFinite)) {
      const p = ctx.createPanner();
      p.panningModel = 'equalpower'; p.distanceModel = 'inverse';
      p.refDistance = 4; p.rolloffFactor = 1.1; p.maxDistance = 120;
      if (p.positionX) { p.positionX.value = o.pos[0]; p.positionY.value = o.pos[1]; p.positionZ.value = o.pos[2]; }
      else p.setPosition(o.pos[0], o.pos[1], o.pos[2]);
      g.connect(p); node = p;
    }
    node.connect(o.ui ? this.uiBus : this.sfxBus);
    let src;
    if (b) {
      src = ctx.createBufferSource();
      src.buffer = b;
      const j = o.jitter ?? 0.06;
      src.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * j);
    } else {
      src = this.synth(name);
    }
    src.connect(g);
    src.start(t);
    if (o.dur) { g.gain.setTargetAtTime(0, t + o.dur, 0.03); src.stop(t + o.dur + 0.2); }
    // vozes da mesma chave: a mais velha sai com fade, nunca corta seco
    const key = o.key || name, max = o.max ?? 4;
    let list = this.voices.get(key);
    if (!list) this.voices.set(key, list = []);
    list.push({ src, g });
    src.onended = () => { const i = list.findIndex(v => v.src === src); if (i >= 0) list.splice(i, 1); };
    while (list.length > max) {
      const v = list.shift();
      v.g.gain.cancelScheduledValues(t);
      v.g.gain.setTargetAtTime(0, t, 0.012);
      try { v.src.stop(t + 0.08); } catch { /* ja parou */ }
    }
    return { src, g };
  }

  stopKey(key, fade = 0.03) {
    const list = this.voices.get(key);
    if (!list || !this.ctx) return;
    const t = this.ctx.currentTime;
    for (const v of list) { v.g.gain.setTargetAtTime(0, t, fade); try { v.src.stop(t + fade * 6); } catch { /* */ } }
    list.length = 0;
  }

  synth(name) {
    const ctx = this.ctx, sr = ctx.sampleRate;
    const len = Math.floor(sr * 0.15);
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    const tone = name.startsWith('ui');
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const tt = i / sr, env = Math.exp(-tt / 0.035);
      if (tone) { d[i] = env * Math.sin(tt * 2 * Math.PI * 880) * 0.3; continue; }
      lp += ((Math.random() * 2 - 1) - lp) * 0.35;
      d[i] = env * (lp * 0.8 + Math.sin(tt * 2 * Math.PI * (90 + 60 * Math.exp(-tt / 0.02))) * 0.6 * Math.exp(-tt / 0.06));
    }
    const s = ctx.createBufferSource(); s.buffer = b;
    return s;
  }

  music(on) {
    this.wantMusic = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (on && !this.musicSrc && this.buf.music) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.buf.music; s.loop = true;
      s.loopStart = 0.05; s.loopEnd = this.buf.music.duration - 0.05;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 1.5);
      s.connect(g).connect(this.musicBus); s.start();
      this.musicSrc = { s, g };
    } else if (!on && this.musicSrc) {
      const { s, g } = this.musicSrc;
      g.gain.setTargetAtTime(0, t, 0.4); s.stop(t + 2.5);
      this.musicSrc = null;
    }
  }

  duck(amount, time = 0.6) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, gain = this.musicBus.gain;
    gain.cancelScheduledValues(t);
    gain.setTargetAtTime(this.vol.music * amount, t, 0.03);
    gain.setTargetAtTime(this.vol.music, t + time, 0.4);
  }
}

export const audio = new Audio();
