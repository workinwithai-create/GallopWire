// GallopWire: a playable cyber-western baritone twang for your MIDI keys. Every sound is synthesized here and named as a synth (no samples).
"use strict";
const APP = "gallopwire", BRAND = "GallopWire", SR = 48000, STEPS = 16, LOOKAHEAD_MS = 25, SCHEDULE_AHEAD = 0.12, FAST_RELEASE = 0.012, MIN_REL = 0.01;
// STEPS = 16 sixteenths per 4/4 bar. The gallop (8th + two 16ths) lives on a plain 4/4 grid, so exports line up in any DAW.
const $ = id => document.getElementById(id), clamp = (x, a, b) => Math.min(b, Math.max(a, x)), pc = n => ((n % 12) + 12) % 12;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"], NAMES_S = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const QUAL = { "": [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14], 9: [0, 4, 7, 10, 14], sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], m7b5: [0, 3, 6, 10], add9: [0, 4, 7, 14], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 5: [0, 7, 12] };
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const KEYSIG = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
const CODE_CYCLE = ["-", "R", "G", "O", "T", "S", "H"];
// Recipes: 16-step (sixteenth) gallop patterns for the Baritone Twang.
// R low root twang, G gallop chord stab (palm-muted), O octave twang (root + octave), T tremolo-picked top note, S strummed chord, H hold, - rest.
// hp = Mouth Harp pattern (1 = jaw-harp twang on the chord root).
const RECIPES = {
  gallop: { name: "Neon Gallop", p: "R-GGR-GGR-GGR-GG", hp: "1000000010000000", ring: 1.2, spread: 0.012, trem: 0.25, crush: 0.25, whistle: 0.55, drums: "gallop", note: "Root on every beat, two muted stabs after it: the classic horse-gallop under a neon whistle." },
  duel: { name: "Duel at Dusk", p: "S-------O---T-T-", hp: "1000000000000000", ring: 6, spread: 0.035, trem: 0.55, crush: 0.15, whistle: 0.75, drums: "duel", note: "One slow strum, an octave twang answer and a tremolo sting: the standoff before the draw." },
  surf: { name: "Chrome Surf", p: "TTTTTTTTTTTTTTTT", hp: "1000100010001000", ring: 0.9, spread: 0, trem: 0.7, crush: 0.3, whistle: 0.35, drums: "stomp", note: "Tremolo-picked top note on every 16th, surf-rock style, with harp on every beat." },
  bounty: { name: "Bounty Run", p: "RGGRGGRGRGGRGGOG", hp: "1001001010010010", ring: 0.9, spread: 0.008, trem: 0.2, crush: 0.45, whistle: 0.45, drums: "gallop", note: "Triplet-ish 3+3+2 gallop across the bar, octave kick-up at the end: a chase scene." },
  ghost: { name: "Ghost Town", p: "S-----O-----S---", hp: "1000000000001000", ring: 5, spread: 0.05, trem: 0.45, crush: 0.6, whistle: 0.8, drums: "ghost", note: "Sparse strums and an octave twang with heavy neon crush and a lonely whistle." },
  spur: { name: "Chrome Spur", p: "R-OGR-OGR-OGR-OG", hp: "1010101010101010", ring: 1.4, spread: 0.01, trem: 0.3, crush: 0.35, whistle: 0.5, drums: "stomp", note: "Root, octave, stab: a spur-jangle figure with the mouth harp on every 8th." },
  hold: { name: "Hold (raw twang)", p: "HHHHHHHHHHHHHHHH", hp: "0000000000000000", ring: 16, spread: 0, trem: 0.3, crush: 0.2, whistle: 0.55, drums: "off", note: "No automatic gallop: just the held Baritone Twang voice." }
};
// k kick, s snap/clap, c hoof clop, w whip crack
const DRUMS = {
  gallop: { name: "Gallop (hoof clops)", k: "1000100010001000", s: "0000100000001000", c: "1011101110111011", w: "0000000000000000" },
  duel: { name: "Duel (whip on 4)", k: "1000000000000000", s: "0000000000000000", c: "0000000010000000", w: "0000000000001000" },
  stomp: { name: "Neon stomp", k: "1000001010000010", s: "0000100000001000", c: "0010001000100010", w: "0000000000000000" },
  ghost: { name: "Ghost town", k: "1000000010000000", s: "0000000000000000", c: "1000001000100000", w: "0000000000000001" },
  off: { name: "Off", k: "0000000000000000", s: "0000000000000000", c: "0000000000000000", w: "0000000000000000" }
};
const VOICES = {
  baritone: { name: "Baritone Twang (synth: saw + pulse pluck, resonant low-pass, slap echo)", wave: [["sawtooth", 1, 0.55], ["square", 1, 0.25], ["sawtooth", 2, 0.12]], q: 6, sus: 0.38, decay: 0.28 },
  chrome: { name: "Chrome Twang (synth: bright FM pluck, 2:1 modulator)", fm: 2, idx: 2.6, q: 3, sus: 0.34, decay: 0.32 },
  dust: { name: "Dust Fuzz (synth: square + triangle through soft clip)", wave: [["square", 1, 0.45], ["triangle", 1, 0.6], ["square", 0.5, 0.18]], q: 2, sus: 0.45, decay: 0.4, fuzz: true }
};
const CHAIRS = [
  { id: "keys", name: "Baritone Twang (your keys / gallop engine, synth)", ch: 0 },
  { id: "pad", name: "Neon Whistle (synth: sine whistle + air noise, delayed vibrato)", ch: 1 },
  { id: "harp", name: "Mouth Harp (synth jaw harp: pulse + sweeping formant)", ch: 3 },
  { id: "bass", name: "Desert Bass (synth: sine + triangle pluck)", ch: 2 },
  { id: "drums", name: "Gallop Kit (synth: kick, hoof clop, snap, whip crack)", ch: 9 }
];
const DEF = { bpm: 96, keyRoot: 4, mode: "minor", bars: 8, chordsText: "Em Em C D Em Am B7 Em", recipe: "gallop", pattern: RECIPES.gallop.p, hp: RECIPES.gallop.hp, ring: 1.2, spread: 0.012, trem: 0.25, crush: 0.25, whistle: 0.55, drums: "gallop",
  voice: "baritone", bright: 0.55, atk: 0.003, rel: 0.25, lock: false, quant: true, kbdOct: 3, gains: { keys: 0.85, pad: 0.5, harp: 0.55, bass: 0.75, drums: 0.65 }, mutes: { keys: false, pad: false, harp: false, bass: false, drums: false },
  midiIn: "", midiOut: "", audioOut: "", take: [] };
