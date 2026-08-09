// Хүн 6 — Web Audio: дууны эффект, морин хуурын хөгжим, тохиргоо

import { clamp, randRange } from "../game/utils";

export const AUDIO_SETTINGS_KEY = "malchin-audio";

export const audio = {
  ctx: null as AudioContext | null,
  musicGain: null as GainNode | null,
  sfxGain: null as GainNode | null,
  musicVol: 0.5,
  sfxVol: 0.7,
  musicTimer: 0,
  nextNote: 0,
  started: false,
  /** Аялгууны явц — одоогийн нотын индекс ба өмнөх давтамж */
  melodyIdx: 7,
  lastFreq: 392,
};

export let noiseBuf: AudioBuffer | null = null;

export function loadAudioSettings(): void {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return;
    const v = JSON.parse(raw) as { music?: number; sfx?: number };
    if (typeof v.music === "number") audio.musicVol = clamp(v.music, 0, 1);
    if (typeof v.sfx === "number") audio.sfxVol = clamp(v.sfx, 0, 1);
  } catch {
    // Хадгалсан тохиргоо эвдэрсэн бол default үлдээнэ
  }
}

export function saveAudioSettings(): void {
  try {
    localStorage.setItem(
      AUDIO_SETTINGS_KEY,
      JSON.stringify({ music: audio.musicVol, sfx: audio.sfxVol }),
    );
  } catch {
    // localStorage хаалттай орчинд алдаа хаяхгүй
  }
}

/** Browser-ийн autoplay бодлогын улмаас эхний хэрэглэгчийн үйлдлээр дуудна */
export function ensureAudio(): void {
  if (audio.ctx) {
    if (audio.ctx.state === "suspended") void audio.ctx.resume();
    return;
  }
  if (typeof window === "undefined" || !window.AudioContext) return;
  audio.ctx = new window.AudioContext();
  audio.musicGain = audio.ctx.createGain();
  audio.musicGain.connect(audio.ctx.destination);
  audio.sfxGain = audio.ctx.createGain();
  audio.sfxGain.connect(audio.ctx.destination);
  applyMusicGain();
  applySfxGain();
}

export function setMusicVol(v: number): void {
  audio.musicVol = Math.round(clamp(v, 0, 1) * 100) / 100;
  applyMusicGain();
  saveAudioSettings();
}

export function setSfxVol(v: number): void {
  audio.sfxVol = Math.round(clamp(v, 0, 1) * 100) / 100;
  applySfxGain();
  saveAudioSettings();
}

/** Master music gain — cancelScheduledValues ашиглаж 0% үед бүрэн унтраана */
function applyMusicGain(): void {
  if (!audio.musicGain || !audio.ctx) return;
  const param = audio.musicGain.gain;
  const t = audio.ctx.currentTime;
  param.cancelScheduledValues(t);
  // 0% = бүрэн чимээгүй (0.5 нь ердийн max түвшин)
  param.setValueAtTime(audio.musicVol <= 0 ? 0 : audio.musicVol * 0.5, t);
}

function applySfxGain(): void {
  if (!audio.sfxGain || !audio.ctx) return;
  const param = audio.sfxGain.gain;
  const t = audio.ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(audio.sfxVol <= 0 ? 0 : audio.sfxVol, t);
}

export function getNoiseBuf(ctx: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf;
  const buf = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * 0.5),
    ctx.sampleRate,
  );
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

