import { WORLD_H, WORLD_W, type Vector2 } from "./types";
import {
  DEFAULT_TERRAIN_SEED,
  type RandomSource,
  sampleTerrain,
  smoothNoise,
} from "./terrainGenerator";

/** Хойд ойн ерөнхий climate шугам. Noise-оор ирмэг нь жигд бус болно. */
export const FOREST_Y = WORLD_H * 0.17;
/** Өмнөд цөлийн ерөнхий climate шугам. Noise-оор ирмэг нь жигд бус болно. */
export const DESERT_Y = WORLD_H * 0.83;
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

/** Голын урсгалаар зөөх. */
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
  const cx = riverCenterX(pos.y);
  pos.x += (cx - pos.x) * (0.28 * strength * fordMul) * dt;
  return true;
}

export type BiomeKind =
  | "steppe"
  | "meadow"
  | "forest"
  | "drySteppe"
  | "desert"
  | "rocky"
  | "riverbank";

/**
 * Шулуун бүсийн оронд terrain noise + moisture/elevation ашиглан biome шийднэ.
 * Хойд талд ой, өмнөд талд цөл гэсэн ерөнхий чиглэл хэвээр үлдэнэ.
 */
export function biomeAt(
  x: number,
  y: number,
  seed = DEFAULT_TERRAIN_SEED,
): BiomeKind {
  if (isInRiver({ x, y }, 30)) return "riverbank";

  const terrain = sampleTerrain(x, y, seed);
  const forestWave = (smoothNoise(x, y, 540, 201, seed) - 0.5) * 210;
  const desertWave = (smoothNoise(x, y, 610, 233, seed) - 0.5) * 230;
  const forestBoundary =
    FOREST_Y + forestWave + (terrain.moisture - 0.5) * 150;
  const desertBoundary =
    DESERT_Y + desertWave + (terrain.moisture - 0.5) * 110;

  if (y < forestBoundary && terrain.moisture > 0.34) return "forest";
  if (y > desertBoundary && terrain.moisture < 0.62) return "desert";

  if (terrain.elevation > 0.69 && terrain.roughness > 0.57) {
    return "rocky";
  }
  if (terrain.moisture > 0.61 && terrain.fertility > 0.58) {
    return "meadow";
  }
  if (terrain.moisture < 0.39 || terrain.heat > 0.7) {
    return "drySteppe";
  }
  return "steppe";
}

function randomWorldPos(random: RandomSource, margin = 70): Vector2 {
  return {
    x: margin + random() * (WORLD_W - margin * 2),
    y: margin + random() * (WORLD_H - margin * 2),
  };
}

function farEnoughFromCenter(
  pos: Vector2,
  center: Vector2,
  minDistance: number,
): boolean {
  return Math.hypot(pos.x - center.x, pos.y - center.y) >= minDistance;
}

/** Мод — biome/fertility дагана; default random-тай хуучин call мөн ажиллана. */
export function sampleTreePos(
  center: Vector2,
  random: RandomSource = Math.random,
  seed = DEFAULT_TERRAIN_SEED,
): Vector2 {
  for (let attempt = 0; attempt < 100; attempt++) {
    const pos = randomWorldPos(random, 60);
    if (!farEnoughFromCenter(pos, center, 240) || isInRiver(pos, 52)) continue;

    const biome = biomeAt(pos.x, pos.y, seed);
    const terrain = sampleTerrain(pos.x, pos.y, seed);
    const chance =
      biome === "forest"
        ? 0.98
        : biome === "meadow"
          ? 0.42
          : biome === "steppe"
            ? 0.13
            : biome === "riverbank"
              ? 0.18
              : biome === "rocky"
                ? 0.06
                : 0.025;

    if (random() < chance * (0.72 + terrain.fertility * 0.45)) return pos;
  }

  return {
    x: 60 + random() * (WORLD_W - 120),
    y: 50 + random() * (FOREST_Y + 100),
  };
}

/** Жимсний бут — meadow/steppe/ойн захад илүү элбэг. */
export function sampleBushPos(
  center: Vector2,
  random: RandomSource = Math.random,
  seed = DEFAULT_TERRAIN_SEED,
): Vector2 {
  for (let attempt = 0; attempt < 100; attempt++) {
    const pos = randomWorldPos(random, 70);
    if (!farEnoughFromCenter(pos, center, 155) || isInRiver(pos, 44)) continue;

    const biome = biomeAt(pos.x, pos.y, seed);
    const terrain = sampleTerrain(pos.x, pos.y, seed);
    const chance =
      biome === "meadow"
        ? 0.9
        : biome === "forest"
          ? 0.58
          : biome === "steppe"
            ? 0.45
            : biome === "drySteppe"
              ? 0.2
              : biome === "riverbank"
                ? 0.24
                : 0.08;

    if (random() < chance * (0.62 + terrain.fertility * 0.55)) return pos;
  }

  return {
    x: 80 + random() * (RIVER_BASE_X - 160),
    y: FOREST_Y + 40 + random() * (DESERT_Y - FOREST_Y - 80),
  };
}

/** Оньсогын/түүхий чулуу — rocky, dry steppe, steppe-д илүү гарна. */
export function sampleRockPos(
  camp: Vector2,
  random: RandomSource = Math.random,
  seed = DEFAULT_TERRAIN_SEED,
): Vector2 {
  for (let attempt = 0; attempt < 120; attempt++) {
    const pos = randomWorldPos(random, 90);
    if (!farEnoughFromCenter(pos, camp, 285) || isInRiver(pos, 42)) continue;

    const biome = biomeAt(pos.x, pos.y, seed);
    const terrain = sampleTerrain(pos.x, pos.y, seed);
    const chance =
      biome === "rocky"
        ? 0.96
        : biome === "drySteppe"
          ? 0.58
          : biome === "steppe"
            ? 0.38
            : biome === "desert"
              ? 0.28
              : biome === "riverbank"
                ? 0.2
                : 0.1;

    if (random() < chance * (0.72 + terrain.roughness * 0.5)) return pos;
  }

  return {
    x: 100 + random() * (WORLD_W - 200),
    y: FOREST_Y + 40 + random() * (DESERT_Y - FOREST_Y - 80),
  };
}

export function sampleStonePos(
  camp: Vector2,
  random: RandomSource = Math.random,
  seed = DEFAULT_TERRAIN_SEED,
): Vector2 {
  return sampleRockPos(camp, random, seed);
}
