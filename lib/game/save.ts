// Хүн 1 — автомат хадгалалт (localStorage)
//
// GameState бүхэлдээ цэвэр дата (canvas, зураг, функц агуулаагүй) тул
// JSON болгож хадгалахад хүндрэл гарахгүй.

import { neutralInput } from "./utils";
import type { GameState } from "./types";

export const SAVE_KEY = "malchin-save";

/**
 * Хадгалалтын хувилбар. GameState-ийн бүтэц өөрчлөгдвөл нэгээр нэмнэ —
 * ингэснээр хуучин хадгалалт эвдэрсэн төлөв уншихгүй, зүгээр хаягдана.
 */
export const SAVE_VERSION = 1;

interface SaveEnvelope {
  version: number;
  savedAt: number;
  state: GameState;
}

/**
 * Хадгалахад тохиромжтой фаз эсэх — меню, оршил, ялагдлыг хадгалахгүй.
 * "won" хадгалагдана: түүх дуусмагц бүртгээд, тоглогч "Үргэлжлүүлэх"-ээр
 * сүргээ өсгөх тоглоомоо яг тэр цэгээс авна.
 */
function saveablePhase(state: GameState): boolean {
  return (
    state.phase === "playing" ||
    state.phase === "spirit" ||
    state.phase === "ger" ||
    state.phase === "elder" ||
    state.phase === "paused" ||
    state.phase === "won"
  );
}

export function saveGame(state: GameState): boolean {
  if (!saveablePhase(state)) return false;
  try {
    // Modal/пауз дээр хадгалагдвал уншихад тэр цонхонд гацахгүйн тулд
    // үргэлж хэвийн тоглох фазаар буулгана.
      const phase =
        state.phase === "elder" ||
        state.phase === "paused" ||
        state.phase === "won"
          ? "playing"
          : state.phase;
    const envelope: SaveEnvelope = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      state: { ...state, phase, input: neutralInput() },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
    hasSaveCache = true;
    return true;
  } catch {
    // Хэмжээ дүүрсэн эсвэл localStorage хаалттай — тоглоомыг зогсоохгүй
    return false;
  }
}

function readEnvelope(): SaveEnvelope | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const envelope = parsed as Partial<SaveEnvelope>;
    if (envelope.version !== SAVE_VERSION) return null;
    const state = envelope.state;
    // Хамгийн доод шалгуур — гол мод бүрэн эсэх
    if (
      !state ||
      typeof state !== "object" ||
      !state.player ||
      !state.world ||
      !state.story
    ) {
      return null;
    }
    return envelope as SaveEnvelope;
  } catch {
    return null;
  }
}

/**
 * Хадгалалт байгаа эсэх — цэс зурах бүрд дуудагддаг тул кэшилнэ.
 * Бүтэн төлөвийг frame тутам JSON.parse хийвэл цэс мэдэгдэхүйц гацна.
 */
let hasSaveCache: boolean | null = null;

export function hasSave(): boolean {
  if (hasSaveCache === null) hasSaveCache = readEnvelope() !== null;
  return hasSaveCache;
}

/** Хадгалсан төлөвийг уншина. Эвдэрсэн/хуучин бол null. */
export function loadGame(): GameState | null {
  const envelope = readEnvelope();
  if (!envelope) return null;
  const gear = envelope.state.player.gear;
  return {
    ...envelope.state,
    player: {
      ...envelope.state.player,
      gear: {
        dog: !!gear?.dog,
        horse: !!gear?.horse,
        bow: !!gear?.bow,
        axe: !!gear?.axe,
        basket: !!gear?.basket,
        urga: !!gear?.urga,
        fishingRod: !!gear?.fishingRod,
      },
    },
    input: neutralInput(),
    fishingHook: null,
    horseLasso: null,
    bannerAlert: null,
    herdVictoryShown: envelope.state.herdVictoryShown ?? false,
    winReason: envelope.state.winReason ?? null,
    world: {
      ...envelope.state.world,
      flockBreach: envelope.state.world.flockBreach ?? null,
      cattleBreach: envelope.state.world.cattleBreach ?? null,
    },
  };
}

export function clearSave(): void {
  hasSaveCache = false;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Устгаж чадахгүй бол ч тоглоом үргэлжилнэ
  }
}
