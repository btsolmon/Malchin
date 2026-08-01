import { WORLD_H, WORLD_W, type Vector2 } from "./types";

/** Хойд ой — дээд бүс */
export const FOREST_Y = WORLD_H * 0.34;
/** Өмнөд цөл — доод бүс */
export const DESERT_Y = WORLD_H * 0.66;
/** Баруун уул/хад */
export const MOUNTAIN_X = WORLD_W * 0.28;
/** Зүүн голын төв шугам (ойролцоо) */
export const RIVER_BASE_X = WORLD_W * 0.78;
export const RIVER_HALF_W = 38;
/** Гол гатлах газар (төв өргөрөг) — гүехэн, гүйдэл сул */
export const RIVER_FORD_Y = WORLD_H * 0.5;
export const RIVER_FORD_HALF = 95;
/** Голын урсгалын хурд (px/s) — мэдэгдэхүйц, гэхдээ гаталж болно */
export const RIVER_CURRENT_SPEED = 62;

/** Голын төв X — өргөргийн дагуу долгионтой */
export function riverCenterX(y: number): number {
  return (
    RIVER_BASE_X +
    Math.sin(y * 0.0038) * 78 +
    Math.sin(y * 0.0095 + 1.2) * 36
  );
}

/** Голын өргөн (гатлах газарт нарийсна) */
export function riverHalfWidth(y: number): number {
  const ford = Math.abs(y - RIVER_FORD_Y) / RIVER_FORD_HALF;
  if (ford < 1) return RIVER_HALF_W * (0.28 + ford * 0.72);
  return RIVER_HALF_W;
}

export function isInRiver(pos: Vector2, margin = 0): boolean {
  const half = riverHalfWidth(pos.y) + margin;
  return Math.abs(pos.x - riverCenterX(pos.y)) < half;
}

export function isAtRiverFord(y: number): boolean {
  return Math.abs(y - RIVER_FORD_Y) < RIVER_FORD_HALF * 0.55;
}

/**
 * Урсгалын чиглэл — үргэлж өмнөд (+Y) давамгайтай.
 * Тоглогчийн facing/хурдтай огт холбоогүй; аналитик шүргэгч, тэмдэг эргэхгүй.
 */
export function riverFlowDir(y: number): Vector2 {
  const dXdY =
    0.0038 * 78 * Math.cos(y * 0.0038) +
    0.0095 * 36 * Math.cos(y * 0.0095 + 1.2);
  // +Y-г хатуу барина — finite-diff / facing-ээс үл хамааран өмнөдөд урсгана
  let fx = dXdY;
  let fy = 1;
  const len = Math.hypot(fx, fy) || 1;
  fx /= len;
  fy /= len;
  if (fy < 0.55) {
    fy = 0.55;
    const n = Math.hypot(fx, fy) || 1;
    fx /= n;
    fy /= n;
  }
  return { x: fx, y: fy };
}

/**
 * Голын урсгалаар зөөх. Усанд орж, гаталж болно — хатуу блок байхгүй.
 * Чиглэл зөвхөн голын геометрээс; тоглогчийн хөдөлгөөнөөс хамаарахгүй.
 * @returns усанд байсан эсэх
 */
export function applyRiverCurrent(
  pos: Vector2,
  dt: number,
  strength = 1,
): boolean {
  if (!isInRiver(pos, -4)) return false;
  const flow = riverFlowDir(pos.y);
  const fordMul = isAtRiverFord(pos.y) ? 0.45 : 1;
  const speed = RIVER_CURRENT_SPEED * strength * fordMul;
  pos.x += flow.x * speed * dt;
  pos.y += flow.y * speed * dt;
  // Төв шугам руу зөөлөн татах (хажуу тийш хүчтэй татахгүй)
  const cx = riverCenterX(pos.y);
  pos.x += (cx - pos.x) * (0.28 * strength * fordMul) * dt;
  return true;
}

export type BiomeKind = "steppe" | "forest" | "desert" | "mountain" | "riverbank";

export function biomeAt(x: number, y: number): BiomeKind {
  if (isInRiver({ x, y }, 8)) return "riverbank";
  if (x < MOUNTAIN_X) return "mountain";
  if (y < FOREST_Y) return "forest";
  if (y > DESERT_Y) return "desert";
  return "steppe";
}

/** Мод — голдуу хойд ой, уулсын зах */
export function sampleTreePos(center: Vector2): Vector2 {
  const roll = Math.random();
  if (roll < 0.62) {
    // Хойд ой
    return {
      x: 60 + Math.random() * (WORLD_W - 120),
      y: 50 + Math.random() * (FOREST_Y + 80),
    };
  }
  if (roll < 0.82) {
    // Баруун уулсын ой
    return {
      x: 50 + Math.random() * (MOUNTAIN_X + 40),
      y: 80 + Math.random() * (WORLD_H - 160),
    };
  }
  // Ховор тал газрын мод
  let pos: Vector2;
  let attempts = 0;
  do {
    pos = {
      x: 80 + Math.random() * (WORLD_W - 160),
      y: FOREST_Y + Math.random() * (DESERT_Y - FOREST_Y),
    };
    attempts++;
  } while (
    (Math.hypot(pos.x - center.x, pos.y - center.y) < 240 ||
      isInRiver(pos, 50)) &&
    attempts < 30
  );
  return pos;
}

/** Жимсний бут — тал + цөлийн зах, ойд цөөн */
export function sampleBushPos(center: Vector2): Vector2 {
  const roll = Math.random();
  if (roll < 0.45) {
    // Тал газар
    return {
      x: MOUNTAIN_X + 40 + Math.random() * (RIVER_BASE_X - MOUNTAIN_X - 120),
      y: FOREST_Y + 40 + Math.random() * (DESERT_Y - FOREST_Y - 80),
    };
  }
  if (roll < 0.75) {
    // Өмнөд цөлийн зах / сийрэг бут
    return {
      x: 80 + Math.random() * (WORLD_W - 160),
      y: DESERT_Y - 60 + Math.random() * (WORLD_H - DESERT_Y - 40),
    };
  }
  // Хойд ойн зах
  return {
    x: 80 + Math.random() * (WORLD_W - 160),
    y: FOREST_Y - 40 + Math.random() * 120,
  };
}

/** Оньсогын чулуу — голдуу баруун уул */
export function sampleRockPos(camp: Vector2): Vector2 {
  const roll = Math.random();
  let pos: Vector2;
  let attempts = 0;
  do {
    if (roll < 0.7) {
      pos = {
        x: 80 + Math.random() * (MOUNTAIN_X + 120),
        y: 100 + Math.random() * (WORLD_H - 200),
      };
    } else {
      pos = {
        x: 100 + Math.random() * (WORLD_W - 200),
        y: 100 + Math.random() * (WORLD_H - 200),
      };
    }
    attempts++;
  } while (
    (Math.hypot(pos.x - camp.x, pos.y - camp.y) < 280 ||
      isInRiver(pos, 40)) &&
    attempts < 50
  );
  return pos;
}
