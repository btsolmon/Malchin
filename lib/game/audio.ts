// Хүн 6 — Web Audio: дууны эффект, Хангайн BGM, boss хөгжим, тохиргоо

import { clamp, randRange } from "../game/utils";
import { VIEW_W } from "../game/types";

export const AUDIO_SETTINGS_KEY = "malchin-audio";

export const audio = {
  ctx: null as AudioContext | null,
  musicGain: null as GainNode | null,
  sfxGain: null as GainNode | null,
  musicVol: 0.5,
  sfxVol: 0.7,
  /** Ambient/нээлт үед хөгжим багасах (0–1) */
  musicDuck: 1,
  musicTimer: 0,
  nextNote: 0,
  started: false,
  /** Аялгууны явц — одоогийн нотын индекс ба өмнөх давтамж */
  melodyIdx: 7,
  lastFreq: 392,
  visibilityHandler: null as (() => void) | null,
  /** Нээлтийн ambient давхаргууд */
  openingThunder: null as HTMLAudioElement | null,
  openingWind: null as HTMLAudioElement | null,
  openingCrow: null as HTMLAudioElement | null,
  openingCrowCalls: [] as HTMLAudioElement[],
  openingCrowPrevX: [] as number[],
  openingThunderVol: 0,
  openingWindVol: 0,
  openingCrowVol: 0,
  openingCrowRate: 0,
  openingCrowCooldown: 0,
  openingAmbientOn: false,
  /** Унтах үеийн хурхирах */
  sleepSnore: null as HTMLAudioElement | null,
  /** Гал / зуух шатах loop */
  fireBed: null as HTMLAudioElement | null,
  /** Тоглоомын бороо+аянга (storm) */
  weatherStormBed: null as HTMLAudioElement | null,
  weatherStormVol: 0,
  /** Дэлхийн ambient */
  riverBed: null as HTMLAudioElement | null,
  riverLevel: 0,
  gallopBed: null as HTMLAudioElement | null,
  footBed: null as HTMLAudioElement | null,
  hoofTimer: 0,
  livestockSfxTimer: 0,
  /** Үндсэн BGM — Хангайн дуу (A/B crossfade loop) */
  mainBgmA: null as HTMLAudioElement | null,
  mainBgmB: null as HTMLAudioElement | null,
  mainBgmActive: "a" as "a" | "b",
  mainBgmWatchRaf: 0,
  mainBgmFadeRaf: 0,
  mainBgmCrossfading: false,
  /** Одоогийн үндсэн ая: гаада мээрэн | хангай (гэр бүл) */
  mainBgmTrack: null as "gaada" | "hangai" | null,
  /** startMainBgm үе бүрт нэмэгдэнэ — хуучин canplay callback-ийг хүчингүй болгоно */
  mainBgmGen: 0,
  /** Төмөр шулмасын boss BGM */
  tumurBossBgm: null as HTMLAudioElement | null,
  tumurBossFadeRaf: 0,
  tumurBossFadeTarget: 0,
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
    if (audio.ctx.state === "suspended") {
      void audio.ctx.resume().then(() => {
        refreshMasterGains();
        // Tab-аас буцахад хоцорсон нотууд чимээгүй тоглохгүй
        if (audio.ctx) audio.nextNote = audio.ctx.currentTime + 0.05;
      });
    }
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
  syncMainBgmVolume(true);
  syncTumurBossBgmVolume();
  saveAudioSettings();
}

export function setSfxVol(v: number): void {
  audio.sfxVol = Math.round(clamp(v, 0, 1) * 100) / 100;
  applySfxGain();
  refreshOpeningAmbientVolumes();
  if (audio.fireBed && !audio.fireBed.paused) {
    audio.fireBed.volume = clamp(audio.sfxVol * CAMPFIRE_LOOP_VOL, 0, 1);
  }
  refreshWeatherStormVolume();
  saveAudioSettings();
}

/** Master music gain — cancelScheduledValues ашиглаж 0% үед бүрэн унтраана */
function applyMusicGain(): void {
  if (!audio.musicGain || !audio.ctx) return;
  const param = audio.musicGain.gain;
  const t = audio.ctx.currentTime;
  param.cancelScheduledValues(t);
  // 0% = бүрэн чимээгүй (0.5 нь ердийн max түвшин)
  const base = audio.musicVol <= 0 ? 0 : audio.musicVol * 0.5;
  param.setValueAtTime(base * clamp(audio.musicDuck, 0, 1), t);
}

function setMusicDuck(mult: number): void {
  audio.musicDuck = clamp(mult, 0, 1);
  applyMusicGain();
  refreshOpeningAmbientVolumes();
  syncMainBgmVolume(true);
}

function applySfxGain(): void {
  if (!audio.sfxGain || !audio.ctx) return;
  const param = audio.sfxGain.gain;
  const t = audio.ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(audio.sfxVol <= 0 ? 0 : audio.sfxVol, t);
}