function loadJSON(k){ try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
const state = Object.assign(JSON.parse(JSON.stringify(DEF)), loadJSON(APP + "-settings") || {});
state.gains = Object.assign({}, DEF.gains, state.gains); state.mutes = Object.assign({}, DEF.mutes, state.mutes); if (!Array.isArray(state.take)) state.take = [];
for (const k of ["ring", "spread", "trem", "crush", "whistle", "bright"]) if (typeof state[k] !== "number") state[k] = DEF[k];
if (!state.pattern || state.pattern.length !== STEPS) state.pattern = (RECIPES[state.recipe] || RECIPES.gallop).p;
if (!state.hp || state.hp.length !== STEPS) state.hp = (RECIPES[state.recipe] || RECIPES.gallop).hp;
function save(){ try { localStorage.setItem(APP + "-settings", JSON.stringify(state)); } catch (e) {} }
// ---------- chords ----------
function parseChord(s){ const m = /^([A-Ga-g])([#b]?)(maj9|maj7|m7b5|m9|m7|m6|m|9|7|6|5|sus2|sus4|dim|add9)?$/.exec(s); if (!m) return null; let r = "C D EF G A B".indexOf(m[1].toUpperCase()); if (m[2] === "#") r++; if (m[2] === "b") r--; return { root: pc(r), q: m[3] || "" }; }
function parseChords(text){ const toks = String(text || "").trim().split(/[\s,|]+/).filter(Boolean).slice(0, 16), out = []; for (const t of toks) { const c = parseChord(t); if (!c) return { err: `"${t}" isn't a chord I know (try Em, Am7, B7, D, Esus4, E5).` }; out.push(c); } return out.length ? { list: out } : { err: "Type at least one chord." }; }
const useSharps = () => [7, 2, 9, 4, 11, 6].includes(state.mode === "minor" ? pc(state.keyRoot + 3) : state.keyRoot);
const chName = c => (useSharps() ? NAMES_S : NAMES)[c.root] + c.q;
function chordAtP(P, bar){ const p = parseChords(P.chordsText); const l = p.list || [{ root: P.keyRoot, q: P.mode === "minor" ? "m" : "" }]; return l[bar % l.length]; }
const chordAt = bar => chordAtP(state, bar);
function voicing(c, lo, hi){ const ivs = QUAL[c.q] || QUAL[""], out = []; for (const i of ivs.slice(0, 5)) { let n = c.root + i; while (n < lo) n += 12; while (n > hi) n -= 12; out.push(n); } return [...new Set(out)].sort((a, b) => a - b); }
function lockNote(n){ if (!state.lock) return n; const sc = SCALE[state.mode].map(i => pc(i + state.keyRoot)); for (let d = 0; d < 6; d++) { if (sc.includes(pc(n - d))) return n - d; if (sc.includes(pc(n + d))) return n + d; } return n; }
// ---------- deterministic noise (seeded LCG) + deterministic desert-canyon IR ----------
const noiseCache = new Map(), irCache = new Map();
function noiseBuf(c){ if (noiseCache.has(c)) return noiseCache.get(c); const b = c.createBuffer(1, Math.round(c.sampleRate * 1), c.sampleRate), d = b.getChannelData(0); let s = 20261110;
  for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) % 2147483648; d[i] = s / 1073741824 - 1; } const F = 2048; for (let i = 0; i < F; i++) { const a = i / F; d[d.length - F + i] = d[d.length - F + i] * (1 - a) + d[i] * a; } noiseCache.set(c, b); return b; }
function roomIR(c){ if (irCache.has(c)) return irCache.get(c); const len = Math.round(c.sampleRate * 1.6), b = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let s = 1110 + ch * 733, lp = 0;
  for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) % 2147483648; const r = s / 1073741824 - 1; lp = lp * 0.35 + r * 0.65; d[i] = lp * Math.exp(-i / (c.sampleRate * 0.33)) * (i < c.sampleRate * 0.008 ? i / (c.sampleRate * 0.008) : 1); } } irCache.set(c, b); return b; }
// Neon Crush: a bit-depth quantizer curve (deterministic). 0 = clean, 1 = 3-bit grit.
function crushCurve(amt){ const n = 4096, cv = new Float32Array(n), bits = 16 - amt * 13, lv = Math.pow(2, bits - 1); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = amt < 0.02 ? x : Math.round(x * lv) / lv; } return cv; }
const fuzzCurve = (() => { const n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(x * 3) / Math.tanh(3); } return cv; })();
// ---------- bus: voices -> chair gain -> compressor -> destination (twang + whistle send to canyon room + tempo-synced slap echo) ----------
const tremHz = P => P.bpm / 60 * 4; // surf tremolo locked to 16ths
function buildBus(c, P){ P = P || state; const comp = c.createDynamicsCompressor(); comp.threshold.value = -6; comp.knee.value = 3; comp.ratio.value = 20; comp.attack.value = 0.002; comp.release.value = 0.1;
  const master = c.createGain(); master.gain.value = 0.9; comp.connect(master); master.connect(c.destination); const chairs = {};
  for (const ch of CHAIRS) { const g = c.createGain(); g.gain.value = chairGainP(P, ch.id); g.connect(comp); chairs[ch.id] = g; }
  const conv = c.createConvolver(); conv.buffer = roomIR(c); const ret = c.createGain(); ret.gain.value = 0.2; conv.connect(ret); ret.connect(comp);
  // dotted-8th slap echo (spaghetti-western spring/tape feel), tempo-synced
  const dly = c.createDelay(2), fb = c.createGain(), dlyOut = c.createGain(), dlyF = c.createBiquadFilter(); dly.delayTime.value = 60 / P.bpm * 0.75; fb.gain.value = 0.32; dlyOut.gain.value = 0.28; dlyF.type = "lowpass"; dlyF.frequency.value = 3200;
  dly.connect(dlyF); dlyF.connect(fb); fb.connect(dly); dlyF.connect(dlyOut); dlyOut.connect(ret);
  const sendK = c.createGain(); sendK.gain.value = 0.45; sendK.connect(conv); chairs.keys.connect(sendK); chairs.keys.connect(dly); const sendP = c.createGain(); sendP.gain.value = 0.7; sendP.connect(conv); chairs.pad.connect(sendP); chairs.pad.connect(dly);
  // keys: tremolo (tempo-synced LFO, starts at sample 0 in exports so it is grid-locked) -> Neon Crush -> chair
  const trem = c.createGain(), lfo = c.createOscillator(), lfoG = c.createGain(); lfo.type = "sine"; lfo.frequency.value = tremHz(P); trem.gain.value = 1 - P.trem / 2; lfoG.gain.value = P.trem / 2; lfo.connect(lfoG); lfoG.connect(trem.gain); lfo.start(0);
  const crush = c.createWaveShaper(); crush.curve = crushCurve(P.crush); trem.connect(crush); crush.connect(chairs.keys);
  const an = c.createAnalyser(); an.fftSize = 2048; master.connect(an); return { comp, master, chairs, an, ret, trem, lfo, lfoG, crush, dly, fb, keysIn: trem, padIn: chairs.pad, harpIn: chairs.harp, bassIn: chairs.bass, drumIn: chairs.drums }; }
const chairGainP = (P, id) => P.mutes[id] ? 0 : P.gains[id];
function applyMix(){ if (!bus) return; const now = ctx.currentTime; for (const ch of CHAIRS) bus.chairs[ch.id].gain.setTargetAtTime(chairGainP(state, ch.id), now, 0.01); applyTrem(); }
function applyTrem(){ if (!bus) return; const now = ctx.currentTime; bus.lfo.frequency.setTargetAtTime(tremHz(state), now, 0.02); bus.trem.gain.setTargetAtTime(1 - state.trem / 2, now, 0.02); bus.lfoG.gain.setTargetAtTime(state.trem / 2, now, 0.02); bus.dly.delayTime.setTargetAtTime(60 / state.bpm * 0.75, now, 0.05); }
let lastCrush = -1; function applyCrush(){ if (!bus) return; const q = Math.round(state.crush * 40) / 40; if (q === lastCrush) return; lastCrush = q; bus.crush.curve = crushCurve(q); }
// ---------- synth voices ----------
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
// twangVoice: plucked baritone note with a real attack ramp, decay to a sustain floor that holds, and a release ramp >= 10 ms.
function keysVoice(c, dest, n, vel, t, P, bendRef){ const V = VOICES[P.voice] || VOICES.baritone, g = c.createGain(), f = c.createBiquadFilter(), nodes = [], f0 = mtof(n), cents = bendRef ? bendRef.cents : 0;
  f.type = "lowpass"; f.Q.value = V.q; const fTop = 1200 + 7000 * P.bright * (0.5 + 0.5 * vel), fFloor = 500 + 1800 * P.bright;
  f.frequency.setValueAtTime(fTop, t); f.frequency.setTargetAtTime(fFloor, t + 0.004, 0.12);
  const atk = Math.max(0.002, P.atk), lvl = (0.05 + 0.15 * Math.pow(vel, 1.3));
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + atk); g.gain.setTargetAtTime(lvl * V.sus, t + atk, V.decay);
  let into = f; if (V.fuzz) { const ws = c.createWaveShaper(); ws.curve = fuzzCurve; ws.connect(f); into = ws; }
  if (V.fm) { const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(); car.type = "triangle"; mod.type = "sine"; car.frequency.value = f0; mod.frequency.value = f0 * V.fm; car.detune.value = mod.detune.value = cents;
    const I = f0 * V.idx * (0.4 + 0.6 * vel) * (0.5 + P.bright); mg.gain.setValueAtTime(I, t); mg.gain.setTargetAtTime(I * 0.2, t + 0.003, 0.15); mod.connect(mg); mg.connect(car.frequency); const cg = c.createGain(); cg.gain.value = 0.9; car.connect(cg); cg.connect(into); for (const o of [car, mod]) { o.start(t); nodes.push(o); } }
  else for (const [type, mul, gn] of V.wave) { const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = f0 * mul; o.detune.value = cents + (mul === 2 ? 4 : 0); og.gain.value = gn; o.connect(og); og.connect(into); o.start(t); nodes.push(o); }
  f.connect(g); g.connect(dest);
  const v = { n, g, nodes, oscs: nodes, lvl, done: false,
    release(at, fast){ if (v.done) return; v.done = true; const r = fast ? FAST_RELEASE : Math.max(MIN_REL, P.rel); at = Math.max(at, t);
      if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(at); else { g.gain.cancelScheduledValues(at); g.gain.setValueAtTime(lvl * V.sus, at); }
      g.gain.linearRampToValueAtTime(0, at + r); for (const o of nodes) o.stop(at + r + 0.02); v.end = at + r; },
    bend(c2, at){ for (const o of nodes) o.detune.setTargetAtTime(c2, at, 0.01); } };
  return v; }