export function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.3,
  sweepTo?: number,
  delay = 0,
): void {
  if (!audio.ctx || !audio.sfxGain || audio.sfxVol <= 0) return;
  const t0 = audio.ctx.currentTime + delay;
  const o = audio.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (sweepTo !== undefined) {
    o.frequency.exponentialRampToValueAtTime(Math.max(30, sweepTo), t0 + dur);
  }
  const g = audio.ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(audio.sfxGain);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export function noiseBurst(
  dur: number,
  filterFreq: number,
  vol: number,
  delay = 0,
): void {
  if (!audio.ctx || !audio.sfxGain || audio.sfxVol <= 0) return;
  const t0 = audio.ctx.currentTime + delay;
  const src = audio.ctx.createBufferSource();
  src.buffer = getNoiseBuf(audio.ctx);
  src.loop = true;
  const f = audio.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = filterFreq;
  const g = audio.ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(audio.sfxGain);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

export type SfxName =
  | "swing"
  | "hit"
  | "kill"
  | "wolfDeath"
  | "parry"
  | "dodge"
  | "chop"
  | "berry"
  | "eat"
  | "fire"
  | "hurt"
  | "baa"
  | "howl"
  | "levelup"
  | "select"
  | "move"
  | "win"
  | "lose"
  | "alert"
  | "shoot"
  | "gunshot"
  | "bark"
  | "buy";

export function sfx(name: SfxName): void {
  if (!audio.ctx || audio.sfxVol <= 0) return;
  switch (name) {
    case "swing":
      noiseBurst(0.09, 1600, 0.22);
      tone(420, 0.09, "triangle", 0.12, 180);
      break;
    case "hit":
      tone(170, 0.12, "square", 0.28, 60);
      noiseBurst(0.06, 900, 0.18);
      break;
    case "kill":
      tone(500, 0.28, "sawtooth", 0.22, 90);
      noiseBurst(0.2, 700, 0.18);
      break;
    case "wolfDeath":
      tone(440, 0.32, "sawtooth", 0.2, 75);
      noiseBurst(0.18, 620, 0.16);
      break;
    case "parry":
      tone(1180, 0.08, "square", 0.2, 760);
      noiseBurst(0.06, 2400, 0.16);
      break;
    case "dodge":
      noiseBurst(0.07, 1400, 0.14);
      tone(280, 0.07, "triangle", 0.1, 90);
      break;
    case "chop":
      noiseBurst(0.07, 650, 0.38);
      tone(95, 0.06, "square", 0.22);
      break;
    case "berry":
      tone(660, 0.07, "sine", 0.2, 880);
      break;
    case "eat":
      tone(380, 0.06, "sine", 0.2);
      tone(500, 0.06, "sine", 0.2, undefined, 0.09);
      break;
    case "fire":
      noiseBurst(0.5, 420, 0.28);
      tone(160, 0.3, "sine", 0.1, 60);
      break;
    case "hurt":
      tone(230, 0.2, "sawtooth", 0.28, 70);
      break;
    case "baa":
      tone(470, 0.16, "triangle", 0.18, 350);
      tone(470, 0.12, "triangle", 0.12, 390, 0.18);
      break;
    case "howl":
      tone(320, 0.5, "sine", 0.11, 640);
      tone(640, 0.5, "sine", 0.09, 240, 0.5);
      break;
    case "levelup":
      tone(523, 0.14, "sine", 0.24);
      tone(659, 0.14, "sine", 0.24, undefined, 0.13);
      tone(784, 0.24, "sine", 0.24, undefined, 0.26);
      break;
    case "select":
      tone(820, 0.06, "square", 0.12, 1100);
      break;
    case "move":
      tone(520, 0.04, "square", 0.08);
      break;
    case "win":
      [392, 494, 587, 784].forEach((f, i) =>
        tone(f, 0.25, "triangle", 0.24, undefined, i * 0.16),
      );
      break;
    case "lose":
      [320, 240, 170].forEach((f, i) =>
        tone(f, 0.35, "sawtooth", 0.18, undefined, i * 0.22),
      );
      break;
    case "alert":
      tone(880, 0.08, "square", 0.14);
      tone(880, 0.08, "square", 0.14, undefined, 0.14);
      break;
    case "shoot":
      tone(700, 0.08, "square", 0.14, 200);
      noiseBurst(0.05, 2500, 0.12);
      break;
    case "gunshot":
      noiseBurst(0.16, 1400, 0.5);
      tone(130, 0.14, "square", 0.32, 45);
      break;
    case "bark":
      tone(340, 0.07, "square", 0.2, 520);
      tone(300, 0.07, "square", 0.18, 480, 0.12);
      break;
    case "buy":
      tone(587, 0.12, "sine", 0.22);
      tone(880, 0.18, "sine", 0.22, undefined, 0.12);
      break;
  }
}

/**
 * Морин хуурын аялгуу — D пентатоник, хоёр октавын хүрээ.
 * Доод нотоор төгсгөл хийхэд зориулж намуухан бүтэцтэй.
 */
export const MORIN_SCALE = [
  146.83, // D3
  174.61, // F3
  196.0, // G3
  220.0, // A3
  261.63, // C4
  293.66, // D4
  349.23, // F4
  392.0, // G4
  440.0, // A4
  523.25, // C5
  587.33, // D5
];

/**
 * Нэг морин хуурын нот: sawtooth (нумт утасны баялаг обертон) →
 * lowpass + их биеийн резонанс (peaking) → нумын зөөлөн атака.
 * Вибрато хожуу орж ирнэ, өмнөх нотоос гулсаж (portamento) эхэлж болно.
 */
export function morinKhuurNote(
  ctx: AudioContext,
  dest: GainNode,
  t0: number,
  freq: number,
  dur: number,
  fromFreq?: number,
): void {
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  if (fromFreq !== undefined && fromFreq !== freq) {
    // Нот руу гулсаж орох — морин хуурын онцлог
    o.frequency.setValueAtTime(fromFreq, t0);
    o.frequency.exponentialRampToValueAtTime(
      freq,
      t0 + Math.min(0.22, dur * 0.3),
    );
  } else {
    o.frequency.setValueAtTime(freq, t0);
  }

  // Хожуу орж ирдэг вибрато
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 5 + Math.random() * 1.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0, t0);
  lfoGain.gain.linearRampToValueAtTime(0, t0 + dur * 0.3);
  lfoGain.gain.linearRampToValueAtTime(freq * 0.009, t0 + dur * 0.7);
  lfo.connect(lfoGain);
  lfoGain.connect(o.frequency);

  // Утасны гялалзсан өнгийг зөөлрүүлэх шүүлтүүр
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1700;
  lp.Q.value = 0.8;

  // Модон их биеийн резонанс
  const body = ctx.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 620;
  body.Q.value = 1.3;
  body.gain.value = 7;

  // Нумын зөөлөн атака, дундаа бага зэрэг өргөгдөж, аажим суларна
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.085, t0 + 0.14);
  g.gain.linearRampToValueAtTime(0.105, t0 + dur * 0.6);
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.08);

  o.connect(lp);
  lp.connect(body);
  body.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.15);
  lfo.start(t0);
  lfo.stop(t0 + dur + 0.15);
}

