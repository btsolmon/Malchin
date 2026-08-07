import {
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  type BerryBush,
  type Camera,
  type Tree,
  type World,
  type WorldRock,
} from "../types";
import { biomeAt, riverCenterX, riverHalfWidth } from "../biomes";
import {
  sampleTerrain,
  terrainDensity,
  terrainHash,
} from "../terrainGenerator";

export interface WorldSpriteSet {
  objects: HTMLCanvasElement;
  grassTile: HTMLCanvasElement;
  grassVariants: HTMLCanvasElement[];
  terrainDetails: HTMLCanvasElement;
  structuralDetails: HTMLCanvasElement;
  staticTerrainDetails: HTMLCanvasElement;
  staticTerrainReady: boolean;
  puddleCandidates: PuddleCandidate[];
  puddleCandidatesReady: boolean;
}

interface PuddleCandidate {
  x: number;
  y: number;
  assetIndex: number;
  width: number;
  wetBorder: boolean;
  rippleSeed: number;
}

interface SpriteCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

type TerrainDetailKind =
  | "baseGrassVariant"
  | "denseGrassPatch"
  | "grassOverlay"
  | "smallVegetation"
  | "edgeBlend"
  | "mudPatch"
  | "puddle"
  | "wetOverlay";

interface TerrainAssetDefinition extends SpriteCrop {
  sheet: "terrain3" | "terrainType2";
  kind: TerrainDetailKind;
  targetWidth: number;
}

interface TreeSpriteDefinition extends SpriteCrop {
  targetHeight: number;
  footOffsetX: number;
  footOffsetY: number;
  canopyBottomRatio: number;
  canopyWidthRatio: number;
  canopyCenterOffsetX: number;
  occlusionBaseOffsetY: number;
}

interface TreeDrawLayout {
  definition: TreeSpriteDefinition;
  x: number;
  y: number;
  width: number;
  height: number;
}

const TREE_DEFINITIONS: TreeSpriteDefinition[] = [
  { x: 55, y: 54, w: 205, h: 250, targetHeight: 107, footOffsetX: 0, footOffsetY: 10, canopyBottomRatio: 0.72, canopyWidthRatio: 0.9, canopyCenterOffsetX: 0, occlusionBaseOffsetY: 0 },
  { x: 275, y: 88, w: 168, h: 214, targetHeight: 112, footOffsetX: 0, footOffsetY: 10, canopyBottomRatio: 0.66, canopyWidthRatio: 0.88, canopyCenterOffsetX: 0, occlusionBaseOffsetY: 0 },
  { x: 458, y: 137, w: 132, h: 167, targetHeight: 111, footOffsetX: 0, footOffsetY: 10, canopyBottomRatio: 0.7, canopyWidthRatio: 0.86, canopyCenterOffsetX: 0, occlusionBaseOffsetY: 0 },
];
const FRUIT_TREE_DEFINITIONS: TreeSpriteDefinition[] = [
  { x: 990, y: 62, w: 190, h: 244, targetHeight: 113, footOffsetX: 0, footOffsetY: 10, canopyBottomRatio: 0.72, canopyWidthRatio: 0.92, canopyCenterOffsetX: 0, occlusionBaseOffsetY: 0 },
  { x: 1195, y: 98, w: 154, h: 207, targetHeight: 118, footOffsetX: 0, footOffsetY: 10, canopyBottomRatio: 0.67, canopyWidthRatio: 0.88, canopyCenterOffsetX: 0, occlusionBaseOffsetY: 0 },
];
const STUMP_CROP: SpriteCrop = { x: 1135, y: 366, w: 92, h: 94 };
const BUSH_CROPS: SpriteCrop[] = [
  { x: 552, y: 486, w: 166, h: 132 },
  { x: 729, y: 509, w: 137, h: 107 },
  { x: 69, y: 487, w: 138, h: 128 },
];
const ROCK_CROPS: SpriteCrop[] = [
  { x: 842, y: 656, w: 105, h: 112 },
  { x: 972, y: 646, w: 132, h: 126 },
  { x: 1122, y: 653, w: 169, h: 144 },
  { x: 1294, y: 642, w: 181, h: 172 },
];
const TERRAIN_ASSET_MANIFEST: TerrainAssetDefinition[] = [
  { sheet: "terrain3", kind: "baseGrassVariant", x: 103, y: 82, w: 48, h: 48, targetWidth: 48 },
  { sheet: "terrainType2", kind: "baseGrassVariant", x: 1088, y: 80, w: 48, h: 48, targetWidth: 48 },
  { sheet: "terrainType2", kind: "baseGrassVariant", x: 1174, y: 80, w: 48, h: 48, targetWidth: 48 },
  { sheet: "terrainType2", kind: "baseGrassVariant", x: 1260, y: 80, w: 48, h: 48, targetWidth: 48 },
  { sheet: "terrainType2", kind: "baseGrassVariant", x: 1345, y: 80, w: 48, h: 48, targetWidth: 48 },
  { sheet: "terrainType2", kind: "smallVegetation", x: 1370, y: 838, w: 104, h: 91, targetWidth: 24 },
  { sheet: "terrainType2", kind: "smallVegetation", x: 1495, y: 840, w: 90, h: 87, targetWidth: 22 },
  { sheet: "terrainType2", kind: "grassOverlay", x: 1612, y: 835, w: 105, h: 96, targetWidth: 28 },
  { sheet: "terrainType2", kind: "denseGrassPatch", x: 1382, y: 922, w: 120, h: 104, targetWidth: 34 },
  { sheet: "terrainType2", kind: "denseGrassPatch", x: 1510, y: 922, w: 126, h: 116, targetWidth: 38 },
  { sheet: "terrainType2", kind: "grassOverlay", x: 1630, y: 929, w: 113, h: 112, targetWidth: 30 },
  { sheet: "terrain3", kind: "puddle", x: 1080, y: 548, w: 205, h: 78, targetWidth: 58 },
  { sheet: "terrain3", kind: "puddle", x: 1190, y: 635, w: 285, h: 92, targetWidth: 72 },
  { sheet: "terrain3", kind: "puddle", x: 956, y: 738, w: 225, h: 76, targetWidth: 54 },
  { sheet: "terrain3", kind: "puddle", x: 1175, y: 842, w: 292, h: 94, targetWidth: 78 },
];