/** Tab буцаж ирэх / resume үед master gain дахин тогтооно */
function refreshMasterGains(): void {
  applyMusicGain();
  applySfxGain();
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
  | "woodChop"
  | "berry"
  | "eat"
  | "fire"
  | "hurt"
  | "yell"
  | "baa"
  | "moo"
  | "howl"
  | "witchLaugh"
  | "stone"
  | "snore"
  | "door"
  | "gate"
  | "hoof"
  | "neigh"
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

/** Бодит SFX файл — байхгүй бол synth fallback */
const SAMPLE_SFX: Partial<Record<SfxName, string>> = {
  woodChop: "/assets/sfx/wood-chop.m4a",
  door: "/assets/sfx/door.mp3",
  gate: "/assets/sfx/door.mp3",
  howl: "/assets/sfx/wolf-howl.m4a",
  witchLaugh: "/assets/sfx/witch-laugh.m4a",
  stone: "/assets/sfx/stone-gather.wav",
  snore: "/assets/sfx/sleep-snore.wav",
  baa: "/assets/sfx/sheep-baa.m4a",
  moo: "/assets/sfx/cow-moo.m4a",
  neigh: "/assets/sfx/horse-neigh.mp3",
};

const SAMPLE_VOL: Partial<Record<SfxName, number>> = {
  woodChop: 0.9,
  door: 0.72,
  gate: 0.55,
  howl: 0.78,
  witchLaugh: 0.82,
  stone: 0.88,
  snore: 0.55,
  baa: 0.75,
  moo: 0.78,
  neigh: 0.82,
};

const activeSamplePool: HTMLAudioElement[] = [];

function playSample(src: string, volMult: number): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (audio.sfxVol <= 0) return;
  while (activeSamplePool.length > 6) {
    const old = activeSamplePool.shift();
    if (old) {
      old.pause();
      old.removeAttribute("src");
    }
  }
  const a = new Audio(src);
  a.preload = "auto";
  a.volume = clamp(audio.sfxVol * volMult, 0, 1);
  activeSamplePool.push(a);
  const cleanup = (): void => {
    const i = activeSamplePool.indexOf(a);
    if (i >= 0) activeSamplePool.splice(i, 1);
  };
  a.addEventListener("ended", cleanup, { once: true });
  a.addEventListener("error", cleanup, { once: true });
  void a.play().catch(cleanup);
}

