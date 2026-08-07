import { Camera, CAMPFIRE_IGNITE_SEC, GameState, VIEW_H, VIEW_W, World } from "../types";
import { lerp } from "../utils";

/** Өдрийн цагаас хамаарсан тинт (r,g,b,a) */
export function skyTint(hour: number): [number, number, number, number] {
  const keys: Array<[number, [number, number, number, number]]> = [
    [0, [10, 16, 48, 0.6]],
    [5, [10, 16, 48, 0.6]],
    [6.5, [255, 150, 60, 0.16]],
    [8, [0, 0, 0, 0]],
    [18, [0, 0, 0, 0]],
    [19.5, [255, 120, 50, 0.18]],
    [21, [10, 16, 48, 0.6]],
    [24, [10, 16, 48, 0.6]],
  ];
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, c0] = keys[i];
    const [h1, c1] = keys[i + 1];
    if (hour >= h0 && hour <= h1) {
      const t = h1 === h0 ? 0 : (hour - h0) / (h1 - h0);
      return [
        lerp(c0[0], c1[0], t),
        lerp(c0[1], c1[1], t),
        lerp(c0[2], c1[2], t),
        lerp(c0[3], c1[3], t),
      ];
    }
  }
  return [0, 0, 0, 0];
}

export function drawLighting(
  ctx: CanvasRenderingContext2D,
  lightCanvas: HTMLCanvasElement,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  const [r, g, b, a] = skyTint(state.world.timeOfDay);
  if (a <= 0.02) return;

  const fire = state.world.campfire;
  const outdoorFire = fire.placed && (fire.lit || fire.igniting > 0);

  if (a < 0.3 || !outdoorFire) {
    // Энгийн тинт (гэрлийн нүх шаардлагагүй үед мөн адил, гэхдээ галтай бол нүхлэх)
    if (!outdoorFire) {
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      return;
    }
  }

  const lc = lightCanvas.getContext("2d")!;
  lc.clearRect(0, 0, VIEW_W, VIEW_H);
  lc.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  lc.fillRect(0, 0, VIEW_W, VIEW_H);

  lc.globalCompositeOperation = "destination-out";

  if (outdoorFire) {
    const fx = fire.pos.x - cam.x;
    const fy = fire.pos.y - cam.y;
    const igniteP =
      fire.igniting > 0
        ? Math.max(0.2, 1 - fire.igniting / CAMPFIRE_IGNITE_SEC)
        : 1;
    const rad = 150 * igniteP * (1 + Math.sin(time * 9) * 0.05);
    const fg = lc.createRadialGradient(fx, fy, 8, fx, fy, rad);
    fg.addColorStop(0, `rgba(0,0,0,${0.95 * igniteP})`);
    fg.addColorStop(0.6, `rgba(0,0,0,${0.5 * igniteP})`);
    fg.addColorStop(1, "rgba(0,0,0,0)");
    lc.fillStyle = fg;
    lc.beginPath();
    lc.arc(fx, fy, rad, 0, Math.PI * 2);
    lc.fill();
  }

  // Тоглогчийн эргэн тойрны бүдэг гэрэл
  const px = state.player.pos.x - cam.x;
  const py = state.player.pos.y - cam.y;
  const pg = lc.createRadialGradient(px, py, 4, px, py, 80);
  pg.addColorStop(0, "rgba(0,0,0,0.4)");
  pg.addColorStop(1, "rgba(0,0,0,0)");
  lc.fillStyle = pg;
  lc.beginPath();
  lc.arc(px, py, 80, 0, Math.PI * 2);
  lc.fill();

  lc.globalCompositeOperation = "source-over";
  ctx.drawImage(lightCanvas, 0, 0, VIEW_W, VIEW_H);
}

/** Эерэг модуляар ороож wrap хийнэ (сөрөг % үүсгэхгүй) */
function wrap(v: number, span: number): number {
  return ((v % span) + span) % span;
}