const BASE_GRASS_DETAILS = TERRAIN_ASSET_MANIFEST.filter(
  (asset) => asset.kind === "baseGrassVariant",
);

const SMALL_TERRAIN_DETAILS = TERRAIN_ASSET_MANIFEST.filter(
  (asset) =>
    asset.kind === "smallVegetation" ||
    asset.kind === "grassOverlay" ||
    asset.kind === "denseGrassPatch",
);
const PUDDLE_DETAILS = TERRAIN_ASSET_MANIFEST.filter(
  (asset) => asset.kind === "puddle",
);

function makeCanvas(width = 1, height = 1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function removeSheetBackground(
  image: HTMLImageElement,
  target: HTMLCanvasElement,
): void {
  target.width = image.naturalWidth;
  target.height = image.naturalHeight;
  const ctx = target.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, target.width, target.height);
  const bgR = pixels.data[0];
  const bgG = pixels.data[1];
  const bgB = pixels.data[2];
  for (let i = 0; i < pixels.data.length; i += 4) {
    const dr = pixels.data[i] - bgR;
    const dg = pixels.data[i + 1] - bgG;
    const db = pixels.data[i + 2] - bgB;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance < 28) pixels.data[i + 3] = 0;
    else if (distance < 48) {
      pixels.data[i + 3] = Math.round(((distance - 28) / 20) * 255);
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

/** Load the two user-provided world sprite sheets from public assets. */
export function loadWorldSprites(): WorldSpriteSet {
  const objects = makeCanvas();
  const grassTile = makeCanvas();
  const grassVariants = [makeCanvas(), makeCanvas(), makeCanvas(), makeCanvas()];
  const terrainDetails = makeCanvas();
  const structuralDetails = makeCanvas();
  const staticTerrainDetails = makeCanvas();

  const objectImage = new Image();
  objectImage.decoding = "async";
  objectImage.onload = () => removeSheetBackground(objectImage, objects);
  objectImage.src = "/assets/terrain/terrain1.webp";

  const terrainImage = new Image();
  terrainImage.decoding = "async";
  terrainImage.onload = () => {
    // A fully covered grassy sample from terrain3, used as a seamless-feeling
    // pixel texture over the existing biome colors and river geometry.
    grassTile.width = 48;
    grassTile.height = 48;
    const ctx = grassTile.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const baseGrass = BASE_GRASS_DETAILS[0];
    ctx.drawImage(
      terrainImage,
      baseGrass.x,
      baseGrass.y,
      baseGrass.w,
      baseGrass.h,
      0,
      0,
      48,
      48,
    );
    removeSheetBackground(terrainImage, structuralDetails);
  };
  terrainImage.src = "/assets/terrain/terrain3.webp";

  const detailImage = new Image();
  detailImage.decoding = "async";
  detailImage.onload = () => {
    const samples = BASE_GRASS_DETAILS.filter(
      (asset) => asset.sheet === "terrainType2",
    );
    for (let i = 0; i < grassVariants.length; i++) {
      const variant = grassVariants[i];
      variant.width = 48;
      variant.height = 48;
      const ctx = variant.getContext("2d");
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;
      const sample = samples[i];
      ctx.drawImage(
        detailImage,
        sample.x,
        sample.y,
        sample.w,
        sample.h,
        0,
        0,
        48,
        48,
      );
    }
    removeSheetBackground(detailImage, terrainDetails);
  };
  detailImage.src = "/assets/terrain/terrain-type2.webp";

  return {
    objects,
    grassTile,
    grassVariants,
    terrainDetails,
    structuralDetails,
    staticTerrainDetails,
    staticTerrainReady: false,
    puddleCandidates: [],
    puddleCandidatesReady: false,
  };
}

function ready(canvas: HTMLCanvasElement): boolean {
  return canvas.width > 1 && canvas.height > 1;
}

function drawCrop(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  crop: SpriteCrop,
  centerX: number,
  groundY: number,
  drawWidth: number,
): void {
  const drawHeight = Math.round((crop.h / crop.w) * drawWidth);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet,
    crop.x,
    crop.y,
    crop.w,
    crop.h,
    Math.round(centerX - drawWidth / 2),
    Math.round(groundY - drawHeight),
    Math.round(drawWidth),
    drawHeight,
  );
  ctx.restore();
}

function drawFlatCrop(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  crop: SpriteCrop,
  centerX: number,
  centerY: number,
  drawWidth: number,
): void {
  const drawHeight = Math.round((crop.h / crop.w) * drawWidth);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet,
    crop.x,
    crop.y,
    crop.w,
    crop.h,
    Math.round(centerX - drawWidth / 2),
    Math.round(centerY - drawHeight / 2),
    Math.round(drawWidth),
    drawHeight,
  );
  ctx.restore();
}

