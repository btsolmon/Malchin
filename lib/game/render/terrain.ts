import { VIEW_H, VIEW_W, WORLD_H, WORLD_W, type Camera } from "../types";
import {
  biomeAt,
  RIVER_FORD_HALF,
  RIVER_FORD_Y,
  riverCenterX,
  riverFlowDir,
  riverHalfWidth,
  type BiomeKind,
} from "../biomes";
import {
  DEFAULT_TERRAIN_SEED,
  createSeededRandom,
  sampleTerrain,
  terrainHash,
} from "../terrainGenerator";

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const SUMMER_PALETTE: Record<BiomeKind, RgbColor> = {
  forest: { r: 42, g: 78, b: 43 },
  meadow: { r: 91, g: 137, b: 68 },
  steppe: { r: 74, g: 119, b: 62 },
  drySteppe: { r: 137, g: 128, b: 73 },
  desert: { r: 198, g: 169, b: 105 },
  rocky: { r: 111, g: 114, b: 92 },
  riverbank: { r: 70, g: 104, b: 70 },
};

const WINTER_PALETTE: Record<BiomeKind, RgbColor> = {
  forest: { r: 102, g: 119, b: 102 },
  meadow: { r: 171, g: 181, b: 165 },
  steppe: { r: 169, g: 184, b: 165 },
  drySteppe: { r: 191, g: 187, b: 158 },
  desert: { r: 199, g: 192, b: 164 },
  rocky: { r: 151, g: 157, b: 148 },
  riverbank: { r: 145, g: 158, b: 151 },
};

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * 24px-resolution biome map үүсгээд canvas дээр smooth scale хийнэ.
 * Ингэснээр ой/цөл шулуун хилгүй, зөөлөн natural хэлбэртэй харагдана.
 */