export function sfx(name: SfxName): void {
  if (audio.sfxVol <= 0) return;
  ensureAudio();

  const sampleSrc = SAMPLE_SFX[name];
  if (sampleSrc) {
    playSample(sampleSrc, SAMPLE_VOL[name] ?? 0.7);
    return;
  }

  if (!audio.ctx) return;
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
    case "woodChop":
      noiseBurst(0.08, 900, 0.42);
      tone(110, 0.07, "square", 0.26, 55);
      noiseBurst(0.05, 400, 0.2, 0.04);
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
    case "yell":
      // Цочсон орилоо — өндөр, хурц
      tone(420, 0.12, "sawtooth", 0.22, 680);
      tone(560, 0.22, "triangle", 0.18, 320, 0.06);
      tone(380, 0.18, "sine", 0.12, 520, 0.14);
      noiseBurst(0.12, 900, 0.1, 0.04);
      break;
    case "baa":
      tone(520, 0.14, "sawtooth", 0.14, 380);
      tone(480, 0.18, "triangle", 0.16, 320, 0.08);
      tone(400, 0.12, "triangle", 0.1, 280, 0.2);
      break;
    case "moo":
      tone(180, 0.35, "sawtooth", 0.12, 140);
      tone(160, 0.4, "triangle", 0.14, 110, 0.12);
      break;
    case "howl":
      tone(280, 0.7, "sine", 0.1, 520);
      tone(420, 0.85, "sine", 0.09, 680, 0.15);
      tone(620, 0.55, "sine", 0.07, 300, 0.55);
      noiseBurst(0.35, 500, 0.06, 0.2);
      break;
    case "witchLaugh":
      tone(380, 0.15, "sawtooth", 0.1, 520);
      tone(520, 0.2, "triangle", 0.08, 300, 0.12);
      tone(280, 0.25, "sine", 0.07, 420, 0.28);
      break;
    case "stone":
      noiseBurst(0.06, 900, 0.32);
      tone(220, 0.05, "square", 0.14, 90);
      noiseBurst(0.04, 1400, 0.18, 0.03);
      break;
    case "snore":
      noiseBurst(0.35, 280, 0.12);
      tone(95, 0.4, "sine", 0.08, 70);
      break;
    case "door":
      noiseBurst(0.12, 1200, 0.28);
      tone(140, 0.1, "square", 0.16, 70);
      noiseBurst(0.08, 600, 0.14, 0.08);
      break;
    case "gate":
      noiseBurst(0.1, 1800, 0.22);
      tone(220, 0.08, "square", 0.14, 90);
      tone(160, 0.12, "triangle", 0.1, 80, 0.06);
      break;
    case "hoof":
      noiseBurst(0.045, 700, 0.28);
      tone(90, 0.04, "sine", 0.12);
      break;
    case "neigh":
      tone(320, 0.2, "sawtooth", 0.12, 260);
      tone(280, 0.25, "triangle", 0.1, 200, 0.1);
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
  ensureAudio();
  if (!audio.ctx) return;
  if (audio.started) {
    void audio.ctx.resume().then(() => {
      refreshMasterGains();
      resumeMainBgm();
    });
    return;
  }
  audio.started = true;
  startGaadaTheme();

  if (typeof document !== "undefined") {
    const onVisibility = (): void => {
      if (document.hidden || !audio.ctx) return;
      if (audio.ctx.state === "suspended") {
        void audio.ctx.resume().then(() => {
          refreshMasterGains();
          resumeMainBgm();
        });
      } else {
        refreshMasterGains();
        resumeMainBgm();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    audio.visibilityHandler = onVisibility;
  }
}

export function shutdownAudio(): void {
  stopOpeningAmbient();
  stopSleepSnore();
  stopCampfireLoop();
  stopWeatherStormAmbience();
  stopRiverAmbience();
  stopMainBgm();
  stopTumurBossMusicImmediate();
  if (audio.musicTimer) window.clearInterval(audio.musicTimer);
  audio.musicTimer = 0;
  audio.started = false;
  if (audio.visibilityHandler && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", audio.visibilityHandler);
    audio.visibilityHandler = null;
  }
  if (audio.ctx) void audio.ctx.close();
  audio.ctx = null;
  audio.musicGain = null;
  audio.sfxGain = null;
  noiseBuf = null;
}

// ---------------------------------------------------------------------------
// Үндсэн BGM — Гаада мээрэн / Хангай (зөөлөн эхлэл + crossfade loop)
// ---------------------------------------------------------------------------

const GAADA_BGM_SRC = "/assets/music/gaada-meeren.mp3";
const HANGAI_BGM_SRC = "/assets/music/hangai-theme.mp3";
const MAIN_BGM_LEVEL = 0.52;
/** Эхлэхэд fade-in */
const MAIN_BGM_INTRO_FADE_SEC = 3.2;
/** Төгсгөл↔эхлэл давхцуулж loop */
const MAIN_BGM_CROSSFADE_SEC = 3.5;

function mainBgmTargetVolume(): number {
  if (audio.musicVol <= 0) return 0;
  return clamp(
    audio.musicVol * MAIN_BGM_LEVEL * clamp(audio.musicDuck, 0, 1),
    0,
    1,
  );
}

function makeMainBgmEl(src: string): HTMLAudioElement {
  const a = new Audio();
  a.preload = "auto";
  a.loop = false;
  a.volume = 0;
  a.src = src;
  a.load();
  return a;
}

function mainBgmSrcMatches(
  el: HTMLAudioElement | null,
  track: "gaada" | "hangai",
): boolean {
  if (!el) return false;
  const src = `${el.currentSrc || el.src || ""}`;
  const file = track === "hangai" ? "hangai-theme" : "gaada-meeren";
  return src.includes(file);
}

function getMainBgmPair(): {
  active: HTMLAudioElement | null;
  idle: HTMLAudioElement | null;
} {
  const a = audio.mainBgmA;
  const b = audio.mainBgmB;
  if (audio.mainBgmActive === "a") return { active: a, idle: b };
  return { active: b, idle: a };
}

function cancelMainBgmFade(): void {
  if (audio.mainBgmFadeRaf && typeof window !== "undefined") {
    window.cancelAnimationFrame(audio.mainBgmFadeRaf);
  }
  audio.mainBgmFadeRaf = 0;
}

function cancelMainBgmWatch(): void {
  if (audio.mainBgmWatchRaf && typeof window !== "undefined") {
    window.cancelAnimationFrame(audio.mainBgmWatchRaf);
  }
  audio.mainBgmWatchRaf = 0;
}

function disposeMainBgmEl(a: HTMLAudioElement | null): void {
  if (!a) return;
  a.pause();
  a.ontimeupdate = null;
  a.onended = null;
  a.onerror = null;
  a.removeAttribute("src");
  a.load();
}

function stopMainBgm(): void {
  cancelMainBgmFade();
  cancelMainBgmWatch();
  audio.mainBgmCrossfading = false;
  disposeMainBgmEl(audio.mainBgmA);
  disposeMainBgmEl(audio.mainBgmB);
  audio.mainBgmA = null;
  audio.mainBgmB = null;
  audio.mainBgmActive = "a";
  audio.mainBgmTrack = null;
}

function syncMainBgmVolume(force = false): void {
  if (!force && (audio.mainBgmFadeRaf || audio.mainBgmCrossfading)) return;
  const target = mainBgmTargetVolume();
  const { active, idle } = getMainBgmPair();
  if (active) active.volume = target;
  if (idle && !audio.mainBgmCrossfading) idle.volume = 0;
}

function fadeMainElTo(
  el: HTMLAudioElement,
  target: number,
  durationSec: number,
  onDone?: () => void,
): void {
  cancelMainBgmFade();
  const startVol = el.volume;
  const endVol = clamp(target, 0, 1);
  if (durationSec <= 0.05) {
    el.volume = endVol;
    onDone?.();
    return;
  }
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const durationMs = durationSec * 1000;
  const step = (now: number): void => {
    const t = clamp((now - t0) / durationMs, 0, 1);
    const ease = 1 - (1 - t) * (1 - t);
    el.volume = startVol + (endVol - startVol) * ease;
    if (t < 1) {
      audio.mainBgmFadeRaf = window.requestAnimationFrame(step);
      return;
    }
    audio.mainBgmFadeRaf = 0;
    el.volume = endVol;
    onDone?.();
  };
  audio.mainBgmFadeRaf = window.requestAnimationFrame(step);
}

function crossfadeMainBgm(
  from: HTMLAudioElement,
  to: HTMLAudioElement,
  durationSec: number,
): void {
  cancelMainBgmFade();
  audio.mainBgmCrossfading = true;
  const target = mainBgmTargetVolume();
  to.currentTime = 0;
  to.volume = 0;
  void to.play().catch(() => {
    audio.mainBgmCrossfading = false;
  });

  const startFrom = from.volume;
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const durationMs = Math.max(200, durationSec * 1000);

  const step = (now: number): void => {
    const t = clamp((now - t0) / durationMs, 0, 1);
    // Equal-power-ish soft curve
    const ease = t * t * (3 - 2 * t);
    from.volume = startFrom * (1 - ease);
    to.volume = target * ease;
    if (t < 1) {
      audio.mainBgmFadeRaf = window.requestAnimationFrame(step);
      return;
    }
    audio.mainBgmFadeRaf = 0;
    from.pause();
    from.currentTime = 0;
    from.volume = 0;
    to.volume = target;
    audio.mainBgmActive = audio.mainBgmActive === "a" ? "b" : "a";
    audio.mainBgmCrossfading = false;
  };
  audio.mainBgmFadeRaf = window.requestAnimationFrame(step);
}

function watchMainBgmLoop(): void {
  cancelMainBgmWatch();
  const tick = (): void => {
    audio.mainBgmWatchRaf = window.requestAnimationFrame(tick);
    if (audio.mainBgmCrossfading) return;
    const { active, idle } = getMainBgmPair();
    if (!active || !idle) return;
    if (!Number.isFinite(active.duration) || active.duration < 8) {
      // Metadata болоогүй / хэт богино — энгийн loop
      active.loop = true;
      return;
    }
    active.loop = false;
    const remain = active.duration - active.currentTime;
    const fade = Math.min(MAIN_BGM_CROSSFADE_SEC, active.duration * 0.22);
    if (remain <= fade && remain > 0) {
      crossfadeMainBgm(active, idle, fade);
    }
  };
  audio.mainBgmWatchRaf = window.requestAnimationFrame(tick);
}

function resumeMainBgm(): void {
  const { active } = getMainBgmPair();
  if (!active) return;
  if (active.paused) void active.play().catch(() => {});
  syncMainBgmVolume(true);
}

function startMainBgm(
  src: string,
  track: "gaada" | "hangai",
  introFadeSec = MAIN_BGM_INTRO_FADE_SEC,
): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (
    audio.mainBgmTrack === track &&
    mainBgmSrcMatches(audio.mainBgmA, track)
  ) {
    syncMainBgmVolume(true);
    resumeMainBgm();
    return;
  }
  stopMainBgm();
  audio.mainBgmTrack = track;
  const gen = ++audio.mainBgmGen;
  audio.mainBgmA = makeMainBgmEl(src);
  audio.mainBgmB = makeMainBgmEl(src);
  audio.mainBgmActive = "a";
  const a = audio.mainBgmA;

  let started = false;
  const begin = (): void => {
    if (started || audio.mainBgmGen !== gen || audio.mainBgmA !== a) return;
    started = true;
    a.volume = 0;
    void a
      .play()
      .then(() => {
        if (audio.mainBgmGen !== gen || audio.mainBgmA !== a) return;
        fadeMainElTo(a, mainBgmTargetVolume(), introFadeSec);
        watchMainBgmLoop();
      })
      .catch(() => {
        started = false;
      });
  };

  a.addEventListener("canplay", begin, { once: true });
  a.addEventListener("loadeddata", begin, { once: true });
  if (a.readyState >= 2) begin();
}

/** Тоглоомын үндсэн ая — Гаада мээрэн */
export function startGaadaTheme(): void {
  ensureAudio();
  if (!audio.started) audio.started = true;
  startMainBgm(GAADA_BGM_SRC, "gaada", MAIN_BGM_INTRO_FADE_SEC);
}

/**
 * Аав ээжийг аварч хамт амьдарч эхлэхэд — Хангайн дуу
 * (үндсэн аяг солиод fade-in + loop)
 */
export function startFamilyLifeTheme(): void {
  ensureAudio();
  if (!audio.started) audio.started = true;
  startMainBgm(HANGAI_BGM_SRC, "hangai", 3.6);
}

/** Төлөвөөс зөв аяг барина — шинэ тоглоом / үе давах / cheat / load */
export function syncStoryMusic(state: {
  parentsReturned: boolean;
  story: { milestone8Started?: boolean; milestone8Completed?: boolean };
  world: { tumurShulmas: { active: boolean; defeated: boolean } };
}): void {
  const bossFight =
    state.world.tumurShulmas.active && !state.world.tumurShulmas.defeated;

  if (bossFight) {
    startTumurBossMusic();
    return;
  }

  const fadingBossOut =
    !!audio.tumurBossBgm &&
    audio.tumurBossFadeRaf > 0 &&
    audio.tumurBossFadeTarget === 0;
  if (audio.tumurBossBgm && !fadingBossOut) {
    stopTumurBossMusic();
  }

  const family =
    state.parentsReturned ||
    !!state.story.milestone8Started ||
    !!state.story.milestone8Completed;
  const want: "gaada" | "hangai" = family ? "hangai" : "gaada";
  if (
    audio.mainBgmTrack === want &&
    mainBgmSrcMatches(audio.mainBgmA, want)
  ) {
    resumeMainBgm();
    return;
  }
  if (family) startFamilyLifeTheme();
  else startGaadaTheme();
}

// ---------------------------------------------------------------------------
// Төмөр шулмас boss BGM
// ---------------------------------------------------------------------------

const TUMUR_BOSS_BGM_SRC = "/assets/music/tumur-shulmas-boss.mp3";
/** The HU — Sad But True: intro алгасаад 41с-ээс */
const TUMUR_BOSS_START_SEC = 41;
/** musicVol-той харьцуулсан дээд түвшин */
const TUMUR_BOSS_BGM_LEVEL = 0.72;

function tumurBossTargetVolume(): number {
  if (audio.musicVol <= 0) return 0;
  return clamp(audio.musicVol * TUMUR_BOSS_BGM_LEVEL, 0, 1);
}

function cancelTumurBossFade(): void {
  if (audio.tumurBossFadeRaf && typeof window !== "undefined") {
    window.cancelAnimationFrame(audio.tumurBossFadeRaf);
  }
  audio.tumurBossFadeRaf = 0;
}

function disposeTumurBossBgmEl(a: HTMLAudioElement | null): void {
  if (!a) return;
  a.pause();
  a.ontimeupdate = null;
  a.onended = null;
  a.onerror = null;
  a.removeAttribute("src");
  a.load();
}

function stopTumurBossMusicImmediate(): void {
  cancelTumurBossFade();
  disposeTumurBossBgmEl(audio.tumurBossBgm);
  audio.tumurBossBgm = null;
  audio.tumurBossFadeTarget = 0;
}

function syncTumurBossBgmVolume(): void {
  const a = audio.tumurBossBgm;
  if (!a || audio.tumurBossFadeRaf) return;
  a.volume = tumurBossTargetVolume();
}

function fadeTumurBossBgmTo(
  target: number,
  durationSec: number,
  onDone?: () => void,
): void {
  const a = audio.tumurBossBgm;
  if (!a) {
    onDone?.();
    return;
  }
  cancelTumurBossFade();
  const startVol = a.volume;
  const endVol = clamp(target, 0, 1);
  audio.tumurBossFadeTarget = endVol;
  if (durationSec <= 0.05) {
    a.volume = endVol;
    onDone?.();
    return;
  }
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const durationMs = durationSec * 1000;

  const step = (now: number): void => {
    if (audio.tumurBossBgm !== a) return;
    const t = clamp((now - t0) / durationMs, 0, 1);
    // Зөөлөн ease-out
    const ease = 1 - (1 - t) * (1 - t);
    a.volume = startVol + (endVol - startVol) * ease;
    if (t < 1) {
      audio.tumurBossFadeRaf = window.requestAnimationFrame(step);
      return;
    }
    audio.tumurBossFadeRaf = 0;
    a.volume = endVol;
    onDone?.();
  };
  audio.tumurBossFadeRaf = window.requestAnimationFrame(step);
}

/** Тулаан эхлэхэд — үндсэн BGM duck хийж boss track асаана */
export function startTumurBossMusic(): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  ensureAudio();
  if (audio.tumurBossBgm) {
    setMusicDuck(0.06);
    if (audio.tumurBossBgm.paused) {
      void audio.tumurBossBgm.play().catch(() => {});
    }
    syncTumurBossBgmVolume();
    return;
  }
  stopTumurBossMusicImmediate();
  // Хангайн ая бараг унтарна
  setMusicDuck(0.06);

  const a = new Audio(TUMUR_BOSS_BGM_SRC);
  a.preload = "auto";
  a.loop = false;
  a.volume = 0;
  audio.tumurBossBgm = a;

  const seekToDrop = (): void => {
    if (a.currentTime < TUMUR_BOSS_START_SEC - 0.05) {
      a.currentTime = TUMUR_BOSS_START_SEC;
    }
  };

  a.ontimeupdate = (): void => {
    if (audio.tumurBossBgm !== a) return;
    if (a.currentTime < TUMUR_BOSS_START_SEC - 0.2) {
      a.currentTime = TUMUR_BOSS_START_SEC;
      return;
    }
    if (Number.isFinite(a.duration) && a.duration > TUMUR_BOSS_START_SEC + 1) {
      if (a.currentTime >= a.duration - 0.2) {
        a.currentTime = TUMUR_BOSS_START_SEC;
      }
    }
  };
  a.onended = (): void => {
    if (audio.tumurBossBgm !== a) return;
    a.currentTime = TUMUR_BOSS_START_SEC;
    void a.play().catch(() => {});
  };

  const play = (): void => {
    if (audio.tumurBossBgm !== a) return;
    seekToDrop();
    void a
      .play()
      .then(() => {
        if (audio.tumurBossBgm !== a) return;
        seekToDrop();
        fadeTumurBossBgmTo(tumurBossTargetVolume(), 1.1);
      })
      .catch(() => {
        // Autoplay / файл байхгүй — үндсэн BGM сэргээнэ
        if (audio.tumurBossBgm === a) {
          stopTumurBossMusicImmediate();
          setMusicDuck(1);
        }
      });
  };

  if (a.readyState >= 1) play();
  else a.addEventListener("loadedmetadata", play, { once: true });
}