function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function puddleStrength(world: World): number {
  if (world.season === "winter") return 0;
  // Борооны үед нэмэгдэж, дараа нь удаан хатна
  const wet = world.groundWetness ?? 0;
  if (wet <= 0.02) return 0;
  return Math.min(1, wet);
}

function puddlePositionAllowed(world: World, x: number, y: number): boolean {
  const biome = biomeAt(x, y, world.terrainSeed);
  const terrain = sampleTerrain(x, y, world.terrainSeed);
  if (
    biome === "desert" ||
    biome === "rocky" ||
    terrain.moisture < 0.5 ||
    terrain.elevation > 0.68
  ) {
    return false;
  }
  const riverDistance = Math.abs(x - riverCenterX(y)) - riverHalfWidth(y);
  if (riverDistance < 34) return false;
  const distanceSq = (ax: number, ay: number, radius: number): boolean => {
    const dx = x - ax;
    const dy = y - ay;
    return dx * dx + dy * dy < radius * radius;
  };
  if (distanceSq(world.campPos.x, world.campPos.y, 165)) return false;
  if (distanceSq(world.elder.pos.x, world.elder.pos.y, 82)) return false;
  if (distanceSq(world.elder.gerPos.x, world.elder.gerPos.y, 120)) return false;
  if (distanceSq(world.feeder.pos.x, world.feeder.pos.y, 56)) return false;
  if (world.campfire.placed && distanceSq(world.campfire.pos.x, world.campfire.pos.y, 48))
    return false;
  for (const tree of world.trees) {
    if (distanceSq(tree.pos.x, tree.pos.y, 48)) return false;
  }
  for (const bush of world.bushes) {
    if (distanceSq(bush.pos.x, bush.pos.y, 34)) return false;
  }
  for (const rock of world.rocks) {
    if (distanceSq(rock.pos.x, rock.pos.y, 40)) return false;
  }
  for (const fence of world.fences) {
    if (distanceSq(fence.pos.x, fence.pos.y, 35)) return false;
  }
  return true;
}