/** Цас — зөөлөн ширхэг, удаан уналт, жижиг салхины шилжилт */
function drawSnowFx(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  // Алс (жижиг, бүдэг, удаан)
  for (let i = 0; i < 55; i++) {
    const phase = i * 1.618;
    const drift = Math.sin(time * 0.55 + phase) * 18;
    const sx = wrap(i * 73.1 + time * 12 + drift, VIEW_W + 30) - 15;
    const sy = wrap(i * 41.7 + time * 22 + phase * 3, VIEW_H + 30) - 15;
    const r = 0.7 + (i % 3) * 0.25;
    ctx.fillStyle = `rgba(245,248,255,${0.18 + (i % 4) * 0.04})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Дунд давхарга
  for (let i = 0; i < 40; i++) {
    const phase = i * 2.399;
    const drift =
      Math.sin(time * 0.7 + phase) * 28 +
      Math.cos(time * 0.35 + phase * 0.5) * 8;
    const sx = wrap(i * 91.3 + time * 18 + drift, VIEW_W + 40) - 20;
    const sy = wrap(i * 57.1 + time * 32 + phase * 5, VIEW_H + 40) - 20;
    const r = 1.1 + (i % 4) * 0.35;
    ctx.fillStyle = `rgba(250,252,255,${0.28 + (i % 5) * 0.05})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    // Зөөлөн бүдгэрэлт — давхарсан илүү том бүдэг тойрог
    if (i % 3 === 0) {
      ctx.fillStyle = `rgba(255,255,255,0.08)`;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Ойрын цөөн том ширхэг
  for (let i = 0; i < 14; i++) {
    const phase = i * 3.1;
    const drift = Math.sin(time * 0.45 + phase) * 36;
    const sx = wrap(i * 137.7 + time * 24 + drift, VIEW_W + 50) - 25;
    const sy = wrap(i * 89.3 + time * 42 + phase * 7, VIEW_H + 50) - 25;
    const r = 1.8 + (i % 3) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + (i % 3) * 0.06})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.arc(sx - 0.4, sy - 0.3, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Бороо / шуурга — нимгэн налуу зураас, гүнзгий давхарга */
function drawRainFx(ctx: CanvasRenderingContext2D, time: number): void {
  // Бараан тинт
  ctx.fillStyle = "rgba(18,26,42,0.18)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Салхины налуу — хөдөлгөөнтэй ижил тийш (+x = баруун тийш ташуу)
  const windX = 0.42;
  const lenBg = 10;
  const lenMid = 14;
  const lenFg = 18;

  ctx.save();
  ctx.lineCap = "round";

  // Алс — олон, нимгэн, бүдэг
  ctx.strokeStyle = "rgba(160,178,200,0.18)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < 55; i++) {
    const sx = wrap(i * 113.3 + time * 210, VIEW_W + 50) - 25;
    const sy = wrap(i * 67.9 + time * 280 + i * 11, VIEW_H + 40) - 20;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + windX * lenBg, sy + lenBg);
  }
  ctx.stroke();

  // Дунд — нягт, гол визуал
  ctx.strokeStyle = "rgba(170,190,215,0.28)";
  ctx.lineWidth = 0.95;
  ctx.beginPath();
  for (let i = 0; i < 45; i++) {
    const sx = wrap(i * 97.1 + time * 260 + 40, VIEW_W + 60) - 30;
    const sy = wrap(i * 83.7 + time * 340 + i * 17, VIEW_H + 50) - 25;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + windX * lenMid, sy + lenMid);
  }
  ctx.stroke();

  // Ойр — цөөн, арай илүү тод
  ctx.strokeStyle = "rgba(185,205,225,0.38)";
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const sx = wrap(i * 151.7 + time * 320 + 80, VIEW_W + 70) - 35;
    const sy = wrap(i * 101.3 + time * 400 + i * 23, VIEW_H + 60) - 30;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + windX * lenFg, sy + lenFg);
  }
  ctx.stroke();

  // Газрын ойролцоо бага зэрэг цацрах (доод хэсэг, маш зөөлөн)
  ctx.fillStyle = "rgba(190,205,220,0.12)";
  for (let i = 0; i < 10; i++) {
    const life = wrap(time * 3.2 + i * 0.73, 1);
    const px = wrap(i * 197.3 + Math.floor(time * 2.1 + i) * 47, VIEW_W);
    const py = VIEW_H - 8 - (i % 4) * 5 - life * 6;
    const rx = 1.2 + life * 2.5;
    const ry = 0.4 + life * 0.6;
    ctx.globalAlpha = (1 - life) * 0.55;
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawWeatherFx(
  ctx: CanvasRenderingContext2D,
  world: World,
  time: number,
): void {
  if (world.weather === "snow") {
    drawSnowFx(ctx, time);
  } else if (world.weather === "storm") {
    drawRainFx(ctx, time);
  }
}

/**
 * Дулаан багасахад дэлгэцийн хүрээ цэнхэрлэж мөстөнө.
 * warmth ≤ 45% үед эхэлж, 0-д бүрэн харагдана.
 */
export function drawColdFrostFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
): void {
  if (
    state.phase === "menu" ||
    state.phase === "intro" ||
    state.phase === "spirit"
  ) {
    return;
  }

  const { warmth, maxWarmth } = state.player.vitals;
  const ratio = maxWarmth > 0 ? warmth / maxWarmth : 1;
  if (ratio >= 0.45) return;

  const intensity = Math.min(1, (0.45 - ratio) / 0.45);
  const edge = 0.22 + intensity * 0.38;
  const alpha = 0.28 + intensity * 0.52;

  ctx.save();

  // Цэнхэр мөстөн vignette — зөвхөн хүрээ
  const frost = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    Math.min(VIEW_W, VIEW_H) * (0.42 - intensity * 0.08),
    VIEW_W / 2,
    VIEW_H / 2,
    Math.min(VIEW_W, VIEW_H) * 0.72,
  );
  frost.addColorStop(0, "rgba(120,190,255,0)");
  frost.addColorStop(0.55, `rgba(70,150,220,${alpha * 0.15})`);
  frost.addColorStop(0.82, `rgba(40,110,190,${alpha * 0.55})`);
  frost.addColorStop(1, `rgba(18,55,120,${alpha})`);
  ctx.fillStyle = frost;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Мөсний ирмэг — дөрвөн талд мөстөн ширхэг
  const shimmer = 0.85 + Math.sin(time * 2.4) * 0.15;
  ctx.globalAlpha = (0.35 + intensity * 0.55) * shimmer;
  ctx.strokeStyle = "rgba(210,235,255,0.85)";
  ctx.lineWidth = 1.2;
  ctx.fillStyle = "rgba(190,225,255,0.55)";

  const drawEdgeFrost = (
    count: number,
    along: "top" | "bottom" | "left" | "right",
  ): void => {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const wobble = Math.sin(time * 1.7 + i * 1.9 + along.length) * 2;
      let x = 0;
      let y = 0;
      let dx = 0;
      let dy = 0;
      if (along === "top") {
        x = t * VIEW_W;
        y = 4 + (i % 3) * 3 + wobble * 0.3;
        dx = 0;
        dy = 1;
      } else if (along === "bottom") {
        x = t * VIEW_W;
        y = VIEW_H - 4 - (i % 3) * 3 - wobble * 0.3;
        dx = 0;
        dy = -1;
      } else if (along === "left") {
        x = 4 + (i % 3) * 3 + wobble * 0.3;
        y = t * VIEW_H;
        dx = 1;
        dy = 0;
      } else {
        x = VIEW_W - 4 - (i % 3) * 3 - wobble * 0.3;
        y = t * VIEW_H;
        dx = -1;
        dy = 0;
      }

      const len = (10 + (i % 5) * 4 + intensity * 10) * edge;
      const spread = 3 + (i % 4);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx * len, y + dy * len);
      ctx.moveTo(x + dx * len * 0.45, y + dy * len * 0.45);
      ctx.lineTo(
        x + dx * len * 0.45 + dy * spread,
        y + dy * len * 0.45 - dx * spread,
      );
      ctx.moveTo(x + dx * len * 0.45, y + dy * len * 0.45);
      ctx.lineTo(
        x + dx * len * 0.45 - dy * spread,
        y + dy * len * 0.45 + dx * spread,
      );
      ctx.stroke();

      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(
          x + dx * 3,
          y + dy * 3,
          1.2 + intensity * 1.4,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  };

  const density = 8 + Math.floor(intensity * 10);
  drawEdgeFrost(density + 4, "top");
  drawEdgeFrost(density + 4, "bottom");
  drawEdgeFrost(density, "left");
  drawEdgeFrost(density, "right");

  // Булангийн мөсөн зураас
  ctx.globalAlpha = (0.4 + intensity * 0.5) * shimmer;
  ctx.strokeStyle = "rgba(230,245,255,0.9)";
  ctx.lineWidth = 1.4;
  const cornerLen = 28 + intensity * 36;
  const corners: Array<[number, number, number, number]> = [
    [0, 0, 1, 1],
    [VIEW_W, 0, -1, 1],
    [0, VIEW_H, 1, -1],
    [VIEW_W, VIEW_H, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + sx * cornerLen, cy);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + sy * cornerLen);
    ctx.moveTo(cx + sx * 8, cy + sy * 8);
    ctx.lineTo(cx + sx * cornerLen * 0.55, cy + sy * cornerLen * 0.55);
    ctx.stroke();
  }

  ctx.restore();
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  terrain: HTMLCanvasElement;
  terrainWinter: HTMLCanvasElement;
  lightCanvas: HTMLCanvasElement;
  vignette: HTMLCanvasElement;
}

export function makeVignette(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = VIEW_W;
  c.height = VIEW_H;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.45,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.95,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(10,10,20,0.4)");
  g.fillStyle = grad;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  return c;
}