// Neon Whistle: one held sine whistle on the top chord tone + band-passed air noise. Real attack swell, delayed vibrato, long release; holds for the whole note.
function padNote(c, dest, notes, t, dur, P){ const g = c.createGain(), nodes = [], n = notes[notes.length - 1], f0 = mtof(n);
  const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f0; const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = f0 * 2; const o2g = c.createGain(); o2g.gain.value = 0.06; o2.connect(o2g); o2g.connect(g);
  const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5.4; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(0, t + Math.min(0.5, dur * 0.3)); vg.gain.linearRampToValueAtTime(f0 * 0.012, t + Math.min(1.2, dur * 0.6)); vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
  o.connect(g); for (const x of [o, o2, vib]) { x.start(t); nodes.push(x); }
  const ns = c.createBufferSource(); ns.buffer = noiseBuf(c); ns.loop = true; ns.loopStart = 0; ns.loopEnd = ns.buffer.duration; const nf = c.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = f0; nf.Q.value = 6;
  const ng = c.createGain(); ng.gain.value = 0.5; ns.connect(nf); nf.connect(ng); ng.connect(g); ns.start(t); nodes.push(ns);
  const lvl = 0.02 + 0.09 * P.whistle, atk = Math.min(0.35, dur * 0.3), rel = 0.4;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + atk); g.gain.setValueAtTime(lvl, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + rel);
  g.connect(dest); for (const x of nodes) x.stop(t + dur + rel + 0.02); return { nodes, g, end: t + dur + rel }; }
// Mouth Harp: narrow pulse at the root with a band-pass "boing" formant sweep (the player's mouth shape), short ring.
let pulseCache = new Map(); function pulseWave(c){ if (!pulseCache.has(c)) { const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let k = 1; k < N; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * 0.12); pulseCache.set(c, c.createPeriodicWave(re, im)); } return pulseCache.get(c); }
function harpNote(c, dest, n, vel, t, dur){ const o = c.createOscillator(), f = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain(); o.setPeriodicWave(pulseWave(c)); o.frequency.value = mtof(n);
  f.type = "bandpass"; f.Q.value = 9; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(2100, t + dur * 0.45); f.frequency.linearRampToValueAtTime(700, t + dur); f2.type = "lowpass"; f2.frequency.value = 3500;
  const lvl = 0.5 * vel; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + 0.003); g.gain.setTargetAtTime(lvl * 0.5, t + 0.003, 0.15); g.gain.setValueAtTime(lvl * 0.4, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
  o.connect(f); f.connect(f2); f2.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.07); return { nodes: [o], g, end: t + dur + 0.07 }; }
function bassNote(c, dest, n, vel, t, dur){ const g = c.createGain(), f = c.createBiquadFilter(), o1 = c.createOscillator(), o2 = c.createOscillator(); f.type = "lowpass"; f.Q.value = 1.4;
  f.frequency.setValueAtTime(1500, t); f.frequency.setTargetAtTime(420, t + 0.01, 0.07);
  o1.type = "sine"; o2.type = "triangle"; o1.frequency.value = mtof(n); o2.frequency.value = mtof(n); const g2 = c.createGain(); g2.gain.value = 0.5; o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(dest);
  const lvl = 0.42 * vel; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + 0.005); g.gain.setTargetAtTime(lvl * 0.55, t + 0.005, 0.15); g.gain.setValueAtTime(lvl * 0.55 * 0.9, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
  o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); return { nodes: [o1, o2], g, end: t + dur + 0.05 }; }
const cosCache = new Map(); function cosWave(c){ if (!cosCache.has(c)) cosCache.set(c, c.createPeriodicWave(new Float32Array([0, 1]), new Float32Array([0, 0]), { disableNormalization: true })); return cosCache.get(c); }
function drumHit(c, dest, kind, vel, t){ const g = c.createGain(); g.connect(dest); const nodes = [];
  if (kind === "k") { const o = c.createOscillator(); o.setPeriodicWave(cosWave(c)); /* cosine phase: the kick lands on the exact grid sample */ o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.11); g.gain.setValueAtTime(0.8 * vel, t); g.gain.setTargetAtTime(0, t + 0.05, 0.08); o.connect(g); o.start(t); o.stop(t + 0.5); nodes.push(o); return { nodes, g, end: t + 0.5 }; }
  if (kind === "c") { // hoof clop: two tuned triangle knocks through a band-pass (coconut-shell style)
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1100; f.Q.value = 3; f.connect(g);
    for (const [hz, off] of [[820, 0], [560, 0.018]]) { const o = c.createOscillator(), og = c.createGain(); o.type = "triangle"; o.frequency.value = hz; og.gain.setValueAtTime(0, t + off); og.gain.linearRampToValueAtTime(0.5 * vel, t + off + 0.001); og.gain.setTargetAtTime(0, t + off + 0.003, 0.014); o.connect(og); og.connect(f); o.start(t + off); o.stop(t + off + 0.12); nodes.push(o); }
    g.gain.value = 1; return { nodes, g, end: t + 0.15 }; }
  const s = c.createBufferSource(); s.buffer = noiseBuf(c); const f = c.createBiquadFilter(); s.connect(f); f.connect(g);
  if (kind === "s") { f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 0.9; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.42 * vel, t + 0.002); g.gain.setTargetAtTime(0, t + 0.006, 0.05); s.start(t); s.stop(t + 0.35); }
  else { /* whip crack: fast high-pass sweep up */ f.type = "highpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(7000, t + 0.06); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06 * vel, t + 0.04); g.gain.linearRampToValueAtTime(0.5 * vel, t + 0.055); g.gain.setTargetAtTime(0, t + 0.058, 0.02); s.start(t); s.stop(t + 0.3); }
  nodes.push(s); return { nodes, g, end: t + 0.35 }; }
// ---------- gallop logic (pure, deterministic) ----------
function heldNotes(P){ if (P.take && P.take.length) return P.take; const out = []; for (let b = 0; b < P.bars; b++) for (const n of voicing(chordAtP(P, b), 47, 64)) out.push({ s: b * STEPS, d: STEPS, n, v: 0.75 }); return out; }
function tonesAt(P, k, liveNs){ if (liveNs && liveNs.length) return [...new Set(liveNs)].sort((a, b) => a - b).slice(0, 5);
  const take = P.take || []; const cov = take.filter(n => k >= Math.floor(n.s) && k < n.s + n.d).map(n => n.n);
  if (cov.length) return [...new Set(cov)].sort((a, b) => a - b).slice(0, 5);
  return voicing(chordAtP(P, Math.floor(k / STEPS)), 47, 64); }
// returns [{n, off (seconds after step), v, short}]
function compNotes(code, tones, P, k){ if (!tones.length) return []; const i = k % STEPS, acc = i % 4 === 0 ? 1 : 0.78, top = tones[tones.length - 1], low = tones[0], sd = 60 / P.bpm / 4;
  if (code === "S" || code === "H") return tones.map((n, j) => ({ n, off: j * P.spread, v: 0.72 * acc }));
  if (code === "G") return tones.slice(0, 3).map(n => ({ n, off: 0, v: 0.55 * acc, short: true }));
  if (code === "R") return [{ n: clamp(low - (low > 52 ? 12 : 0), 33, 64), off: 0, v: 0.8 * acc }];
  if (code === "O") return [{ n: low, off: 0, v: 0.7 * acc }, { n: low + 12, off: 0.004, v: 0.62 * acc }];
  if (code === "T") return [{ n: top, off: 0, v: 0.6 * acc, short: true }, { n: top, off: sd / 2, v: 0.48, short: true }];
  return []; }