export function startMusic(): void {
  if (!audio.ctx || !audio.musicGain || audio.started) return;
  audio.started = true;

  // Хоёр утасны дрон — доод D ба A, бага зэрэг detune хийж амьд болгоно
  for (const [f, det] of [
    [73.42, 0], // D2
    [110.0, 2], // A2
  ] as Array<[number, number]>) {
    const o = audio.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.detune.value = det;
    const lp = audio.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    const g = audio.ctx.createGain();
    g.gain.value = 0.05;
    o.connect(lp);
    lp.connect(g);
    g.connect(audio.musicGain);
    o.start();
  }

  // Аялгуу: алхам алхмаар хөдөлдөг пентатоник фразууд
  audio.melodyIdx = 7; // G4-ээс эхэлнэ
  audio.lastFreq = MORIN_SCALE[audio.melodyIdx];
  audio.nextNote = audio.ctx.currentTime + 0.8;

  audio.musicTimer = window.setInterval(() => {
    const ctx = audio.ctx;
    if (!ctx || !audio.musicGain) return;
    // Ая унтарсан бол шинэ нот гаргахгүй (аль хэдийн эхэлсэн нот master gain-ээр чимээгүй)
    if (audio.musicVol <= 0) {
      audio.nextNote = Math.max(audio.nextNote, ctx.currentTime + 0.8);
      return;
    }
    while (audio.nextNote < ctx.currentTime + 1.6) {
      // Ихэвчлэн зэргэлдээ нот руу, хааяа алгасаж хөдөлнө
      const r = Math.random();
      const step =
        r < 0.55
          ? Math.random() < 0.5
            ? -1
            : 1
          : r < 0.85
            ? Math.random() < 0.5
              ? -2
              : 2
            : Math.random() < 0.6
              ? -3
              : 3;
      audio.melodyIdx = Math.round(
        clamp(audio.melodyIdx + step, 0, MORIN_SCALE.length - 1),
      );
      const freq = MORIN_SCALE[audio.melodyIdx];

      // Фразын төгсгөлд урт нот + завсарлага (уртын дууны амьсгаа)
      const phraseEnd = Math.random() < 0.22;
      const dur = phraseEnd ? randRange(2.0, 3.2) : randRange(0.8, 1.5);
      const slideFrom = Math.random() < 0.5 ? audio.lastFreq : undefined;

      morinKhuurNote(
        ctx,
        audio.musicGain,
        audio.nextNote,
        freq,
        dur,
        slideFrom,
      );
      audio.lastFreq = freq;
      audio.nextNote +=
        dur + (phraseEnd ? randRange(0.7, 1.6) : randRange(-0.08, 0.2));
    }
  }, 250);
}

export function shutdownAudio(): void {
  if (audio.musicTimer) window.clearInterval(audio.musicTimer);
  audio.musicTimer = 0;
  audio.started = false;
  if (audio.ctx) void audio.ctx.close();
  audio.ctx = null;
  audio.musicGain = null;
  audio.sfxGain = null;
  noiseBuf = null;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
