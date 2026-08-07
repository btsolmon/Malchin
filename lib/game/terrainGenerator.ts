import { WORLD_H, WORLD_W } from "./types";

/**
 * Бүх terrain generation-д ашиглах үндсэн seed.
 * Энэ тоо ижил байвал terrain, өнгөний толбо, object placement ижил үүснэ.
 */
export const DEFAULT_TERRAIN_SEED = 481516;

export interface TerrainSample {
  /** 0 = нам хотгор, 1 = өндөрлөг */
  elevation: number;
  /** 0 = хуурай, 1 = чийглэг */
  moisture: number;
  /** 0 = ургамал муу, 1 = үржил шимтэй */
  fertility: number;
  /** 0 = тэгш, 1 = барзгар / хадархаг */
  roughness: number;
  /** 0 = сэрүүн, 1 = дулаан */
  heat: number;
}

export type RandomSource = () => number;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Seed-тэй random. Refresh хийсэн ч ижил дараалал гарна. */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 0..1 hash. */
export function terrainHash(
  x: number,
  y: number,
  seed = DEFAULT_TERRAIN_SEED,
): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let value =
    Math.imul(ix ^ seed, 374761393) +
    Math.imul(iy + seed * 17, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

export function smoothNoise(
  x: number,
  y: number,
  scale: number,
  salt: number,
  seed = DEFAULT_TERRAIN_SEED,
): number {
  const sx = x / scale;
  const sy = y / scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = smoothstep(sx - ix);
  const fy = smoothstep(sy - iy);

  const sample = (ox: number, oy: number): number =>
    terrainHash(ix + ox + salt * 31, iy + oy - salt * 17, seed);

  const top = sample(0, 0) * (1 - fx) + sample(1, 0) * fx;
  const bottom = sample(0, 1) * (1 - fx) + sample(1, 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

function fractalNoise(
  x: number,
  y: number,
  seed: number,
  baseScale: number,
  octaves = 4,
): number {
  let value = 0;
  let total = 0;
  let amplitude = 1;
  let scale = baseScale;

  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x, y, scale, 19 + i * 37, seed + i * 101) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    scale *= 0.5;
  }

  return total > 0 ? value / total : 0.5;
}

/**
 * Нэг координатын terrain шинжийг буцаана.
 * Үндсэн terrain, biome, grass sprite, puddle, object spawn бүгд үүнийг ашиглана.
 */
export function sampleTerrain(
  x: number,
  y: number,
  seed = DEFAULT_TERRAIN_SEED,
): TerrainSample {
  const nx = clamp01(x / WORLD_W);
  const ny = clamp01(y / WORLD_H);

  const broadElevation = fractalNoise(x, y, seed + 11, 820, 4);
  const detailElevation = fractalNoise(x, y, seed + 23, 260, 3);
  const elevation = clamp01(broadElevation * 0.74 + detailElevation * 0.26);

  const broadMoisture = fractalNoise(x, y, seed + 41, 760, 4);
  const detailMoisture = fractalNoise(x, y, seed + 53, 230, 3);
  const northMoisture = (1 - ny) * 0.14;
  const moisture = clamp01(
    broadMoisture * 0.64 + detailMoisture * 0.22 + northMoisture,
  );

  const roughnessNoise = fractalNoise(x, y, seed + 71, 310, 4);
  const westHighland = clamp01(1 - nx * 1.45) * 0.13;
  const roughness = clamp01(roughnessNoise * 0.87 + westHighland);

  const heatNoise = fractalNoise(x, y, seed + 89, 680, 3);
  const heat = clamp01(ny * 0.67 + heatNoise * 0.27 + 0.06);

  const fertilityNoise = fractalNoise(x, y, seed + 107, 360, 3);
  const fertility = clamp01(
    moisture * 0.62 + fertilityNoise * 0.3 - roughness * 0.16 + 0.12,
  );

  return { elevation, moisture, fertility, roughness, heat };
}

/** Grass/detail-ийн нийт нягтын deterministic mask. */
export function terrainDensity(
  x: number,
  y: number,
  seed = DEFAULT_TERRAIN_SEED,
): number {
  const sample = sampleTerrain(x, y, seed);
  const placementNoise =
    smoothNoise(x, y, 620, 3, seed) * 0.48 +
    smoothNoise(x, y, 230, 11, seed) * 0.31 +
    smoothNoise(x, y, 92, 23, seed) * 0.21;

  return clamp01(
    placementNoise * 0.48 +
      sample.fertility * 0.38 +
      sample.moisture * 0.14 -
      sample.roughness * 0.08,
  );
}