function generatePuddleCandidates(sprites: WorldSpriteSet, world: World): void {
  if (sprites.puddleCandidatesReady) return;
  const cell = 190;
  const seed = world.terrainSeed;
  const hash = (x: number, y: number): number => terrainHash(x, y, seed);

  for (let gy = 0; gy <= Math.ceil(WORLD_H / cell); gy++) {
    for (let gx = 0; gx <= Math.ceil(WORLD_W / cell); gx++) {
      if (hash(gx + 101, gy - 47) < 0.5) continue;
      const x = gx * cell + 35 + hash(gx + 17, gy + 3) * 120;
      const y = gy * cell + 38 + hash(gx - 11, gy + 41) * 112;
      const terrain = sampleTerrain(x, y, seed);
      if (terrain.moisture < 0.5 || terrain.elevation > 0.68) continue;
      if (!puddlePositionAllowed(world, x, y)) continue;
      const assetIndex = Math.min(
        PUDDLE_DETAILS.length - 1,
        Math.floor(hash(gx + 53, gy + 79) * PUDDLE_DETAILS.length),
      );
      sprites.puddleCandidates.push({
        x,
        y,
        assetIndex,
        width: Math.round(
          PUDDLE_DETAILS[assetIndex].targetWidth *
            (0.78 + hash(gx + 31, gy - 5) * 0.42),
        ),
        wetBorder: hash(gx, gy + 97) > 0.42,
        rippleSeed: hash(gx, gy),
      });
    }
  }
  sprites.puddleCandidatesReady = true;
}

function nearPuddleCandidate(
  sprites: WorldSpriteSet,
  x: number,
  y: number,
  radius: number,
): boolean {
  return sprites.puddleCandidates.some(
    (puddle) => distanceSquared(x, y, puddle.x, puddle.y) < radius * radius,
  );
}

function detailPositionAllowed(
  world: World,
  sprites: WorldSpriteSet,
  x: number,
  y: number,
): boolean {
  if (x < 24 || x > WORLD_W - 24 || y < 24 || y > WORLD_H - 24) {
    return false;
  }
  const biome = biomeAt(x, y, world.terrainSeed);
  const terrain = sampleTerrain(x, y, world.terrainSeed);
  if (biome === "desert" || biome === "rocky" || terrain.fertility < 0.3) {
    return false;
  }
  const riverDistance = Math.abs(x - riverCenterX(y)) - riverHalfWidth(y);
  if (riverDistance < 14) return false;
  const blocked = (bx: number, by: number, radius: number): boolean =>
    distanceSquared(x, y, bx, by) < radius * radius;
  if (blocked(world.campPos.x, world.campPos.y, 180)) return false;
  if (blocked(world.elder.pos.x, world.elder.pos.y, 75)) return false;
  if (blocked(world.elder.gerPos.x, world.elder.gerPos.y, 110)) return false;
  if (blocked(world.feeder.pos.x, world.feeder.pos.y, 46)) return false;
  if (world.campfire.placed && blocked(world.campfire.pos.x, world.campfire.pos.y, 42))
    return false;
  if (world.rocks.some((rock) => blocked(rock.pos.x, rock.pos.y, 30))) return false;
  if (world.bushes.some((bush) => blocked(bush.pos.x, bush.pos.y, 25))) return false;
  if (world.fences.some((fence) => blocked(fence.pos.x, fence.pos.y, 24))) return false;
  return !nearPuddleCandidate(sprites, x, y, 44);
}