/** Ялалт / тулаан төгсөхөд зөөлөн fade */
export function fadeOutTumurBossMusic(durationSec = 3.8): void {
  const a = audio.tumurBossBgm;
  if (!a) {
    setMusicDuck(1);
    return;
  }
  fadeTumurBossBgmTo(0, durationSec, () => {
    stopTumurBossMusicImmediate();
    setMusicDuck(1);
  });
}

export function stopTumurBossMusic(): void {
  stopTumurBossMusicImmediate();
  setMusicDuck(1);
}

// ---------------------------------------------------------------------------
// Дэлхийн ambient — гол / туурай / алхаа / мал
// ---------------------------------------------------------------------------

const WORLD_BED_SRC = {
  river: "/assets/sfx/river.m4a",
  gallop: "/assets/sfx/horse-gallop.m4a",
  foot: "/assets/sfx/footsteps.m4a",
} as const;

function makeWorldBed(src: string): HTMLAudioElement {
  const a = new Audio(src);
  a.preload = "auto";
  a.loop = true;
  a.volume = 0;
  return a;
}

export function stopRiverAmbience(): void {
  if (audio.riverBed) {
    audio.riverBed.pause();
    audio.riverBed.removeAttribute("src");
    audio.riverBed.load();
  }
  audio.riverBed = null;
  audio.riverLevel = 0;
  stopMovementBeds();
  if (audio.gallopBed) {
    audio.gallopBed.removeAttribute("src");
    audio.gallopBed.load();
    audio.gallopBed = null;
  }
  if (audio.footBed) {
    audio.footBed.removeAttribute("src");
    audio.footBed.load();
    audio.footBed = null;
  }
}

