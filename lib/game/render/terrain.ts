import {
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  type Camera,
} from "../types";
import { randRange } from "../utils";
import {
  DESERT_Y,
  FOREST_Y,
  RIVER_FORD_HALF,
  RIVER_FORD_Y,
  riverCenterX,
  riverFlowDir,
  riverHalfWidth,
} from "../biomes";

export function renderTerrain(winter: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext("2d")!;

  // —— Төв тал (steppe) суурь ——
  const base = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  if (winter) {
    base.addColorStop(0, "#b0c0ac");
    base.addColorStop(0.5, "#a8bba6");
    base.addColorStop(1, "#c0bca4");
  } else {
    base.addColorStop(0, "#4a7840");
    base.addColorStop(0.45, "#4b7d44");
    base.addColorStop(1, "#5a7a3a");
  }
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // —— Хойд ой — өргөн зөөлөн уусгалт ——
  const forestFade = FOREST_Y + WORLD_H * 0.14;
  const forestGrad = ctx.createLinearGradient(0, 0, 0, forestFade);
  if (winter) {
    forestGrad.addColorStop(0, "#5e6e5c");
    forestGrad.addColorStop(0.22, "#6a7a68");
    forestGrad.addColorStop(0.48, "rgba(106,122,104,0.72)");
    forestGrad.addColorStop(0.72, "rgba(138,154,130,0.32)");
    forestGrad.addColorStop(1, "rgba(138,154,130,0)");
  } else {
    forestGrad.addColorStop(0, "#152a14");
    forestGrad.addColorStop(0.2, "#1e3a1c");
    forestGrad.addColorStop(0.45, "rgba(45,82,40,0.75)");
    forestGrad.addColorStop(0.7, "rgba(55,100,50,0.35)");
    forestGrad.addColorStop(1, "rgba(55,100,50,0)");
  }
  ctx.fillStyle = forestGrad;
  ctx.fillRect(0, 0, WORLD_W, forestFade);

  // Ойн титэм толбо — уусгалтын бүсэд бүдгэрнэ
  const canopyCount = winter ? 100 : 160;
  for (let i = 0; i < canopyCount; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * forestFade * 0.92;
    const edge = Math.max(0, 1 - y / forestFade);
    const r = randRange(30, 78);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (winter) {
      g.addColorStop(0, `rgba(90,110,88,${0.38 * edge})`);
      g.addColorStop(1, "rgba(90,110,88,0)");
    } else {
      g.addColorStop(0, `rgba(28,70,30,${0.5 * edge})`);
      g.addColorStop(0.55, `rgba(40,90,42,${0.22 * edge})`);
      g.addColorStop(1, "rgba(40,90,42,0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // —— Өмнөд цөл — өргөн зөөлөн уусгалт ——
  const desertFade = WORLD_H * 0.14;
  const desertTop = DESERT_Y - desertFade;
  const desertGrad = ctx.createLinearGradient(0, desertTop, 0, WORLD_H);
  if (winter) {
    desertGrad.addColorStop(0, "rgba(180,175,150,0)");
    desertGrad.addColorStop(0.28, "rgba(200,192,160,0.3)");
    desertGrad.addColorStop(0.52, "rgba(200,192,160,0.72)");
    desertGrad.addColorStop(0.78, "#c8c0a0");
    desertGrad.addColorStop(1, "#b8ae8e");
  } else {
    desertGrad.addColorStop(0, "rgba(194,168,110,0)");
    desertGrad.addColorStop(0.25, "rgba(196,166,110,0.28)");
    desertGrad.addColorStop(0.48, "rgba(196,166,110,0.7)");
    desertGrad.addColorStop(0.72, "#c4a66e");
    desertGrad.addColorStop(0.9, "#d4b878");
    desertGrad.addColorStop(1, "#e0c888");
  }
  ctx.fillStyle = desertGrad;
  ctx.fillRect(0, desertTop, WORLD_W, WORLD_H - desertTop);

  // Цөлийн элсэн долгион — уусгалтын бүсэд бүдгэрнэ
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * WORLD_W;
    const y = desertTop + Math.random() * (WORLD_H - desertTop);
    const edge = Math.min(1, Math.max(0, (y - desertTop) / desertFade));
    const rx = randRange(45, 130);
    const ry = randRange(12, 30);
    ctx.fillStyle = winter
      ? `rgba(200,190,160,${0.18 * edge})`
      : `rgba(220,190,120,${0.24 * edge})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, randRange(-0.3, 0.3), 0, Math.PI * 2);
    ctx.fill();
  }

  // Сийрэг цөлийн бут (зурсан)
  if (!winter) {
    for (let i = 0; i < 55; i++) {
      const x = Math.random() * WORLD_W;
      const y = DESERT_Y + 30 + Math.random() * (WORLD_H - DESERT_Y - 50);
      ctx.strokeStyle = "rgba(90,110,50,0.45)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + randRange(-4, 4), y - randRange(6, 12));
      ctx.stroke();
      ctx.fillStyle = "rgba(110,130,55,0.32)";
      ctx.beginPath();
      ctx.arc(x + randRange(-3, 3), y - randRange(8, 14), randRange(3, 6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // —— Баруун уул/хад хасагдсан — тал газрын суурь бүх өргөнд үргэлжилнэ ——

  // —— Тал газрын өнгөний толбо ——
  for (let i = 0; i < 110; i++) {
    const x = Math.random() * WORLD_W;
    const y = FOREST_Y + Math.random() * (DESERT_Y - FOREST_Y);
    const r = randRange(60, 200);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (winter) {
      g.addColorStop(0, "rgba(255,255,255,0.14)");
      g.addColorStop(1, "rgba(255,255,255,0)");
    } else {
      const light = Math.random() < 0.5;
      g.addColorStop(
        0,
        light ? "rgba(120,170,90,0.16)" : "rgba(40,80,40,0.12)",
      );
      g.addColorStop(1, "rgba(0,0,0,0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Өвсний ширхэг — тал + ойн зах
  ctx.lineWidth = 1;
  for (let i = 0; i < 7200; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    if (y > DESERT_Y + 40) continue;
    const h = randRange(3, 7);
    const lean = randRange(-2, 2);
    const inForest = y < FOREST_Y;
    ctx.strokeStyle = winter
      ? `rgba(${200 + Math.floor(Math.random() * 40)},${210 + Math.floor(Math.random() * 30)},205,0.5)`
      : inForest
        ? `rgba(${25 + Math.floor(Math.random() * 30)},${70 + Math.floor(Math.random() * 40)},${30 + Math.floor(Math.random() * 20)},0.55)`
        : `rgba(${40 + Math.floor(Math.random() * 40)},${95 + Math.floor(Math.random() * 50)},${40 + Math.floor(Math.random() * 25)},0.55)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - h);
    ctx.stroke();
  }

  // Тал газрын чулуу (сийрэг)
  for (let i = 0; i < 35; i++) {
    const x = 80 + Math.random() * (WORLD_W - 160);
    const y = FOREST_Y + Math.random() * (DESERT_Y - FOREST_Y);
    const r = randRange(3, 8);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath();
    ctx.ellipse(x + 1.5, y + 1.5, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = winter ? "#9aa4a0" : "#8a8f88";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Цэцэг — зөвхөн тал
  if (!winter) {
    const petals = ["#f5f0e0", "#f0d060", "#e890b0", "#c8d8f8"];
    for (let i = 0; i < 180; i++) {
      const x = 60 + Math.random() * (WORLD_W - 120);
      const y = FOREST_Y + 30 + Math.random() * (DESERT_Y - FOREST_Y - 60);
      const c = petals[Math.floor(Math.random() * petals.length)]!;
      ctx.strokeStyle = "rgba(50,90,45,0.7)";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 4);
      ctx.stroke();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y - 5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // —— Зүүн гол ——
  drawRiver(ctx, winter);

  // Гэрийн шороон талбай (төв)
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const padG = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
  padG.addColorStop(0, winter ? "#8a7a60" : "#6f5742");
  padG.addColorStop(1, winter ? "rgba(138,122,96,0)" : "rgba(111,87,66,0)");
  ctx.fillStyle = padG;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 90;
    ctx.fillStyle = "rgba(60,45,32,0.25)";
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(a) * r,
      cy + Math.sin(a) * r,
      randRange(2, 5),
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

function drawRiver(ctx: CanvasRenderingContext2D, winter: boolean): void {
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
    const y = Math.random() * WORLD_H;
    const cx = riverCenterX(y);
    const half = riverHalfWidth(y);
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = cx + side * (half + randRange(0, 28));
    const rx = randRange(14, 36);
    const ry = randRange(7, 18);
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
    ctx.ellipse(x, y, rx, ry, randRange(-0.4, 0.4), 0, Math.PI * 2);
    ctx.fill();
  }

  // Усны бие — зөөлөн хөх-ногоон
  buildRiverPath(ctx, 0);
  ctx.fillStyle = winter ? "#6a8a94" : "#5a8a9a";
  ctx.fill();

  // Усны захыг зөөлөн гэрэлтүүлэх
  buildRiverPath(ctx, -4);
  ctx.strokeStyle = winter
    ? "rgba(150,175,180,0.2)"
    : "rgba(142,184,196,0.22)";
  ctx.lineWidth = 10;
  ctx.stroke();

  // Гүнзгий төв / гүехэн зах — ургамал шиг радиал толбо
  for (let y = 0; y < WORLD_H; y += 28) {
    const cx = riverCenterX(y + 14);
    const half = riverHalfWidth(y + 14);
    if (half < 8) continue;

    // Төв — гүн
    const deep = ctx.createRadialGradient(cx, y + 14, 0, cx, y + 14, half * 0.85);
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
      const shallow = ctx.createRadialGradient(sx, y + 14, 0, sx, y + 14, half * 0.55);
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
    const y = Math.random() * WORLD_H;
    const cx = riverCenterX(y);
    const half = riverHalfWidth(y);
    const x = cx + (Math.random() - 0.5) * half * 1.4;
    const rx = randRange(14, 36);
    const ry = randRange(2.5, 5.5);
    ctx.fillStyle = winter
      ? "rgba(180,200,205,0.1)"
      : "rgba(142,184,196,0.12)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, randRange(-0.15, 0.15), 0, Math.PI * 2);
    ctx.fill();
  }
  // Эргийн хайрганы жижиг чулуу
  for (let i = 0; i < 55; i++) {
    const y = Math.random() * WORLD_H;
    const cx = riverCenterX(y);
    const half = riverHalfWidth(y);
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = cx + side * (half * (0.55 + Math.random() * 0.4));
    const r = randRange(1.2, 3.2);
    ctx.fillStyle = winter
      ? "rgba(120,125,118,0.35)"
      : "rgba(95,90,75,0.32)";
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
    const sideFrac = ((lane + 0.5) / bandCount - 0.5) * 1.55 + (h0 - 0.5) * 0.18;
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
        riverCenterX(y) +
        sideFrac * half * 0.78 +
        (h3 - 0.5) * 10 -
        cam.x;
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
    const y =
      (((seed * 13 + time * speed) % WORLD_H) + WORLD_H) % WORLD_H;
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