function drawBiomeBase(
  ctx: CanvasRenderingContext2D,
  winter: boolean,
  seed: number,
): void {
  const cell = 24;
  const lowW = Math.ceil(WORLD_W / cell);
  const lowH = Math.ceil(WORLD_H / cell);
  const low = document.createElement("canvas");
  low.width = lowW;
  low.height = lowH;
  const lowCtx = low.getContext("2d");
  if (!lowCtx) return;

  const image = lowCtx.createImageData(lowW, lowH);
  const palette = winter ? WINTER_PALETTE : SUMMER_PALETTE;

  for (let gy = 0; gy < lowH; gy++) {
    for (let gx = 0; gx < lowW; gx++) {
      const x = Math.min(WORLD_W - 1, gx * cell + cell / 2);
      const y = Math.min(WORLD_H - 1, gy * cell + cell / 2);
      const biome = biomeAt(x, y, seed);
      const terrain = sampleTerrain(x, y, seed);
      const base = palette[biome];
      const micro = (terrainHash(gx, gy, seed + 901) - 0.5) * 10;
      const elevationShade = (terrain.elevation - 0.5) * 30;
      const moistureGreen = (terrain.moisture - 0.5) * (winter ? 7 : 18);
      const roughGray = terrain.roughness * (biome === "rocky" ? 12 : 4);
      const index = (gy * lowW + gx) * 4;

      image.data[index] = clampByte(
        base.r + elevationShade + roughGray + micro,
      );
      image.data[index + 1] = clampByte(
        base.g + elevationShade * 0.58 + moistureGreen + roughGray + micro,
      );
      image.data[index + 2] = clampByte(
        base.b +
          elevationShade * 0.34 +
          terrain.moisture * 5 +
          roughGray +
          micro,
      );
      image.data[index + 3] = 255;
    }
  }

  lowCtx.putImageData(image, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(low, 0, 0, WORLD_W, WORLD_H);
  ctx.restore();
}

function drawElevationAccents(
  ctx: CanvasRenderingContext2D,
  winter: boolean,
  seed: number,
): void {
  const cell = 95;
  for (let y = cell / 2; y < WORLD_H; y += cell) {
    for (let x = cell / 2; x < WORLD_W; x += cell) {
      const terrain = sampleTerrain(x, y, seed);
      if (terrain.elevation > 0.66) {
        const radius = 40 + terrain.roughness * 55;
        const gradient = ctx.createRadialGradient(
          x - 8,
          y - 8,
          0,
          x,
          y,
          radius,
        );
        gradient.addColorStop(
          0,
          winter
            ? `rgba(255,255,255,${0.035 + terrain.elevation * 0.035})`
            : `rgba(210,205,155,${0.025 + terrain.elevation * 0.045})`,
        );
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * 0.58, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (terrain.elevation < 0.35 && terrain.moisture > 0.56) {
        const radius = 38 + terrain.moisture * 38;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(
          0,
          winter ? "rgba(95,115,110,0.055)" : "rgba(28,72,58,0.075)",
        );
        gradient.addColorStop(1, "rgba(20,55,45,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * 0.62, 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

interface PathPoint {
  x: number;
  y: number;
}

function traceSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: PathPoint[],
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    ctx.quadraticCurveTo(
      current.x,
      current.y,
      (current.x + next.x) / 2,
      (current.y + next.y) / 2,
    );
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  points: PathPoint[],
  winter: boolean,
  width: number,
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  traceSmoothPath(ctx, points);
  ctx.strokeStyle = winter ? "rgba(92,82,66,0.19)" : "rgba(66,48,30,0.2)";
  ctx.lineWidth = width + 13;
  ctx.stroke();

  traceSmoothPath(ctx, points);
  ctx.strokeStyle = winter ? "rgba(150,138,115,0.44)" : "rgba(133,101,63,0.5)";
  ctx.lineWidth = width + 5;
  ctx.stroke();

  traceSmoothPath(ctx, points);
  ctx.strokeStyle = winter ? "rgba(174,164,141,0.3)" : "rgba(164,132,85,0.34)";
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

/** Camp, өвгөний гэр, ford, зүүн route-ийг холбосон permanent шороон зам. */
function drawWorldPaths(
  ctx: CanvasRenderingContext2D,
  winter: boolean,
  seed: number,
): void {
  const center = { x: WORLD_W / 2, y: WORLD_H / 2 };
  const elder = { x: center.x + 320, y: center.y + 210 };
  const fordX = riverCenterX(RIVER_FORD_Y);
  const bend = (terrainHash(3, 7, seed + 401) - 0.5) * 55;

  drawPath(
    ctx,
    [
      { x: center.x + 45, y: center.y + 35 },
      { x: center.x + 150, y: center.y + 80 + bend },
      { x: elder.x - 80, y: elder.y - 35 },
      elder,
    ],
    winter,
    18,
  );

  drawPath(
    ctx,
    [
      { x: center.x + 25, y: center.y - 5 },
      { x: center.x + 150, y: center.y - 20 },
      { x: fordX - 115, y: RIVER_FORD_Y - 18 },
      { x: fordX + 100, y: RIVER_FORD_Y + 8 },
    ],
    winter,
    20,
  );

  drawPath(
    ctx,
    [
      { x: fordX + 75, y: RIVER_FORD_Y + 18 },
      { x: fordX + 155, y: RIVER_FORD_Y + 120 },
      { x: WORLD_W - 180, y: WORLD_H - 290 },
      { x: WORLD_W - 145, y: WORLD_H - 160 },
    ],
    winter,
    16,
  );
}

function drawGrassBlade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  biome: BiomeKind,
  winter: boolean,
  random: () => number,
): void {
  const height = 2.5 + random() * 5;
  const lean = (random() - 0.5) * 3;
  if (winter) {
    ctx.strokeStyle = `rgba(220,226,216,${0.18 + random() * 0.25})`;
  } else if (biome === "forest") {
    ctx.strokeStyle = `rgba(27,75,36,${0.34 + random() * 0.24})`;
  } else if (biome === "drySteppe" || biome === "desert") {
    ctx.strokeStyle = `rgba(126,111,56,${0.3 + random() * 0.24})`;
  } else if (biome === "riverbank") {
    ctx.strokeStyle = `rgba(42,100,58,${0.38 + random() * 0.25})`;
  } else {
    ctx.strokeStyle = `rgba(47,105,46,${0.32 + random() * 0.25})`;
  }
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + lean, y - height);
  ctx.stroke();
}

/** Biome-д тохирсон жижиг cluster/detail-ууд. */
function drawTerrainClusters(
  ctx: CanvasRenderingContext2D,
  winter: boolean,
  seed: number,
  random: () => number,
): void {
  ctx.lineWidth = 1;

  for (let i = 0; i < 6500; i++) {
    const x = random() * WORLD_W;
    const y = random() * WORLD_H;
    const biome = biomeAt(x, y, seed);
    const terrain = sampleTerrain(x, y, seed);
    const chance =
      biome === "meadow"
        ? 0.95
        : biome === "forest"
          ? 0.72
          : biome === "steppe"
            ? 0.8
            : biome === "riverbank"
              ? 0.86
              : biome === "drySteppe"
                ? 0.42
                : 0.12;
    if (random() > chance * (0.62 + terrain.fertility * 0.48)) continue;
    drawGrassBlade(ctx, x, y, biome, winter, random);
  }

  if (!winter) {
    const petals = ["#f5f0e0", "#f0d060", "#e890b0", "#c8d8f8", "#e5b96a"];
    for (let i = 0; i < 290; i++) {
      const x = 45 + random() * (WORLD_W - 90);
      const y = 45 + random() * (WORLD_H - 90);
      const biome = biomeAt(x, y, seed);
      const terrain = sampleTerrain(x, y, seed);
      if (
        (biome !== "meadow" && biome !== "steppe") ||
        terrain.fertility < 0.5 ||
        random() > terrain.fertility
      ) {
        continue;
      }
      ctx.strokeStyle = "rgba(45,88,42,0.66)";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (random() - 0.5), y - 4);
      ctx.stroke();
      ctx.fillStyle = petals[Math.floor(random() * petals.length)];
      ctx.beginPath();
      ctx.arc(x, y - 5, 1.4 + random() * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Хуурай бут, сөөг
  for (let i = 0; i < 150; i++) {
    const x = 40 + random() * (WORLD_W - 80);
    const y = 40 + random() * (WORLD_H - 80);
    const biome = biomeAt(x, y, seed);
    if (biome !== "drySteppe" && biome !== "desert") continue;
    const height = 6 + random() * 9;
    ctx.strokeStyle = winter ? "rgba(115,112,95,0.34)" : "rgba(94,102,48,0.46)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 5, y - height);
    ctx.moveTo(x, y - height * 0.42);
    ctx.lineTo(x - 4 - random() * 4, y - height * 0.75);
    ctx.moveTo(x, y - height * 0.52);
    ctx.lineTo(x + 4 + random() * 4, y - height * 0.86);
    ctx.stroke();
  }

  // Terrain-тэй уялдсан жижиг чулууны cluster
  for (let i = 0; i < 125; i++) {
    const x = 60 + random() * (WORLD_W - 120);
    const y = 60 + random() * (WORLD_H - 120);
    const biome = biomeAt(x, y, seed);
    const terrain = sampleTerrain(x, y, seed);
    if (
      biome !== "rocky" &&
      biome !== "drySteppe" &&
      !(biome === "steppe" && terrain.roughness > 0.58)
    ) {
      continue;
    }
    const count = 2 + Math.floor(random() * 4);
    for (let j = 0; j < count; j++) {
      const ox = (random() - 0.5) * 22;
      const oy = (random() - 0.5) * 12;
      const radius = 2 + random() * 5;
      ctx.fillStyle = "rgba(30,30,25,0.14)";
      ctx.beginPath();
      ctx.ellipse(
        x + ox + 1.5,
        y + oy + 1.5,
        radius,
        radius * 0.62,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = winter
        ? "rgba(145,151,145,0.75)"
        : "rgba(112,112,91,0.72)";
      ctx.beginPath();
      ctx.ellipse(x + ox, y + oy, radius, radius * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Голын хоёр эргийн зэгс
  if (!winter) {
    for (let i = 0; i < 360; i++) {
      const y = random() * WORLD_H;
      if (Math.abs(y - RIVER_FORD_Y) < RIVER_FORD_HALF * 0.62) continue;
      const half = riverHalfWidth(y);
      const side = random() < 0.5 ? -1 : 1;
      const x = riverCenterX(y) + side * (half + 8 + random() * 28);
      if (x < 10 || x > WORLD_W - 10) continue;
      const height = 7 + random() * 10;
      ctx.strokeStyle = `rgba(46,92,48,${0.32 + random() * 0.28})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (random() - 0.5) * 2, y - height);
      ctx.stroke();
      if (random() > 0.55) {
        ctx.fillStyle = "rgba(103,87,44,0.55)";
        ctx.fillRect(Math.round(x - 1), Math.round(y - height - 2), 2, 4);
      }
    }
  }
}

export function renderTerrain(
  winter: boolean,
  seed = DEFAULT_TERRAIN_SEED,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext("2d")!;
  const random = createSeededRandom(seed + (winter ? 9001 : 0));

  drawBiomeBase(ctx, winter, seed);
  drawElevationAccents(ctx, winter, seed);
  drawWorldPaths(ctx, winter, seed);
  drawTerrainClusters(ctx, winter, seed, random);

  // Зүүн гол зам/terrain detail-ийн дээр зурагдана.
  drawRiver(ctx, winter, random);

  // Төв бууцны шороон талбай
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const padG = ctx.createRadialGradient(cx, cy, 18, cx, cy, 122);
  padG.addColorStop(
    0,
    winter ? "rgba(130,115,88,0.88)" : "rgba(104,78,53,0.9)",
  );
  padG.addColorStop(
    0.64,
    winter ? "rgba(145,132,105,0.45)" : "rgba(119,91,61,0.43)",
  );
  padG.addColorStop(1, "rgba(100,75,50,0)");
  ctx.fillStyle = padG;
  ctx.beginPath();
  ctx.arc(cx, cy, 122, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 46; i++) {
    const angle = random() * Math.PI * 2;
    const radius = random() * 92;
    const size = 1.5 + random() * 3.5;
    ctx.fillStyle = winter ? "rgba(72,62,48,0.18)" : "rgba(55,39,27,0.24)";
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius,
      size,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  return canvas;
}

/** Эргийн зөөлөн долгион — шулуун неон ирмэг биш */
function riverEdgeWobble(y: number, side: -1 | 1): number {
  return (
    Math.sin(y * 0.037 + side * 1.7) * 3.2 +
    Math.sin(y * 0.091 + side * 0.4) * 1.6 +
    Math.sin(y * 0.019 + 2.3) * 1.1
  );
}

function buildRiverPath(
  ctx: CanvasRenderingContext2D,
  margin: number,
  y0 = 0,
  y1 = WORLD_H,
  step = 6,
): void {
  ctx.beginPath();
  for (let y = y0; y <= y1; y += step) {
    const cx = riverCenterX(y);
    const half = riverHalfWidth(y) + margin + riverEdgeWobble(y, -1);
    if (y === y0) ctx.moveTo(cx - half, y);
    else ctx.lineTo(cx - half, y);
  }
  for (let y = y1; y >= y0; y -= step) {
    const cx = riverCenterX(y);
    const half = riverHalfWidth(y) + margin + riverEdgeWobble(y, 1);
    ctx.lineTo(cx + half, y);
  }
  ctx.closePath();
}

function drawRiver(
  ctx: CanvasRenderingContext2D,
  winter: boolean,
  random: () => number,
): void {
  const range = (min: number, max: number): number =>
    min + random() * (max - min);
  // Нойтон эрэг — өргөн зөөлөн уусгалт
  for (const [margin, alpha] of [
    [36, 0.16],
    [26, 0.26],
    [18, 0.38],
  ] as const) {
    buildRiverPath(ctx, margin);
    ctx.fillStyle = winter
      ? `rgba(138,133,116,${alpha})`
      : `rgba(122,106,78,${alpha})`;
    ctx.fill();
  }

  // Эргийн зөөлөн толбо (нойтон элс / хайрга)
  for (let i = 0; i < 90; i++) {
    const y = random() * WORLD_H;
    const cx = riverCenterX(y);
    const half = riverHalfWidth(y);
    const side = random() < 0.5 ? -1 : 1;
    const x = cx + side * (half + range(0, 28));
    const rx = range(14, 36);
    const ry = range(7, 18);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    if (winter) {
      g.addColorStop(0, "rgba(150,145,125,0.28)");
      g.addColorStop(1, "rgba(150,145,125,0)");
    } else {
      g.addColorStop(0, "rgba(160,130,85,0.3)");
      g.addColorStop(1, "rgba(160,130,85,0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, range(-0.4, 0.4), 0, Math.PI * 2);
    ctx.fill();
  }

  // Усны бие — зөөлөн хөх-ногоон
  buildRiverPath(ctx, 0);
  ctx.fillStyle = winter ? "#6a8a94" : "#5a8a9a";
  ctx.fill();

  // Усны захыг зөөлөн гэрэлтүүлэх
  buildRiverPath(ctx, -4);
  ctx.strokeStyle = winter ? "rgba(150,175,180,0.2)" : "rgba(142,184,196,0.22)";
  ctx.lineWidth = 10;
  ctx.stroke();

  // Гүнзгий төв / гүехэн зах — ургамал шиг радиал толбо
  for (let y = 0; y < WORLD_H; y += 28) {
    const cx = riverCenterX(y + 14);
    const half = riverHalfWidth(y + 14);
    if (half < 8) continue;

    // Төв — гүн
    const deep = ctx.createRadialGradient(
      cx,
      y + 14,
      0,
      cx,
      y + 14,
      half * 0.85,
    );
    if (winter) {
      deep.addColorStop(0, "rgba(70,100,112,0.42)");
      deep.addColorStop(0.55, "rgba(80,110,120,0.18)");
      deep.addColorStop(1, "rgba(80,110,120,0)");
    } else {
      deep.addColorStop(0, "rgba(55,95,108,0.45)");
      deep.addColorStop(0.5, "rgba(70,115,125,0.2)");
      deep.addColorStop(1, "rgba(70,115,125,0)");
    }
    ctx.fillStyle = deep;
    ctx.beginPath();
    ctx.ellipse(cx, y + 14, half * 0.72, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Зах — гүехэн гэрэл
    for (const side of [-1, 1] as const) {
      const sx = cx + side * half * 0.72;
      const shallow = ctx.createRadialGradient(
        sx,
        y + 14,
        0,
        sx,
        y + 14,
        half * 0.55,
      );
      if (winter) {
        shallow.addColorStop(0, "rgba(150,175,180,0.28)");
        shallow.addColorStop(1, "rgba(150,175,180,0)");
      } else {
        shallow.addColorStop(0, "rgba(142,184,196,0.32)");
        shallow.addColorStop(1, "rgba(142,184,196,0)");
      }
      ctx.fillStyle = shallow;
      ctx.beginPath();
      ctx.ellipse(sx, y + 14, half * 0.42, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Статик зөөлөн долгион — урт эллипс / тунгалаг бүс (неон зураас биш)
  ctx.save();
  buildRiverPath(ctx, -1);
  ctx.clip();
  for (let i = 0; i < 48; i++) {
    const y = random() * WORLD_H;
    const cx = riverCenterX(y);
    const half = riverHalfWidth(y);
    const x = cx + (random() - 0.5) * half * 1.4;
    const rx = range(14, 36);
    const ry = range(2.5, 5.5);
    ctx.fillStyle = winter ? "rgba(180,200,205,0.1)" : "rgba(142,184,196,0.12)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, range(-0.15, 0.15), 0, Math.PI * 2);
    ctx.fill();
  }
  // Эргийн хайрганы жижиг чулуу
  for (let i = 0; i < 55; i++) {
    const y = random() * WORLD_H;
    const cx = riverCenterX(y);
    const half = riverHalfWidth(y);
    const side = random() < 0.5 ? -1 : 1;
    const x = cx + side * (half * (0.55 + random() * 0.4));
    const r = range(1.2, 3.2);
    ctx.fillStyle = winter ? "rgba(120,125,118,0.35)" : "rgba(95,90,75,0.32)";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Гатлах газар — гүехэн элсэн өнгө (цөлийн палитр)
  const fordY0 = RIVER_FORD_Y - RIVER_FORD_HALF * 0.55;
  const fordY1 = RIVER_FORD_Y + RIVER_FORD_HALF * 0.55;
  for (let y = fordY0; y <= fordY1; y += 8) {
    const cx = riverCenterX(y);
    const half = riverHalfWidth(y);
    const t = 1 - Math.abs(y - RIVER_FORD_Y) / (RIVER_FORD_HALF * 0.55);
    const g = ctx.createRadialGradient(cx, y, 0, cx, y, half);
    if (winter) {
      g.addColorStop(0, `rgba(170,160,130,${0.38 * t})`);
      g.addColorStop(1, `rgba(170,160,130,0)`);
    } else {
      g.addColorStop(0, `rgba(196,166,110,${0.42 * t})`);
      g.addColorStop(1, `rgba(196,166,110,0)`);
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, y, half * 0.95, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Deterministic 0..1 hash — урсгалын тэмдгийн байрлалд */
function riverFoamHash(i: number, lane: number): number {
  const n = Math.sin(i * 127.1 + lane * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Камерын хүрээнд голын урсгал — зөөлөн зураасан хэл (неон зураас биш) */
export function drawRiverFlowOverlay(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  time: number,
  winter: boolean,
): void {
  const yStart = Math.max(0, Math.floor(cam.y) - 8);
  const yEnd = Math.min(WORLD_H, Math.ceil(cam.y + VIEW_H) + 8);
  if (yEnd <= yStart) return;

  let overlaps = false;
  for (let y = yStart; y <= yEnd; y += 40) {
    const cx = riverCenterX(y);
    const half = riverHalfWidth(y) + 6;
    if (cx + half >= cam.x && cx - half <= cam.x + VIEW_W) {
      overlaps = true;
      break;
    }
  }
  if (!overlaps) return;

  ctx.save();
  ctx.beginPath();
  const step = 6;
  let started = false;
  for (let y = yStart; y <= yEnd; y += step) {
    const sx =
      riverCenterX(y) - riverHalfWidth(y) - riverEdgeWobble(y, -1) - cam.x;
    const sy = y - cam.y;
    if (!started) {
      ctx.moveTo(sx, sy);
      started = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }
  for (let y = yEnd; y >= yStart; y -= step) {
    const sx =
      riverCenterX(y) + riverHalfWidth(y) + riverEdgeWobble(y, 1) - cam.x;
    const sy = y - cam.y;
    ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.clip();

  // Цөөн зөөлөн долгионы бүс — өмнөдөд гүйдэг урт эллипс
  const bandCount = 5;
  for (let lane = 0; lane < bandCount; lane++) {
    const h0 = riverFoamHash(lane, 1);
    const h1 = riverFoamHash(lane, 2);
    const h2 = riverFoamHash(lane, 3);
    const sideFrac =
      ((lane + 0.5) / bandCount - 0.5) * 1.55 + (h0 - 0.5) * 0.18;
    const period = 72 + h1 * 48;
    const speed = 28 + h0 * 22;
    const phase = h1 * period;
    const scroll = time * speed + phase;
    const i0 = Math.floor((yStart - scroll) / period) - 1;
    const i1 = Math.ceil((yEnd - scroll) / period) + 1;

    for (let i = i0; i <= i1; i++) {
      const h3 = riverFoamHash(i, lane);
      const h4 = riverFoamHash(i + 17, lane);
      const y = i * period + scroll + (h3 - 0.5) * period * 0.35;
      if (y < yStart - 20 || y > yEnd + 20) continue;
      const half = riverHalfWidth(y);
      const x =
        riverCenterX(y) + sideFrac * half * 0.78 + (h3 - 0.5) * 10 - cam.x;
      const sy = y - cam.y;
      const rx = 16 + h4 * 22;
      const ry = 2.2 + h2 * 2.4;
      const flow = riverFlowDir(y);
      const ang = Math.atan2(flow.y, flow.x) - Math.PI / 2;
      const a = 0.08 + h2 * 0.07;

      const g = ctx.createRadialGradient(x, sy, 0, x, sy, rx);
      if (winter) {
        g.addColorStop(0, `rgba(170,190,195,${a})`);
        g.addColorStop(1, `rgba(170,190,195,0)`);
      } else {
        g.addColorStop(0, `rgba(142,184,196,${a})`);
        g.addColorStop(1, `rgba(106,154,170,0)`);
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, sy, rx, ry, ang, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Зөөлөн хөөс — бага альфа, цөөн толбо
  for (let i = 0; i < 14; i++) {
    const seed = i * 97.3;
    const h = riverFoamHash(i, 99);
    const speed = 22 + h * 28;
    const y = (((seed * 13 + time * speed) % WORLD_H) + WORLD_H) % WORLD_H;
    if (y < yStart - 10 || y > yEnd + 10) continue;
    const half = riverHalfWidth(y);
    const side = (riverFoamHash(i, 7) - 0.5) * 2 * half * 0.7;
    const cx = riverCenterX(y) + side;
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.4 + seed));
    const flow = riverFlowDir(y);
    const a = 0.12 * pulse;
    ctx.fillStyle = winter
      ? `rgba(220,230,228,${a})`
      : `rgba(235,242,240,${a})`;
    ctx.beginPath();
    ctx.ellipse(
      cx - cam.x,
      y - cam.y,
      3.5 + (i % 3) * 1.2,
      1.4 + (i % 2) * 0.4,
      Math.atan2(flow.y, flow.x),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
}