function stopMovementBeds(): void {
  if (audio.gallopBed) {
    audio.gallopBed.pause();
    audio.gallopBed.volume = 0;
  }
  if (audio.footBed) {
    audio.footBed.pause();
    audio.footBed.volume = 0;
  }
}

/**
 * @param proximity 0–1 (голын эрэг/ус ойртох)
 */
export function updateRiverAmbience(proximity: number): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (audio.sfxVol <= 0) {
    if (audio.riverBed) audio.riverBed.volume = 0;
    return;
  }
  const target = clamp(proximity, 0, 1);
  audio.riverLevel += (target - audio.riverLevel) * 0.14;
  if (audio.riverLevel < 0.02 && target < 0.02) {
    if (audio.riverBed && !audio.riverBed.paused) {
      audio.riverBed.pause();
      audio.riverBed.volume = 0;
    }
    return;
  }
  ensureAudio();
  if (!audio.riverBed) audio.riverBed = makeWorldBed(WORLD_BED_SRC.river);
  const vol = audio.sfxVol * audio.riverLevel * 0.55;
  audio.riverBed.volume = clamp(vol, 0, 1);
  if (audio.riverBed.paused) void audio.riverBed.play().catch(() => {});
}

/** Морьний галоп + явганы алхаа */
export function tickHoofsteps(
  dt: number,
  riding: boolean,
  moving: boolean,
): void {
  void dt;
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (audio.sfxVol <= 0) {
    stopMovementBeds();
    return;
  }
  ensureAudio();

  const wantGallop = riding && moving;
  const wantFoot = !riding && moving;

  if (wantGallop) {
    if (!audio.gallopBed) audio.gallopBed = makeWorldBed(WORLD_BED_SRC.gallop);
    audio.gallopBed.volume = clamp(audio.sfxVol * 0.48, 0, 1);
    if (audio.gallopBed.paused) void audio.gallopBed.play().catch(() => {});
  } else if (audio.gallopBed && !audio.gallopBed.paused) {
    audio.gallopBed.pause();
    audio.gallopBed.volume = 0;
  }

  if (wantFoot) {
    if (!audio.footBed) audio.footBed = makeWorldBed(WORLD_BED_SRC.foot);
    audio.footBed.volume = clamp(audio.sfxVol * 0.32, 0, 1);
    if (audio.footBed.paused) void audio.footBed.play().catch(() => {});
  } else if (audio.footBed && !audio.footBed.paused) {
    audio.footBed.pause();
    audio.footBed.volume = 0;
  }
}