function noteDur(e, P, sd){ return e.short ? sd * 0.42 : Math.max(0.05, P.ring * sd); }
function padSegments(P){ const segs = []; let b = 0; while (b < P.bars) { const c = chordAtP(P, b), nm = c.root + "/" + c.q; let e = b + 1; while (e < P.bars) { const c2 = chordAtP(P, e); if (c2.root + "/" + c2.q !== nm) break; e++; } segs.push({ bar: b, bars: e - b, notes: voicing(c, 72, 84) }); b = e; } return segs; }
function bandEventsAt(P, k){ const out = [], i = k % STEPS, bar = Math.floor(k / STEPS), D = DRUMS[P.drums] || DRUMS.off, ch = chordAtP(P, bar), nx = chordAtP(P, bar + 1);
  for (const d of ["k", "s", "c", "w"]) if (D[d][i] === "1") out.push({ ch: "drums", kind: d, n: d === "k" ? 36 : d === "s" ? 39 : d === "c" ? 76 : 75, v: d === "c" ? (i % 4 === 0 ? 1 : 0.7) : 1, d: 1 });
  if (P.hp[i] === "1") out.push({ ch: "harp", n: 52 + pc(ch.root - 4), v: i % 8 === 0 ? 1 : 0.8, d: 2.5 });
  // desert bass: root on 1, fifth on 3, walk-up 16th on the "a" of 4 into the next chord
  const root = 28 + pc(ch.root - 4);
  if (i === 0) out.push({ ch: "bass", n: root, v: 1, d: 3.5 });
  else if (i === 8) out.push({ ch: "bass", n: root + 7 > 43 ? root - 5 : root + 7, v: 0.85, d: 3.5 });
  else if (i === 14) { const nr = 28 + pc(nx.root - 4); out.push({ ch: "bass", n: nr + (nr > root ? -2 : 2), v: 0.7, d: 1.5 }); }
  return out; }