function buildStaticTerrainCache(sprites: WorldSpriteSet, world: World): void {
  if (sprites.staticTerrainReady || !ready(sprites.terrainDetails)) return;
  const canvas = sprites.staticTerrainDetails;
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const seed = world.terrainSeed;
  const hash = (x: number, y: number): number => terrainHash(x, y, seed);

  ctx.save();
  try {
    ctx.clearRect(0, 0, WORLD_W, WORLD_H);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.82;

    const clusterSize = 225;
    for (let gy = 0; gy <= Math.ceil(WORLD_H / clusterSize); gy++) {
      for (let gx = 0; gx <= Math.ceil(WORLD_W / clusterSize); gx++) {
        const centerX = gx * clusterSize + 35 + hash(gx - 3, gy + 11) * 155;
        const centerY = gy * clusterSize + 38 + hash(gx + 5, gy + 23) * 145;
        const riverEdge =
          Math.abs(centerX - riverCenterX(centerY)) - riverHalfWidth(centerY);
        const biome = biomeAt(centerX, centerY, seed);
        const terrain = sampleTerrain(centerX, centerY, seed);
        const biomeBoost =
          biome === "meadow"
            ? 0.19
            : biome === "riverbank"
              ? 0.14
              : biome === "forest"
                ? 0.09
                : biome === "drySteppe"
                  ? -0.12
                  : 0;
        const density =
          terrainDensity(centerX, centerY, seed) +
          biomeBoost +
          (riverEdge > 18 && riverEdge < 115 ? 0.1 : 0);
        if (density < 0.49) continue;
        const count = Math.min(8, 2 + Math.floor((density - 0.44) * 12));

        for (let i = 0; i < count; i++) {
          const angle = hash(gx * 13 + i, gy * 17 - i) * Math.PI * 2;
          const radius = 10 + hash(gx + i * 7, gy - i * 11) * 76;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius * 0.62;
          if (!detailPositionAllowed(world, sprites, x, y)) continue;
          const localBiome = biomeAt(x, y, seed);
          const pool =
            localBiome === "meadow"
              ? SMALL_TERRAIN_DETAILS
              : SMALL_TERRAIN_DETAILS.filter(
                  (detail) => detail.kind !== "denseGrassPatch",
                );
          const crop =
            pool[Math.floor(hash(gx + 19 + i, gy - 7 - i) * pool.length)];
          const width = Math.round(
            crop.targetWidth * (0.68 + hash(gx + 31 + i, gy + 2) * 0.52),
          );
          ctx.globalAlpha =
            localBiome === "forest" ? 0.68 : localBiome === "riverbank" ? 0.76 : 0.82;
          drawCrop(ctx, sprites.terrainDetails, crop, x, y, width);
        }
      }
    }

    const smallCell = 110;
    for (let gy = 0; gy <= Math.ceil(WORLD_H / smallCell); gy++) {
      for (let gx = 0; gx <= Math.ceil(WORLD_W / smallCell); gx++) {
        if (hash(gx + 211, gy - 89) < 0.68) continue;
        const x = gx * smallCell + 14 + hash(gx + 7, gy + 29) * 82;
        const y = gy * smallCell + 15 + hash(gx - 41, gy + 13) * 80;
        if (
          terrainDensity(x, y, seed) < 0.43 ||
          !detailPositionAllowed(world, sprites, x, y)
        ) {
          continue;
        }
        const biome = biomeAt(x, y, seed);
        ctx.globalAlpha = 0.4;
        ctx.fillStyle =
          biome === "forest"
            ? "#3f6335"
            : biome === "riverbank"
              ? "#4d7445"
              : biome === "drySteppe"
                ? "#8a8249"
                : hash(gx, gy) > 0.5
                  ? "#657a3b"
                  : "#86934d";
        ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
        if (hash(gx + 5, gy - 3) > 0.61) {
          ctx.fillRect(Math.round(x + 4), Math.round(y + 2), 1, 1);
        }
      }
    }

    ctx.globalAlpha = 0.82;
    for (const tree of world.trees) {
      if (hash(tree.id, 91) < 0.34) continue;
      const detailCount = tree.hp > 0 ? 2 : 3;
      for (let i = 0; i < detailCount; i++) {
        const crop =
          SMALL_TERRAIN_DETAILS[
            Math.floor(hash(tree.id + i * 5, 37) * SMALL_TERRAIN_DETAILS.length)
          ];
        const side = i % 2 === 0 ? -1 : 1;
        const x = tree.pos.x + side * (15 + hash(tree.id, i) * 15);
        const y = tree.pos.y + 3 + hash(tree.id + i, 73) * 10;
        if (nearPuddleCandidate(sprites, x, y, 34)) continue;
        drawCrop(
          ctx,
          sprites.terrainDetails,
          crop,
          x,
          y,
          Math.round(crop.targetWidth * 0.72),
        );
      }
    }
  } finally {
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  sprites.staticTerrainReady = true;
}

export function drawSpriteGround(
  ctx: CanvasRenderingContext2D,
  sprites: WorldSpriteSet,
  cam: Camera,
  world: World,
): void {
  if (world.season === "winter") return;
  generatePuddleCandidates(sprites, world);
  buildStaticTerrainCache(sprites, world);

  ctx.save();
  try {
    ctx.imageSmoothingEnabled = false;
    const wetness = puddleStrength(world);
    if (wetness > 0 && ready(sprites.structuralDetails)) {
      for (const puddle of sprites.puddleCandidates) {
        const screenX = puddle.x - cam.x;
        const screenY = puddle.y - cam.y;
        if (screenX < -100 || screenX > VIEW_W + 100 || screenY < -60 || screenY > VIEW_H + 60) {
          continue;
        }
        const asset = PUDDLE_DETAILS[puddle.assetIndex];
        ctx.save();
        try {
          if (puddle.wetBorder) {
            ctx.globalAlpha = 0.12 * wetness;
            ctx.fillStyle = "#263f3d";
            ctx.beginPath();
            ctx.ellipse(screenX, screenY + 2, puddle.width * 0.58, puddle.width * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = (0.38 + wetness * 0.52) * Math.min(1, wetness * 1.15);
          drawFlatCrop(ctx, sprites.structuralDetails, asset, screenX, screenY, puddle.width);
          if (world.weather === "storm" || wetness > 0.55) {
            const ripple = (world.elapsed * 0.9 + puddle.rippleSeed) % 1;
            ctx.globalAlpha = (1 - ripple) * 0.2 * wetness;
            ctx.strokeStyle = "#b5d2d2";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(screenX, screenY, 5 + ripple * 13, 2 + ripple * 5, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        } finally {
          ctx.restore();
        }
      }
    }

    if (sprites.staticTerrainReady) {
      const sourceX = Math.max(0, Math.floor(cam.x));
      const sourceY = Math.max(0, Math.floor(cam.y));
      const sourceW = Math.min(VIEW_W, WORLD_W - sourceX);
      const sourceH = Math.min(VIEW_H, WORLD_H - sourceY);
      if (sourceW > 0 && sourceH > 0) {
        ctx.drawImage(
          sprites.staticTerrainDetails,
          sourceX,
          sourceY,
          sourceW,
          sourceH,
          0,
          0,
          sourceW,
          sourceH,
        );
      }
    }
  } finally {
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

function treeDefinition(tree: Tree): TreeSpriteDefinition {
  const definitions = tree.riddleHost
    ? FRUIT_TREE_DEFINITIONS
    : TREE_DEFINITIONS;
  return definitions[tree.id % definitions.length];
}

function treeDrawLayout(tree: Tree, cam: Camera): TreeDrawLayout {
  const definition = treeDefinition(tree);
  const height = Math.round(definition.targetHeight);
  const width = Math.round((definition.w / definition.h) * height);
  return {
    definition,
    x: Math.round(
      tree.pos.x - cam.x - width / 2 + definition.footOffsetX,
    ),
    y: Math.round(
      tree.pos.y - cam.y - height + definition.footOffsetY,
    ),
    width,
    height,
  };
}

function drawTreeLayout(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  layout: TreeDrawLayout,
): void {
  const { definition, x, y, width, height } = layout;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet,
    definition.x,
    definition.y,
    definition.w,
    definition.h,
    x,
    y,
    width,
    height,
  );
  ctx.restore();
}

export function drawSpriteTree(
  ctx: CanvasRenderingContext2D,
  sprites: WorldSpriteSet,
  tree: Tree,
  cam: Camera,
): boolean {
  if (!ready(sprites.objects)) return false;
  const x = tree.pos.x - cam.x;
  const y = tree.pos.y - cam.y + 10;
  if (tree.hp <= 0) {
    drawCrop(ctx, sprites.objects, STUMP_CROP, x, y, 42);
    return true;
  }
  drawTreeLayout(ctx, sprites.objects, treeDrawLayout(tree, cam));
  return true;
}

/** Draw only the upper canopy after actors when the player's feet are behind it. */
export function drawSpriteTreeCanopy(
  ctx: CanvasRenderingContext2D,
  sprites: WorldSpriteSet,
  tree: Tree,
  cam: Camera,
  playerPos: { x: number; y: number },
  debug = false,
): boolean {
  if (!ready(sprites.objects) || tree.hp <= 0) return false;
  const layout = treeDrawLayout(tree, cam);
  const { definition, x, y, width, height } = layout;
  const canopyCenterX = tree.pos.x + definition.canopyCenterOffsetX;
  const canopyHalfWidth = (width * definition.canopyWidthRatio) / 2;
  const playerBehindTree =
    playerPos.y < tree.pos.y + definition.occlusionBaseOffsetY;
  const horizontallyInsideCanopy =
    Math.abs(playerPos.x - canopyCenterX) < canopyHalfWidth;
  const shouldOccludePlayer = playerBehindTree && horizontallyInsideCanopy;
  const canopySourceHeight = Math.max(
    1,
    Math.floor(definition.h * definition.canopyBottomRatio),
  );
  const canopyDrawHeight = Math.round(
    height * (canopySourceHeight / definition.h),
  );

  if (shouldOccludePlayer) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprites.objects,
      definition.x,
      definition.y,
      definition.w,
      canopySourceHeight,
      x,
      y,
      width,
      canopyDrawHeight,
    );
    ctx.restore();
  }

  if (debug) {
    const baseScreenY = Math.round(tree.pos.y - cam.y);
    const centerScreenX = Math.round(canopyCenterX - cam.x);
    ctx.save();
    ctx.strokeStyle = "#ff4b4b";
    ctx.fillStyle = "#ff4b4b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(Math.round(tree.pos.x - cam.x), baseScreenY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, baseScreenY);
    ctx.lineTo(x + width, baseScreenY);
    ctx.stroke();
    ctx.strokeStyle = "#ffdc61";
    ctx.beginPath();
    ctx.moveTo(x, y + canopyDrawHeight);
    ctx.lineTo(x + width, y + canopyDrawHeight);
    ctx.stroke();
    ctx.strokeStyle = "#61e7ff";
    ctx.strokeRect(
      Math.round(centerScreenX - canopyHalfWidth),
      y,
      Math.round(canopyHalfWidth * 2),
      height,
    );
    ctx.fillStyle = shouldOccludePlayer ? "#7dff7d" : "#ff8a7d";
    ctx.font = "bold 9px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `TREE OCCLUSION: ${shouldOccludePlayer ? "ON" : "OFF"}`,
      centerScreenX,
      y - 4,
    );
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(
      Math.round(playerPos.x - cam.x),
      Math.round(playerPos.y - cam.y),
      2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  return shouldOccludePlayer;
}

export function drawSpriteBush(
  ctx: CanvasRenderingContext2D,
  sprites: WorldSpriteSet,
  bush: BerryBush,
  cam: Camera,
): boolean {
  if (!ready(sprites.objects)) return false;
  const crop = BUSH_CROPS[bush.id % BUSH_CROPS.length];
  drawCrop(
    ctx,
    sprites.objects,
    crop,
    bush.pos.x - cam.x,
    bush.pos.y - cam.y + 2,
    56,
  );
  return true;
}

export function drawSpriteRock(
  ctx: CanvasRenderingContext2D,
  sprites: WorldSpriteSet,
  rock: WorldRock,
  cam: Camera,
): boolean {
  if (!ready(sprites.objects)) return false;
  const crop = ROCK_CROPS[rock.id % ROCK_CROPS.length];
  drawCrop(ctx, sprites.objects, crop, rock.pos.x - cam.x, rock.pos.y - cam.y + 8, 48);
  return true;
}