/** Ойрхон малын майлалт */
export function tickLivestockVocal(
  dt: number,
  nearSheep: boolean,
  nearCattle: boolean,
): void {
  if ((!nearSheep && !nearCattle) || audio.sfxVol <= 0) {
    audio.livestockSfxTimer = Math.max(audio.livestockSfxTimer, 1.5);
    return;
  }
  audio.livestockSfxTimer -= dt;
  if (audio.livestockSfxTimer > 0) return;
  audio.livestockSfxTimer = randRange(4.5, 9.5);
  if (nearCattle && (!nearSheep || Math.random() < 0.45)) sfx("moo");
  else sfx("baa");
}

// ---------------------------------------------------------------------------
// Гал — шатах pine loop
// ---------------------------------------------------------------------------

const CAMPFIRE_LOOP_SRC = "/assets/sfx/burning-pine.mp3";
const CAMPFIRE_LOOP_VOL = 0.42;

export function startCampfireLoop(): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (audio.sfxVol <= 0) return;
  ensureAudio();
  if (audio.fireBed && !audio.fireBed.paused) {
    audio.fireBed.volume = clamp(audio.sfxVol * CAMPFIRE_LOOP_VOL, 0, 1);
    return;
  }
  stopCampfireLoop();
  const a = new Audio(CAMPFIRE_LOOP_SRC);
  a.preload = "auto";
  a.loop = true;
  a.volume = clamp(audio.sfxVol * CAMPFIRE_LOOP_VOL, 0, 1);
  audio.fireBed = a;
  void a.play().catch(() => {
    if (audio.fireBed === a) audio.fireBed = null;
  });
}

export function stopCampfireLoop(): void {
  if (!audio.fireBed) return;
  disposeHtmlAudio(audio.fireBed);
  audio.fireBed = null;
}