// ---------- live engine ----------
let ctx = null, bus = null, play = null, timerId = null, rec = false, sustain = false, bendRef = { cents: 0 };
const active = new Set(), liveVoices = new Map(), takeVoices = new Set(), heldPitches = new Map(); window.__schedLog = [];
async function ensureCtx(){ if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" }); bus = buildBus(ctx); lastCrush = state.crush; applySink(); } if (ctx.state !== "running") { try { await ctx.resume(); } catch (e) {} } return ctx; }
function track(x){ active.add(x); const kill = () => active.delete(x); if (x.nodes && x.nodes[0]) x.nodes[0].onended = kill; }
function start(){ if (!ctx || ctx.state !== "running") { setStatus("Tap to start audio first."); return false; } stop(true); const P = state;
  if (P.recipe !== "hold") for (const [, vo] of liveVoices) { try { vo.v.release(ctx.currentTime, true); } catch (e) {} }
  if (bus.ret) { bus.ret.gain.cancelScheduledValues(ctx.currentTime); bus.ret.gain.setTargetAtTime(0.2, ctx.currentTime, 0.01); }
  play = { nextStepTime: ctx.currentTime + 0.1, step: 0, t0: ctx.currentTime + 0.1, log: [] }; window.__schedLog = []; scheduler(); timerId = setInterval(scheduler, LOOKAHEAD_MS); requestAnimationFrame(draw); paintTransport();
  setStatus("Playing. Hold chords on your keyboard: the gallop engine rides them on the 16th grid. Changes land on the next step."); return true; }
function scheduler(){ if (!play) return; while (play.nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) { const sd = 60 / state.bpm / 4; scheduleStep(play.step, play.nextStepTime, sd); play.nextStepTime += sd; play.step = (play.step + 1) % (state.bars * STEPS); } }
function scheduleStep(k, t, sd){ const P = state, code = P.pattern[k % STEPS] || "-", liveNs = [...heldPitches.values()];
  let keysOn = false;
  if (P.recipe === "hold" || code === "H") keysOn = true;
  else if (code !== "-" && !P.mutes.keys) {
    const tones = tonesAt(P, k, liveNs), notes = compNotes(code, tones, P, k), dur = Math.max(0.05, P.ring * sd);
    for (const e of notes) { const v = keysVoice(ctx, bus.keysIn, e.n, e.v, t + e.off, P); v.release(t + e.off + noteDur(e, P, sd)); track(v); }
    if (notes.length) { keysOn = true; midiSendKeys(notes, t, dur); }
  }
  if (P.take.length && !rec && P.recipe === "hold") for (const n of P.take) { if (Math.floor(n.s) !== k) continue; const at = t + (n.s - k) * sd, v = keysVoice(ctx, bus.keysIn, n.n, n.v, at, P); v.release(at + n.d * sd); takeVoices.add(v); v.nodes[0].onended = () => takeVoices.delete(v); }
  if (k % STEPS === 0 && !P.mutes.pad) { const bar = k / STEPS, seg = padSegments(P).find(s => s.bar === bar); if (seg) { const x = padNote(ctx, bus.padIn, seg.notes, t, seg.bars * STEPS * sd, P); track(x); } }
  const evs = bandEventsAt(P, k); for (const e of evs) { if (P.mutes[e.ch]) continue; const x = e.ch === "drums" ? drumHit(ctx, bus.drumIn, e.kind, e.v, t) : e.ch === "harp" ? harpNote(ctx, bus.harpIn, e.n, e.v, t, e.d * sd) : bassNote(ctx, bus.bassIn, e.n, e.v, t, e.d * sd); track(x); midiSendBand(e, t, sd); }
  play.log.push({ k, t, sd }); if (play.log.length > 256) play.log.splice(0, 64);
  window.__schedLog.push({ k, t, sd, keysOn, recipe: P.recipe, pattern: P.pattern, bpm: P.bpm, trem: P.trem, mutes: Object.assign({}, P.mutes), events: evs.filter(e => !P.mutes[e.ch]).length, wall: performance.now() }); }
function stop(quiet){ clearInterval(timerId); timerId = null; const was = !!play; play = null; if (rec) { rec = false; finishRec(); }
  if (ctx) { const now = ctx.currentTime; for (const x of active) { try { x.done = true; if (x.g.gain.cancelAndHoldAtTime) x.g.gain.cancelAndHoldAtTime(now); else x.g.gain.cancelScheduledValues(now); x.g.gain.setValueAtTime(x.g.gain.value, now); x.g.gain.linearRampToValueAtTime(0, now + FAST_RELEASE); for (const n of x.nodes || []) { try { n.stop(now + FAST_RELEASE + 0.005); } catch (e) {} } } catch (e) {} }
    if (bus && bus.ret) { bus.ret.gain.cancelScheduledValues(now); bus.ret.gain.setValueAtTime(bus.ret.gain.value, now); bus.ret.gain.linearRampToValueAtTime(0, now + FAST_RELEASE); bus.ret.gain.setValueAtTime(0, now + 4); bus.ret.gain.linearRampToValueAtTime(0.2, now + 4.05); }
    active.clear(); for (const v of takeVoices) { try { v.done = false; v.release(now, true); } catch (e) {} } takeVoices.clear(); liveAllOff(true); }
  midiPanic(); paintTransport(); if (was && !quiet) setStatus("Stopped."); }
function posAt(t){ if (!play) return null; let cur = null; for (const e of play.log) { if (e.t <= t) cur = e; else break; } if (!cur) return null; return cur.k + (t - cur.t) / cur.sd; }
let lastStep = -1;
function draw(){ if (!play) { paintSteps(-1); return; } const p = posAt(ctx.currentTime); if (p != null) { const k = Math.floor(p); if (k !== lastStep) { lastStep = k; paintSteps(k); } } requestAnimationFrame(draw); }
// ---------- recording ----------
let recNotes = new Map(), recBuf = [];
function toggleRec(){ if (rec) { rec = false; finishRec(); paintTransport(); return; } if (!play && !start()) return; rec = true; recBuf = []; recNotes.clear(); paintTransport(); setStatus("Recording: play your chords. Every pass overdubs onto the loop. Press Rec again to keep it."); }
function finishRec(){ const L = state.bars * STEPS, now = ctx ? ctx.currentTime : 0; for (const [, r] of recNotes) closeRec(r, now); recNotes.clear(); if (!recBuf.length) return;
  for (const r of recBuf) { let s = r.s, d = r.d; if (state.quant) { s = Math.round(s); d = Math.max(1, Math.round(d)); } s = ((s % L) + L) % L; state.take.push({ s: Math.round(s * 1000) / 1000, d: Math.min(L, Math.round(d * 1000) / 1000), n: r.n, v: Math.round(r.v * 100) / 100 }); }
  state.take.sort((a, b) => a.s - b.s); recBuf = []; save(); paintTake(); setStatus(`Take kept: ${state.take.length} notes. They feed the gallop engine and go into the export.`); }
function closeRec(r, t){ const p = posAt(t); if (p == null) return; let d = p - r.s; if (d <= 0) d += state.bars * STEPS; r.d = Math.max(0.25, d); recBuf.push(r); }
// ---------- live playing ----------
function wantsRawVoice(){ return !play || state.recipe === "hold"; }
function liveOn(note, vel, src){ if (!ctx || ctx.state !== "running") { ensureCtx(); if (!ctx || ctx.state !== "running") { setStatus("Tap to start audio, then play."); return; } }
  const n = lockNote(note), key = src + ":" + note; heldPitches.set(key, n);
  const old = liveVoices.get(key); if (old && old.v) old.v.release(ctx.currentTime, true);
  if (wantsRawVoice()) {
    if (liveVoices.size >= 16) { const [k0, o0] = liveVoices.entries().next().value; o0.v.release(ctx.currentTime, true); liveVoices.delete(k0); heldPitches.delete(k0); }
    const v = keysVoice(ctx, bus.keysIn, n, vel, ctx.currentTime, state, bendRef); liveVoices.set(key, { v, n, sustained: false });
  } else { liveVoices.set(key, { v: { release(){}, bend(){}, n, done: true }, n, sustained: false, silent: true }); }
  keyVis(note, true); midiOutNote(true, n, vel);
  if (rec && play) { const p = posAt(ctx.currentTime); if (p != null) recNotes.set(key, { s: p, n, v: vel }); } }
function liveOff(note, src){ const key = src + ":" + note, vo = liveVoices.get(key); keyVis(note, false); if (!vo) { heldPitches.delete(key); return; } if (sustain) { vo.sustained = true; return; } releaseLive(key, vo); }
function releaseLive(key, vo){ liveVoices.delete(key); heldPitches.delete(key); if (vo.v && !vo.silent) vo.v.release(ctx.currentTime); midiOutNote(false, vo.n, 0); const r = recNotes.get(key); if (r) { recNotes.delete(key); closeRec(r, ctx.currentTime); } }
function setSustain(down){ sustain = down; if (!down && ctx) for (const [k, vo] of [...liveVoices]) if (vo.sustained) releaseLive(k, vo); }
function liveAllOff(fast){ if (!ctx) return; for (const [k, vo] of [...liveVoices]) { if (vo.v && !vo.silent) vo.v.release(ctx.currentTime, fast); midiOutNote(false, vo.n, 0); const r = recNotes.get(k); if (r) { recNotes.delete(k); closeRec(r, ctx.currentTime); } } liveVoices.clear(); heldPitches.clear(); sustain = false; document.querySelectorAll(".down").forEach(k => k.classList.remove("down")); }
function keyVis(n, on){ document.querySelectorAll(`[data-n="${n}"]`).forEach(k => k.classList.toggle("down", on)); }
// ---------- Web MIDI ----------
let midiAccess = null, midiOut = null, midiInPort = null;
function onMidi(ev){ const d = ev.data, s = d[0], cmd = s & 0xF0, n = d[1], v = d[2]; if (s >= 0xF0) return;
  showMidi(d);
  if (cmd === 0xB0) { if (n === 64) setSustain(v >= 64); else if (n === 1) { state.trem = Math.round(v / 127 * 100) / 100; applyTrem(); paintComp(); save(); } else if (n === 74) { state.bright = Math.round(v / 127 * 1000) / 1000; paintVoice(); save(); }
    else if (n === 11 || n === 2) { state.whistle = Math.round(v / 127 * 100) / 100; paintComp(); save(); } else if (n === 71) { state.crush = Math.round(v / 127 * 100) / 100; applyCrush(); paintComp(); save(); } else if (n === 123 || n === 120) liveAllOff(); return; }
  if (cmd === 0xE0) { const b = ((v << 7) | n) - 8192; bendRef.cents = b / 8192 * 200; if (ctx) for (const [, vo] of liveVoices) if (vo.v && vo.v.bend) vo.v.bend(bendRef.cents, ctx.currentTime); return; }
  if (cmd === 0x90 && v > 0) liveOn(n, v / 127, "midi"); else if (cmd === 0x80 || (cmd === 0x90 && v === 0)) liveOff(n, "midi"); }
function showMidi(d){ const el = $("midiLast"); if (el) el.textContent = "Last MIDI in: " + [...d].map(x => x.toString(16).padStart(2, "0")).join(" "); }
function refreshMidi(){ if (!midiAccess) return; const fill = (sel, ports, cur) => { sel.innerHTML = '<option value="">(none)</option>' + [...ports.values()].map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(""); sel.value = [...ports.keys()].includes(cur) ? cur : ""; };
  if (!state.midiIn && midiAccess.inputs.size) state.midiIn = [...midiAccess.inputs.keys()][0]; fill($("midiIn"), midiAccess.inputs, state.midiIn); fill($("midiOut"), midiAccess.outputs, state.midiOut);
  if (midiInPort) midiInPort.onmidimessage = null; midiInPort = state.midiIn ? midiAccess.inputs.get(state.midiIn) : null; if (midiInPort) midiInPort.onmidimessage = onMidi;
  midiOut = state.midiOut ? midiAccess.outputs.get(state.midiOut) || null : null;
  $("midiNote").textContent = midiInPort ? `MIDI keyboard: ${midiInPort.name}. Play it: notes, velocity, sustain, mod wheel, CC71 crush, expression and pitch bend all work.` : midiAccess.inputs.size ? "Pick your MIDI keyboard above." : "No MIDI keyboard found. Plug one in (it appears here by itself). On-screen and computer keys are the fallback."; }
function midiOutNote(on, n, v){ if (!midiOut) return; try { midiOut.send(on ? [0x90, n, clamp(Math.round(v * 127), 1, 127)] : [0x80, n, 0]); } catch (e) {} }
function midiSendBand(e, time, sd){ if (!midiOut || !ctx) return; const ch = e.ch === "drums" ? 9 : e.ch === "harp" ? 3 : 2, at = performance.now() + (time - ctx.currentTime) * 1000, v = clamp(Math.round(e.v * 100), 1, 127);
  try { midiOut.send([0x90 | ch, e.n, v], at); midiOut.send([0x80 | ch, e.n, 0], at + Math.max(15, e.d * sd * 1000 - 3)); } catch (x) {} }
function midiSendKeys(notes, time, dur){ if (!midiOut || !ctx) return; const at = performance.now() + (time - ctx.currentTime) * 1000;
  try { for (const e of notes) { midiOut.send([0x90, e.n, clamp(Math.round(e.v * 127), 1, 127)], at + e.off * 1000); midiOut.send([0x80, e.n, 0], at + e.off * 1000 + Math.max(20, dur * 1000)); } } catch (x) {} }
function midiPanic(){ if (!midiOut) return; try { midiOut.clear && midiOut.clear(); for (const ch of [0, 1, 2, 3, 9]) midiOut.send([0xB0 | ch, 123, 0]); } catch (e) {} }
// ---------- audio out ----------
const sinkOK = () => typeof (window.AudioContext || function(){}).prototype.setSinkId === "function";
async function listDevices(){ const sel = $("audioOut"); if (!sinkOK()) { sel.innerHTML = '<option value="">System default</option>'; sel.disabled = true; $("audioOutNote").textContent = "This browser can't route Web Audio to a chosen device (no setSinkId), so sound uses your system output."; return; }
  let devs = []; try { devs = await navigator.mediaDevices.enumerateDevices(); } catch (e) {} const outs = devs.filter(d => d.kind === "audiooutput" && d.deviceId !== "default");
  sel.innerHTML = '<option value="">System default</option>' + outs.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || "Output " + (i + 1))}</option>`).join(""); sel.value = outs.some(d => d.deviceId === state.audioOut) ? state.audioOut : ""; }
async function applySink(){ if (!ctx || !sinkOK()) return; if (!state.audioOut && !(typeof ctx.sinkId === "string" && ctx.sinkId)) { $("audioOutNote").textContent = "Playing through the system default output."; return; } try { await ctx.setSinkId(state.audioOut || ""); $("audioOutNote").textContent = state.audioOut ? "Playing through the selected output." : "Playing through the system default output."; } catch (e) { $("audioOutNote").textContent = "That output couldn't be used, so sound stays on the system default."; } }
// ---------- export ----------
const snapState = () => JSON.parse(JSON.stringify(state));
let compLat = null;
async function compLatency(){ if (compLat != null) return compLat; const oc = new OfflineAudioContext(1, 4096, SR), b = oc.createBuffer(1, 1, SR); b.getChannelData(0)[0] = 0.5; const s = oc.createBufferSource(); s.buffer = b;
  const B = buildBus(oc, Object.assign(snapState(), { mutes: { keys: true, pad: true, harp: true, bass: true, drums: false }, gains: { keys: 0, pad: 0, harp: 0, bass: 0, drums: 1 } })); s.connect(B.chairs.drums); s.start(0); const r = (await oc.startRendering()).getChannelData(0); let bi = 0; for (let i = 0; i < r.length; i++) if (Math.abs(r[i]) > Math.abs(r[bi])) bi = i; compLat = bi; return bi; }
async function renderMix(o){ o = o || {}; const P = Object.assign(snapState(), o.override || {}), sd = 60 / P.bpm / 4, L = P.bars * STEPS, N = Math.round(P.bars * 4 * 60 / P.bpm * SR);
  if (o.only) P.mutes = Object.fromEntries(CHAIRS.map(c => [c.id, !o.only.includes(c.id)]));
  const notes = heldNotes(P), tailS = Math.max(MIN_REL, P.rel) + P.ring * sd + 4.5, total = N + Math.ceil(tailS * SR);
  const lat = await compLatency(), oc = new OfflineAudioContext(2, total + lat, SR), B = buildBus(oc, P), M = P.mutes;
  for (let k = 0; k < L; k++) {
    const t = k * sd, code = P.pattern[k % STEPS] || "-";
    if (!M.keys && P.recipe !== "hold" && code !== "-" && code !== "H") { const tones = tonesAt(P, k, null), dur = Math.max(0.05, P.ring * sd);
      for (const e of compNotes(code, tones, P, k)) { const v = keysVoice(oc, B.keysIn, e.n, e.v, t + e.off, P); v.release(t + e.off + noteDur(e, P, sd)); } }
    for (const e of bandEventsAt(P, k)) { if (M[e.ch]) continue; if (e.ch === "drums") drumHit(oc, B.drumIn, e.kind, e.v, t); else if (e.ch === "harp") harpNote(oc, B.harpIn, e.n, e.v, t, e.d * sd); else bassNote(oc, B.bassIn, e.n, e.v, t, e.d * sd); }
  }
  if (!M.pad) for (const s of padSegments(P)) padNote(oc, B.padIn, s.notes, s.bar * STEPS * sd, s.bars * STEPS * sd, P);
  if (!M.keys && (P.recipe === "hold" || [...P.pattern].includes("H"))) for (const n of notes) { const t = n.s * sd, v = keysVoice(oc, B.keysIn, n.n, n.v, t, P); v.release(t + n.d * sd); }
  const buf = await oc.startRendering(), ch = [0, 1].map(c => { const src = buf.getChannelData(c).subarray(lat), out = new Float32Array(N); out.set(src.subarray(0, N)); if (!o.noFold) for (let i = N; i < src.length; i++) out[(i - N) % N] += src[i]; return out; });
  let pk = 0; for (const x of ch) for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(x[i])); const g = o.gain != null ? o.gain : pk > 0 ? Math.pow(10, -1.1 / 20) / pk : 1; for (const x of ch) for (let i = 0; i < N; i++) x[i] *= g;
  return { ch, N, gain: g, peak: pk, P }; }
function wav24(ch, N){ const nc = ch.length, ba = nc * 3, buf = new ArrayBuffer(44 + N * ba), dv = new DataView(buf), w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); dv.setUint32(4, 36 + N * ba, true); w(8, "WAVE"); w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, nc, true); dv.setUint32(24, SR, true); dv.setUint32(28, SR * ba, true); dv.setUint16(32, ba, true); dv.setUint16(34, 24, true); w(36, "data"); dv.setUint32(40, N * ba, true);
  let o = 44; for (let i = 0; i < N; i++) for (let c = 0; c < nc; c++) { let v = Math.round(clamp(ch[c][i], -1, 1) * 8388607); if (v < 0) v += 16777216; dv.setUint8(o, v & 255); dv.setUint8(o + 1, (v >> 8) & 255); dv.setUint8(o + 2, (v >> 16) & 255); o += 3; } return new Uint8Array(buf); }
const fileBase = P => `${APP}-${P.recipe}-${P.bpm}bpm-${NAMES[P.keyRoot] + (P.mode === "minor" ? "m" : "")}`;
function midiFile(o){ const P = Object.assign(snapState(), (o && o.override) || {}), PPQ = 480, TK = PPQ / 4, L = P.bars * STEPS, total = L * TK, sd = 60 / P.bpm / 4, vlq = n => { const a = [n & 127]; while (n >>= 7) a.unshift((n & 127) | 128); return a; };
  const trk = evs => { evs.sort((a, b) => a.t - b.t || a.o - b.o); let last = 0; const d = []; for (const e of evs) { d.push(...vlq(e.t - last), ...e.b); last = e.t; } d.push(...vlq(Math.max(0, total - last)), 0xFF, 0x2F, 0); return [0x4D, 0x54, 0x72, 0x6B, (d.length >>> 24) & 255, (d.length >> 16) & 255, (d.length >> 8) & 255, d.length & 255, ...d]; };
  const meta = (type, s) => { const c = [...String(s).replace(/[^\x20-\x7e]/g, "-")].map(ch => ch.charCodeAt(0)); return [0xFF, type, ...vlq(c.length), ...c]; };
  const us = Math.round(60e6 / P.bpm), minor = P.mode === "minor", sf = KEYSIG[pc(minor ? P.keyRoot + 3 : P.keyRoot)];
  const cond = [{ t: 0, o: 0, b: meta(0x03, `${BRAND} ${P.bpm} BPM ${fileBase(P)}`) }, { t: 0, o: 1, b: [0xFF, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255] }, { t: 0, o: 2, b: [0xFF, 0x58, 4, 4, 2, 24, 8] }, { t: 0, o: 2, b: [0xFF, 0x59, 2, sf & 255, minor ? 1 : 0] }];
  for (let b = 0; b < P.bars; b++) cond.push({ t: b * STEPS * TK, o: 3, b: meta(0x06, `Bar ${b + 1} ${chName(chordAtP(P, b))}`) });
  const noteTrack = (name, ch, list, prog) => { const out = [{ t: 0, o: 0, b: meta(0x03, name) }]; if (prog != null) out.push({ t: 0, o: 1, b: [0xC0 | ch, prog] });
    for (const e of list) { const t0 = Math.round(e.s * TK); if (t0 >= total) continue; const t1 = Math.min(total, Math.max(t0 + 1, Math.round((e.s + e.d) * TK))); out.push({ t: t0, o: 3, b: [0x90 | ch, e.n, clamp(Math.round(e.v * 127), 1, 127)] }); out.push({ t: t1, o: 2, b: [0x80 | ch, e.n, 0] }); } return trk(out); };
  const keys = [];
  if (P.recipe === "hold") for (const n of heldNotes(P)) keys.push({ s: n.s, d: n.d, n: n.n, v: n.v });
  else for (let k = 0; k < L; k++) { const code = P.pattern[k % STEPS]; if (code === "-") continue; const tones = tonesAt(P, k, null);
    for (const e of compNotes(code === "H" ? "R" : code, tones, P, k)) keys.push({ s: k + e.off / sd, d: e.short ? 0.42 : P.ring, n: e.n, v: e.v }); }
  const pad = []; for (const s of padSegments(P)) pad.push({ s: s.bar * STEPS, d: s.bars * STEPS, n: s.notes[s.notes.length - 1], v: 0.6 });
  const bass = [], drums = [], harp = []; for (let k = 0; k < L; k++) for (const e of bandEventsAt(P, k)) (e.ch === "bass" ? bass : e.ch === "harp" ? harp : drums).push({ s: k, d: e.ch === "drums" ? 0.5 : e.d, n: e.n, v: e.v * 0.86 });
  const tracks = [trk(cond)]; if (!P.mutes.keys) tracks.push(noteTrack(`Baritone Twang (synth: ${RECIPES[P.recipe] ? RECIPES[P.recipe].name : "custom"})`, 0, keys, 27));
  if (!P.mutes.pad) tracks.push(noteTrack("Neon Whistle (synth)", 1, pad, 78)); if (!P.mutes.harp) tracks.push(noteTrack("Mouth Harp (synth)", 3, harp, 105)); if (!P.mutes.bass) tracks.push(noteTrack("Desert Bass (synth)", 2, bass, 33)); if (!P.mutes.drums && P.drums !== "off") tracks.push(noteTrack("Gallop Kit (synth)", 9, drums, null));
  return new Uint8Array([].concat([0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, PPQ >> 8, PPQ & 255], ...tracks)); }
async function exportWavBytes(o){ o = o || {}; const r = await renderMix(o); return { bytes: wav24(r.ch, r.N), name: fileBase(r.P) + ".wav", frames: r.N, gain: r.gain, peak: r.peak }; }
function exportMidBytes(o){ const P = Object.assign(snapState(), (o && o.override) || {}); return { bytes: midiFile(o), name: fileBase(P) + ".mid" }; }
function download(bytes, name, type){ const blob = new Blob([bytes], { type }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
function expMsg(m, cls){ setStatus(m); const el = $("expMsg"); el.textContent = m; el.className = "expmsg " + (cls || ""); }
async function doExport(kind){ if (gated() && state.bars > FREE_BARS) { expMsg(`Free exports are up to ${FREE_BARS} bars. Unlock for ${state.bars}-bar exports.`, "bad"); return; }
  try { if (kind === "wav") { expMsg("Rendering WAV…"); $("expProg").hidden = false; const r = await exportWavBytes(); download(r.bytes, r.name, "audio/wav"); expMsg(`Saved ${r.name}: ${r.frames.toLocaleString()} samples (exactly ${state.bars} bars at ${state.bpm} BPM), 48 kHz / 24-bit.`, "ok"); }
    else { const r = exportMidBytes(); download(r.bytes, r.name, "audio/midi"); expMsg(`Saved ${r.name}: tempo ${state.bpm}, 4/4, one track per chair.`, "ok"); } }
  catch (e) { expMsg("Export failed: " + (e && e.message || e), "bad"); } finally { $("expProg").hidden = true; } }
// ---------- Lemon Squeezy (empty config = checkout opening soon, full exports free) ----------
const LEMON = { checkoutUrl: "", storeId: null, productId: null, price: "$19 once" };
const LS_API = "https://api.lemonsqueezy.com/v1/licenses/";
const lic = loadJSON(APP + "-license") || { valid: false };
const configured = () => !!(LEMON.storeId && LEMON.productId);
const gated = () => configured() && !lic.valid;
const FREE_BARS = 8;
if (!configured()) lic.valid = false;
async function lsCall(action, params){ const r = await fetch(LS_API + action, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params).toString() }); return r.json(); }
const ours = j => !!j && j.meta && +j.meta.store_id === +LEMON.storeId && +j.meta.product_id === +LEMON.productId;
async function activateKey(key){ if (!configured()) return { ok: false, reason: "Checkout opening soon. License keys can't be checked until the store is live." };
  const j = await lsCall("activate", { license_key: key, instance_name: BRAND + " web" }); if (!j.activated) return { ok: false, reason: j.error || "That key could not be activated." };
  if (!ours(j)) { if (j.instance) lsCall("deactivate", { license_key: key, instance_id: j.instance.id }).catch(() => {}); return { ok: false, reason: "That key is for a different product." }; }
  return { ok: true, instance: j.instance.id }; }
const saveLic = () => localStorage.setItem(APP + "-license", JSON.stringify(lic));
function paintLicense(){ const b = $("buy"); if (configured() && LEMON.checkoutUrl) { b.textContent = "Unlock " + BRAND + " · " + LEMON.price; b.disabled = false; b.onclick = () => window.open(LEMON.checkoutUrl, "_blank", "noopener"); } else { b.textContent = "Checkout opening soon · " + LEMON.price; b.disabled = true; }
  $("licState").textContent = !configured() ? `Launch: full exports free until checkout opens. WAV + MIDI at every length (4, 8 or 16 bars). (${LEMON.price} when checkout opens.)` : lic.valid ? "Unlocked: exports at every length." : `Free: play, record, every recipe; exports up to ${FREE_BARS} bars. Unlock adds 16-bar exports.`; }
// ---------- UI ----------
function setStatus(m){ $("status").textContent = m; }
function paintTransport(){ $("play").textContent = play ? "■ Stop" : "▶ Play gallop + band"; $("play").classList.toggle("on", !!play); $("rec").classList.toggle("on", rec); $("rec").textContent = rec ? "● Recording… (press to keep)" : "● Rec take"; }
function paintSteps(k){ const i = k < 0 ? -1 : k % STEPS; $("steps").querySelectorAll("div").forEach((d, j) => d.classList.toggle("cur", j === i)); $("grid").querySelectorAll("button").forEach((d, j) => d.classList.toggle("cur", j === i));
  $("pos").textContent = k < 0 ? "bar – · beat –" : `bar ${Math.floor(k / STEPS) + 1} · beat ${Math.floor(i / 4) + 1}.${i % 4 + 1} · ${chName(chordAt(Math.floor(k / STEPS)))}`; }
const pct = x => Math.round(x * 100) + "%";
function paintCompVals(){ $("ring_v").textContent = state.ring.toFixed(1) + " steps"; $("spread_v").textContent = Math.round(state.spread * 1000) + " ms"; $("trem_v").textContent = pct(state.trem); $("crush_v").textContent = pct(state.crush); $("whistle_v").textContent = pct(state.whistle); }
function paintComp(){ $("recipe").value = RECIPES[state.recipe] ? state.recipe : "custom"; for (const id of ["ring", "spread", "trem", "crush", "whistle"]) $(id).value = state[id]; paintCompVals(); $("drums").value = state.drums;
  $("grid").innerHTML = [...state.pattern].map((b, i) => `<button data-i="${i}" class="${b === "-" ? "rest" : "on " + b}" title="16th ${i + 1}: ${b}">${b === "-" ? (i % 4 === 0 ? i / 4 + 1 : "") : b}</button>`).join("");
  const R = RECIPES[state.recipe]; $("recipeNote").textContent = R ? R.note + " Click steps to cycle the move." : "Custom pattern. Click steps to cycle."; }
function paintVoice(){ $("voice").value = state.voice; $("bright").value = state.bright; $("bright_v").textContent = pct(state.bright);
  $("atk").value = state.atk; $("atk_v").textContent = Math.round(state.atk * 1000) + " ms"; $("rel").value = state.rel; $("rel_v").textContent = Math.round(state.rel * 1000) + " ms"; $("lock").checked = state.lock;
  $("voiceNote").textContent = "All voices are synthesized in your browser and named for what makes them. Attack and release are real gain ramps (release never under 10 ms); held twang decays to a sustain floor and holds."; }
function paintSong(){ $("bpm").value = state.bpm; $("key").value = state.keyRoot; $("mode").value = state.mode; $("bars").value = state.bars; $("chords").value = state.chordsText; $("quant").checked = state.quant; const p = parseChords(state.chordsText); $("chordErr").textContent = p.err || ""; }
function paintMix(){ $("mix").innerHTML = CHAIRS.map(c => `<div class="ch"><label>${esc(c.name)}</label><input type="range" min="0" max="1.2" step="0.01" value="${state.gains[c.id]}" data-g="${c.id}"><button class="mini ${state.mutes[c.id] ? "on" : ""}" data-m="${c.id}">${state.mutes[c.id] ? "muted" : "mute"}</button></div>`).join(""); }
function paintTake(){ $("takeInfo").textContent = state.take.length ? `Your take: ${state.take.length} notes on the ${state.bars}-bar loop. They feed the gallop engine and are what the export renders.` : "No take yet: the export gallops your chords one per bar. Press Rec while playing to capture your own voicings."; }
function paintKeys(){ const lo = state.kbdOct * 12, el = $("keys"), W = 100 / 15; let html = "", wi = 0; for (let n = lo; n < lo + 25; n++) { const b = [1, 3, 6, 8, 10].includes(pc(n)); if (b) html += `<div class="b" data-n="${n}" style="left:${(wi - 0.32) * W}%;width:${W * 0.64}%"></div>`; else { html += `<div class="w" data-n="${n}" style="left:${wi * W}%;width:${W}%"></div>`; wi++; } } el.innerHTML = html; }
function paintAll(){ paintSong(); paintComp(); paintVoice(); paintMix(); paintTake(); paintLicense(); paintTransport(); }
function setSetting(k, v){ if (k === "bpm") { v = clamp(Math.round(+v || 68), 60, 180); state.bpm = v; applyTrem(); }
  else if (k === "keyRoot" || k === "mode") { const old = state.keyRoot, nv = k === "keyRoot" ? +v : state.keyRoot, d = ((nv - old + 18) % 12) - 6; if (k === "keyRoot" && d) transposeAll(d); state[k] = k === "keyRoot" ? +v : v; }
  else if (k === "recipe") { const R = RECIPES[v]; if (R) { state.recipe = v; state.pattern = R.p; state.ring = R.ring; state.spread = R.spread; state.trem = R.trem; state.crush = R.crush; state.whistle = R.whistle; state.hp = R.hp; state.drums = R.drums; applyTrem(); applyCrush(); } }
  else if (k === "bars") { state.bars = +v; const L = state.bars * STEPS; state.take = state.take.filter(n => n.s < L); if (play) play.step = play.step % L; }
  else if (k === "mute") { state.mutes[v[0]] = v[1]; applyMix(); } else if (k === "gain") { state.gains[v[0]] = +v[1]; applyMix(); }
  else state[k] = typeof DEF[k] === "number" ? +v : v;
  save(); paintAll(); if (k === "kbdOct") paintKeys(); }
function transposeAll(d){ const p = parseChords(state.chordsText); if (p.list) state.chordsText = p.list.map(c => (useSharps() ? NAMES_S : NAMES)[pc(c.root + d)] + c.q).join(" "); state.take = state.take.map(n => Object.assign({}, n, { n: clamp(n.n + d, 0, 127) })); }
const KB = "awsedftgyhujkolp;"; const kbDown = new Set();
function bind(){ $("key").innerHTML = NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join(""); $("recipe").innerHTML = Object.entries(RECIPES).map(([k, r]) => `<option value="${k}">${esc(r.name)}</option>`).join("") + '<option value="custom" disabled>Custom (edited)</option>';
  $("drums").innerHTML = Object.entries(DRUMS).map(([k, d]) => `<option value="${k}">${esc(d.name)}</option>`).join(""); $("voice").innerHTML = Object.entries(VOICES).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join("");
  $("steps").innerHTML = "<div></div>".repeat(STEPS);
  $("tapBtn").onclick = async () => { $("tap").classList.add("hide"); await ensureCtx(); listDevices(); setStatus(ctx.state === "running" ? "Audio on. Play your MIDI keyboard, or press Play to run the gallop engine + band." : "Audio is still suspended: tap anywhere to resume."); };
  document.addEventListener("pointerdown", () => { if (ctx && ctx.state !== "running") ctx.resume(); });
  $("play").onclick = async () => { await ensureCtx(); if (play) stop(); else start(); }; $("rec").onclick = async () => { await ensureCtx(); toggleRec(); };
  $("clear").onclick = () => { state.take = []; save(); paintTake(); setStatus("Take cleared."); };
  $("bpm").onchange = e => setSetting("bpm", e.target.value); $("key").onchange = e => setSetting("keyRoot", e.target.value); $("mode").onchange = e => setSetting("mode", e.target.value); $("bars").onchange = e => setSetting("bars", e.target.value);
  $("chords").onchange = e => { const p = parseChords(e.target.value); $("chordErr").textContent = p.err || ""; if (!p.err) setSetting("chordsText", e.target.value.trim()); };
  $("quant").onchange = e => setSetting("quant", e.target.checked); $("recipe").onchange = e => setSetting("recipe", e.target.value);
  for (const id of ["ring", "spread", "trem", "crush", "whistle"]) $(id).oninput = e => { state[id] = +e.target.value; if (id === "trem") applyTrem(); if (id === "crush") applyCrush(); save(); paintCompVals(); };
  for (const id of ["bright", "atk", "rel"]) $(id).oninput = e => { state[id] = +e.target.value; save(); paintVoice(); };
  $("drums").onchange = e => setSetting("drums", e.target.value); $("voice").onchange = e => setSetting("voice", e.target.value); $("lock").onchange = e => setSetting("lock", e.target.checked);
  $("grid").onclick = e => { const b = e.target.closest("button"); if (!b) return; const i = +b.dataset.i, p = [...state.pattern], ni = (CODE_CYCLE.indexOf(p[i]) + 1) % CODE_CYCLE.length; p[i] = CODE_CYCLE[ni]; state.pattern = p.join(""); if (RECIPES[state.recipe] && RECIPES[state.recipe].p !== state.pattern) state.recipe = "custom"; save(); paintComp(); };
  $("mix").addEventListener("input", e => { const g = e.target.dataset.g; if (g) { state.gains[g] = +e.target.value; save(); applyMix(); } });
  $("mix").addEventListener("click", e => { const m = e.target.dataset.m; if (m) setSetting("mute", [m, !state.mutes[m]]); });
  $("midiIn").onchange = e => { state.midiIn = e.target.value; save(); refreshMidi(); }; $("midiOut").onchange = e => { state.midiOut = e.target.value; save(); refreshMidi(); };
  $("audioOut").onchange = e => { state.audioOut = e.target.value; save(); applySink(); };
  $("wav").onclick = () => doExport("wav"); $("mid").onclick = () => doExport("mid");
  $("licBtn").onclick = async () => { const k = $("licKey").value.trim(); if (!k) return; const r = await activateKey(k); if (r.ok) { lic.valid = true; lic.key = k; lic.instance = r.instance; saveLic(); } $("licState").textContent = r.ok ? "Unlocked." : r.reason; if (r.ok) paintLicense(); };
  const keys = $("keys"), held = new Map(); keys.addEventListener("pointerdown", e => { const k = e.target.closest("[data-n]"); if (!k) return; keys.setPointerCapture(e.pointerId); held.set(e.pointerId, +k.dataset.n); ensureCtx().then(() => liveOn(+k.dataset.n, 0.8, "screen")); });
  const up = e => { const n = held.get(e.pointerId); if (n != null) { held.delete(e.pointerId); liveOff(n, "screen"); } }; keys.addEventListener("pointerup", up); keys.addEventListener("pointercancel", up);
  document.addEventListener("keydown", e => { if (e.repeat || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; const c = e.key.toLowerCase();
    if (c === "z" || c === "x") { state.kbdOct = clamp(state.kbdOct + (c === "z" ? -1 : 1), 1, 7); save(); paintKeys(); return; } if (c === " ") { e.preventDefault(); $("play").click(); return; }
    const i = KB.indexOf(c); if (i < 0) return; const n = state.kbdOct * 12 + i; kbDown.add(c); ensureCtx().then(() => liveOn(n, 0.8, "kbd:" + c)); });
  document.addEventListener("keyup", e => { const c = e.key.toLowerCase(), i = KB.indexOf(c); if (i < 0 || !kbDown.has(c)) return; kbDown.delete(c); liveOff(state.kbdOct * 12 + i, "kbd:" + c); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { const was = !!play; stop(true); liveAllOff(true); if (was) setStatus("Stopped because the tab was hidden. Press Play to start again."); } }); }
function boot(){ bind(); paintAll(); paintKeys(); refreshMidiInit(); }
async function refreshMidiInit(){ if (!navigator.requestMIDIAccess) { $("midiNote").textContent = "This browser has no Web MIDI (Safari/iOS). Use Chrome or Edge with your MIDI keyboard; on-screen and computer keys still play."; return; }
  try { midiAccess = await navigator.requestMIDIAccess({ sysex: false }); midiAccess.onstatechange = refreshMidi; refreshMidi(); } catch (e) { $("midiNote").textContent = "MIDI access was blocked. Allow MIDI for this site to play your keyboard; on-screen keys still play."; } }
window.__gallopwire = { state, ctx: () => ctx, bus: () => bus, play: () => play, start, stop, setSetting, liveOn, liveOff, setSustain, onMidi, exportWavBytes, exportMidBytes, renderMix, activeSources: () => active.size, liveVoices: () => liveVoices.size,
  takeVoices: () => takeVoices.size, toggleRec, recording: () => rec, LEMON, lic, gated, VOICES, CHAIRS, RECIPES, midiOut: () => midiOut, midiIn: () => midiInPort, sustainOn: () => sustain, posAt };
boot();