/** Гал/зуух асаж байвал loop, унтарвал зогсооно */
export function syncCampfireLoop(burning: boolean): void {
  if (burning) startCampfireLoop();
  else stopCampfireLoop();
}

// ---------------------------------------------------------------------------
// Цаг агаар — бороо + аянга (storm)
// ---------------------------------------------------------------------------

const WEATHER_STORM_SRC = "/assets/ambient/thunder-rain.mp3";
const WEATHER_STORM_VOL = 0.48;

function refreshWeatherStormVolume(): void {
  if (!audio.weatherStormBed) return;
  if (audio.sfxVol <= 0 || audio.weatherStormVol <= 0) {
    audio.weatherStormBed.volume = 0;
    return;
  }
  audio.weatherStormBed.volume = clamp(
    audio.sfxVol * WEATHER_STORM_VOL * audio.weatherStormVol,
    0,
    1,
  );
}

export function stopWeatherStormAmbience(): void {
  audio.weatherStormVol = 0;
  if (!audio.weatherStormBed) return;
  disposeHtmlAudio(audio.weatherStormBed);
  audio.weatherStormBed = null;
}

/**
 * Бороо (storm) үед аянга+борооны loop.
 * @param active true = storm
 * @param indoors гэрт байвал бага зэрэг нам
 */
export function syncWeatherStormAmbience(
  active: boolean,
  indoors = false,
): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (!active || audio.sfxVol <= 0) {
    stopWeatherStormAmbience();
    return;
  }
  ensureAudio();
  audio.weatherStormVol = indoors ? 0.35 : 1;
  if (!audio.weatherStormBed) {
    audio.weatherStormBed = makeLoopBed(WEATHER_STORM_SRC);
  }
  refreshWeatherStormVolume();
  if (audio.weatherStormBed.paused) {
    void audio.weatherStormBed.play().catch(() => {
      stopWeatherStormAmbience();
    });
  }
}

// ---------------------------------------------------------------------------
// Унтах — хурхирах
// ---------------------------------------------------------------------------

const SLEEP_SNORE_SRC = "/assets/sfx/sleep-snore.wav";

export function startSleepSnore(): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (audio.sfxVol <= 0) return;
  ensureAudio();
  stopSleepSnore();
  const a = new Audio(SLEEP_SNORE_SRC);
  a.preload = "auto";
  a.loop = true;
  a.volume = clamp(audio.sfxVol * (SAMPLE_VOL.snore ?? 0.55), 0, 1);
  audio.sleepSnore = a;
  void a.play().catch(() => {
    if (audio.sleepSnore === a) audio.sleepSnore = null;
  });
}

export function stopSleepSnore(): void {
  if (!audio.sleepSnore) return;
  disposeHtmlAudio(audio.sleepSnore);
  audio.sleepSnore = null;
}

// ---------------------------------------------------------------------------
// Нээлтийн ambient — шуурга / салхи / хэрээ
// ---------------------------------------------------------------------------

const OPENING_AMBIENT_SRC = {
  thunder: "/assets/ambient/thunder-rain.mp3",
  wind: "/assets/ambient/wind-storm.m4a",
  crow: "/assets/ambient/crow.m4a",
} as const;

export type OpeningAmbientMix = {
  /** Аянга+бороо (0–1) */
  thunder: number;
  /** Шуурганы салхи (0–1) */
  wind: number;
  /** Хэрээний дуудлагын чанга (0–1) */
  crow: number;
  /** Дундаж хэрээ/сек */
  crowRate: number;
};

function disposeHtmlAudio(a: HTMLAudioElement | null): void {
  if (!a) return;
  a.onended = null;
  a.onerror = null;
  a.pause();
  a.removeAttribute("src");
  a.load();
}

function makeLoopBed(src: string): HTMLAudioElement {
  const a = new Audio(src);
  a.preload = "auto";
  a.loop = true;
  a.volume = 0;
  return a;
}

function bedVolume(layer: number): number {
  if (audio.sfxVol <= 0 || layer <= 0) return 0;
  const duck = 0.55 + 0.45 * clamp(audio.musicDuck, 0, 1);
  return clamp(audio.sfxVol * layer * duck, 0, 1);
}

function refreshOpeningAmbientVolumes(): void {
  if (audio.openingThunder) {
    audio.openingThunder.volume = bedVolume(audio.openingThunderVol);
  }
  if (audio.openingWind) {
    audio.openingWind.volume = bedVolume(audio.openingWindVol);
  }
}

function ensureOpeningBeds(): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (!audio.openingThunder) {
    audio.openingThunder = makeLoopBed(OPENING_AMBIENT_SRC.thunder);
  }
  if (!audio.openingWind) {
    audio.openingWind = makeLoopBed(OPENING_AMBIENT_SRC.wind);
  }
}

/** Нээлтийн ambient асаах / түвшин солих */
export function setOpeningAmbient(mix: OpeningAmbientMix): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  ensureAudio();
  ensureOpeningBeds();
  audio.openingAmbientOn = true;
  audio.openingThunderVol = clamp(mix.thunder, 0, 1);
  audio.openingWindVol = clamp(mix.wind, 0, 1);
  audio.openingCrowVol = clamp(mix.crow, 0, 1);
  audio.openingCrowRate = Math.max(0, mix.crowRate);
  setMusicDuck(0.48);
  refreshOpeningAmbientVolumes();

  const playBed = (a: HTMLAudioElement | null): void => {
    if (!a) return;
    if (a.paused) void a.play().catch(() => {});
  };
  if (audio.openingThunderVol > 0.01) playBed(audio.openingThunder);
  else if (audio.openingThunder) {
    audio.openingThunder.pause();
  }
  if (audio.openingWindVol > 0.01) playBed(audio.openingWind);
  else if (audio.openingWind) {
    audio.openingWind.pause();
  }

  // Эхний хэрээ — шууд гуаглана
  if (mix.crow > 0.2) {
    audio.openingCrowPrevX = [];
    window.setTimeout(() => playIntroCrowCaw(1), 280);
  }
}

/** Хэрээний давтамж / нислэгийн синк — intro loop-оос дуудна */
export function updateOpeningAmbient(dt: number): void {
  if (!audio.openingAmbientOn) return;
  refreshOpeningAmbientVolumes();
  void dt;
}

function wrapCrowX(v: number, span: number): number {
  return ((v % span) + span) % span;
}

/** Нэг гуаглалт — хэрээ нисэхтэй зэрэг */
export function playIntroCrowCaw(strength = 0.9): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (audio.sfxVol <= 0 || !audio.openingAmbientOn) return;
  ensureAudio();

  // Хуучин дуудлага хэт олон бол цэвэрлэ
  if (audio.openingCrowCalls.length > 3) {
    const old = audio.openingCrowCalls.shift();
    if (old) disposeHtmlAudio(old);
  }

  const crow = new Audio(OPENING_AMBIENT_SRC.crow);
  crow.preload = "auto";
  // Шуурганаас гарч сонсогдохоор
  const duck = 0.75 + 0.25 * clamp(audio.musicDuck, 0, 1);
  crow.volume = clamp(audio.sfxVol * strength * duck, 0, 1);
  crow.currentTime = 0;
  audio.openingCrowCalls.push(crow);

  const cleanup = (): void => {
    const i = audio.openingCrowCalls.indexOf(crow);
    if (i >= 0) audio.openingCrowCalls.splice(i, 1);
    disposeHtmlAudio(crow);
  };
  crow.addEventListener("ended", cleanup, { once: true });
  crow.addEventListener("error", cleanup, { once: true });
  // Файлын эхэнд гуаглалт байгаа гэж үзээд эхнээс тоглуулна; урт бол таслана
  void crow.play().catch(() => cleanup());
  window.setTimeout(() => {
    if (!crow.paused) {
      crow.pause();
      cleanup();
    }
  }, 2400);
}

/**
 * drawIntroCrows-тай ижил байрлал — дэлгэц рүү орж ирэхэд / өнгөрөхөд гуаглана.
 * `time` = render-ийн now/1000.
 */
export function syncIntroCrowCaws(time: number, count: number): void {
  if (!audio.openingAmbientOn || audio.sfxVol <= 0) return;
  if (count <= 0) return;

  if (audio.openingCrowPrevX.length !== count) {
    audio.openingCrowPrevX = Array.from({ length: count }, () => Number.NaN);
  }

  for (let i = 0; i < count; i++) {
    const speed = 55 + (i % 3) * 28;
    const x = wrapCrowX(time * speed + i * 140, VIEW_W + 80) - 40;
    const prev = audio.openingCrowPrevX[i]!;
    if (Number.isFinite(prev)) {
      // Зүүнээс дэлгэц рүү орж ирэх
      if (prev < 24 && x >= 24) {
        playIntroCrowCaw(0.95);
      } else if (
        prev < VIEW_W * 0.42 &&
        x >= VIEW_W * 0.42 &&
        Math.random() < 0.5
      ) {
        playIntroCrowCaw(0.72);
      }
    }
    audio.openingCrowPrevX[i] = x;
  }
}

export function stopOpeningAmbient(): void {
  audio.openingAmbientOn = false;
  audio.openingThunderVol = 0;
  audio.openingWindVol = 0;
  audio.openingCrowVol = 0;
  audio.openingCrowRate = 0;
  audio.openingCrowCooldown = 0;
  audio.openingCrowPrevX = [];
  disposeHtmlAudio(audio.openingThunder);
  disposeHtmlAudio(audio.openingWind);
  disposeHtmlAudio(audio.openingCrow);
  for (const c of audio.openingCrowCalls) disposeHtmlAudio(c);
  audio.openingCrowCalls = [];
  audio.openingThunder = null;
  audio.openingWind = null;
  audio.openingCrow = null;
  setMusicDuck(1);
}

/** Vignette-ийн default mix */
export function openingAmbientForVignette(
  vignette: "stormNight" | "laughingStorm" | "coldDawn",
  dawnT = 0,
): OpeningAmbientMix {
  if (vignette === "stormNight") {
    return { thunder: 0.42, wind: 0.28, crow: 0.9, crowRate: 0.45 };
  }
  if (vignette === "laughingStorm") {
    return { thunder: 0.62, wind: 0.48, crow: 0.75, crowRate: 0.35 };
  }
  // Үүр — аянга намжиж, салхи үлдэнэ (хэрээ нисэхгүй)
  const t = clamp(dawnT, 0, 1);
  return {
    thunder: 0.28 * (1 - t * 0.85),
    wind: 0.38 + t * 0.22,
    crow: 0,
    crowRate: 0,
  };
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
