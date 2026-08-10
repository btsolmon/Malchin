import { Camera, CAMPFIRE_IGNITE_SEC, GameState, VIEW_H, VIEW_W, World } from "../types";
import { lerp, clamp } from "../utils";

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
function drawRainFx(
  ctx: CanvasRenderingContext2D,
  time: number,
  intensity = 1,
): void {
  const dens = clamp(intensity, 0.6, 2.4);
  // Бараан тинт
  ctx.fillStyle = `rgba(18,26,42,${0.18 * Math.min(1.4, dens)})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Салхины налуу — хөдөлгөөнтэй ижил тийш (+x = баруун тийш ташуу)
  const windX = 0.42 + dens * 0.12;
  const lenBg = 10 + dens * 2;
  const lenMid = 14 + dens * 3;
  const lenFg = 18 + dens * 4;
  const nBg = Math.floor(55 * dens);
  const nMid = Math.floor(45 * dens);
  const nFg = Math.floor(16 * dens);

  ctx.save();
  ctx.lineCap = "round";

  // Алс — олон, нимгэн, бүдэг
  ctx.strokeStyle = "rgba(160,178,200,0.18)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < nBg; i++) {
    const sx = wrap(i * 113.3 + time * 210 * dens, VIEW_W + 50) - 25;
    const sy = wrap(i * 67.9 + time * 280 * dens + i * 11, VIEW_H + 40) - 20;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + windX * lenBg, sy + lenBg);
  }
  ctx.stroke();

  // Дунд — нягт, гол визуал
  ctx.strokeStyle = "rgba(170,190,215,0.28)";
  ctx.lineWidth = 0.95;
  ctx.beginPath();
  for (let i = 0; i < nMid; i++) {
    const sx = wrap(i * 97.1 + time * 260 * dens + 40, VIEW_W + 60) - 30;
    const sy = wrap(i * 83.7 + time * 340 * dens + i * 17, VIEW_H + 50) - 25;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + windX * lenMid, sy + lenMid);
  }
  ctx.stroke();

  // Ойр — цөөн, арай илүү тод
  ctx.strokeStyle = "rgba(185,205,225,0.38)";
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  for (let i = 0; i < nFg; i++) {
    const sx = wrap(i * 151.7 + time * 320 * dens + 80, VIEW_W + 70) - 35;
    const sy = wrap(i * 101.3 + time * 400 * dens + i * 23, VIEW_H + 60) - 30;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + windX * lenFg, sy + lenFg);
  }
  ctx.stroke();

  // Газрын ойролцоо бага зэрэг цацрах (доод хэсэг, маш зөөлөн)
  ctx.fillStyle = "rgba(190,205,220,0.12)";
  for (let i = 0; i < Math.floor(10 * dens); i++) {
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

/** Нээлтийн хар хэрээ — силуэт, шуурганы зүгт ниснэ */
export function drawIntroCrows(
  ctx: CanvasRenderingContext2D,
  time: number,
  count = 7,
): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const speed = 55 + (i % 3) * 28;
    const baseY = 48 + (i * 37) % 120;
    const x = wrap(time * speed + i * 140, VIEW_W + 80) - 40;
    const y = baseY + Math.sin(time * 2.4 + i * 1.7) * 10;
    const flap = Math.sin(time * 14 + i * 2.1);
    const wing = 7 + flap * 4;
    const s = 0.75 + (i % 3) * 0.18;
    ctx.globalAlpha = 0.55 + (i % 2) * 0.2;
    ctx.fillStyle = "#0c0c10";
    ctx.beginPath();
    // Бие
    ctx.ellipse(x, y, 5.5 * s, 2.4 * s, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // Далавч
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y);
    ctx.quadraticCurveTo(x - 2 * s, y - wing * s, x + 8 * s, y - 2 * s);
    ctx.quadraticCurveTo(x + 2 * s, y + 1 * s, x - 2 * s, y);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 1 * s, y);
    ctx.quadraticCurveTo(x + 2 * s, y - wing * 0.85 * s, x + 11 * s, y + 1 * s);
    ctx.quadraticCurveTo(x + 4 * s, y + 2 * s, x + 1 * s, y);
    ctx.fill();
    // Хошуу
    ctx.beginPath();
    ctx.moveTo(x - 5.5 * s, y);
    ctx.lineTo(x - 8.5 * s, y + 1.2 * s);
    ctx.lineTo(x - 5 * s, y + 1.5 * s);
    ctx.fill();
  }
  ctx.restore();
}

export function drawWeatherFx(
  ctx: CanvasRenderingContext2D,
  world: World,
  time: number,
  intensity = 1,
): void {
  if (world.weather === "snow") {
    drawSnowFx(ctx, time);
  } else if (world.weather === "storm") {
    drawRainFx(ctx, time, intensity);
  }
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

/** Нээлт: шуламын харанхуй нүх + сүүдэр утас (дүрсгүй, илүү итгэмжтэй) */
export function drawIntroAbductionFx(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  if (state.phase !== "intro" || state.story.introSection !== 1) return;
  if (!state.parents || state.story.introParentFade <= 0.02) return;

  const fade = state.story.introParentFade;
  const lift = state.story.introParentLift;
  const father = state.parents.father;
  const mother = state.parents.mother;
  const fx = father.pos.x - cam.x;
  const fy = father.pos.y - cam.y - lift;
  const mx = mother.pos.x - cam.x;
  const my = mother.pos.y - cam.y - lift;

  // Зүүн дээд — харанхуй манан (нүх/монстр биш)
  const cx = (fx + mx) * 0.5 - 110;
  const cy = (fy + my) * 0.5 - 48;
  const pull = 1 - fade; // алга болох тусам манан хүчтэй

  ctx.save();

  // Том зөөлөн манан — шуурганы харанхуйтай нийлнэ
  for (let i = 0; i < 3; i++) {
    const ox = Math.sin(time * 0.7 + i * 1.7) * (8 + i * 4);
    const oy = Math.cos(time * 0.55 + i) * (5 + i * 2);
    const r = 90 + i * 28;
    ctx.globalAlpha = (0.18 + pull * 0.22) * fade;
    const mist = ctx.createRadialGradient(
      cx + ox,
      cy + oy,
      8,
      cx + ox,
      cy + oy,
      r,
    );
    mist.addColorStop(0, "rgba(6,4,12,0.85)");
    mist.addColorStop(0.45, "rgba(14,10,22,0.4)");
    mist.addColorStop(1, "rgba(14,10,22,0)");
    ctx.fillStyle = mist;
    ctx.beginPath();
    ctx.ellipse(cx + ox, cy + oy, r * 1.15, r * 0.72, -0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Аав ээжийг мананд уусгах — бараан толбо (утас биш)
  for (const [px, py, seed] of [
    [fx, fy, 0.4],
    [mx, my, 1.6],
  ] as const) {
    const sway = Math.sin(time * 1.8 + seed) * 4;
    ctx.globalAlpha = (0.2 + pull * 0.35) * fade;
    const shroud = ctx.createRadialGradient(
      px + sway * 0.3 - 18,
      py - 8,
      2,
      px - 10,
      py,
      34,
    );
    shroud.addColorStop(0, "rgba(8,5,14,0.75)");
    shroud.addColorStop(0.55, "rgba(12,8,20,0.28)");
    shroud.addColorStop(1, "rgba(12,8,20,0)");
    ctx.fillStyle = shroud;
    ctx.beginPath();
    ctx.ellipse(px - 8, py - 4, 28, 22, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Мананд чирэгдэж буй бүдэг утаа
    ctx.globalAlpha = (0.1 + pull * 0.2) * fade;
    ctx.fillStyle = "rgba(10,7,16,0.5)";
    for (let k = 0; k < 3; k++) {
      const u = (k + 1) / 4;
      const bx = px + (cx - px) * u + Math.sin(time * 2 + seed + k) * 6;
      const by = py + (cy - py) * u + Math.cos(time * 1.6 + seed + k) * 4;
      ctx.beginPath();
      ctx.ellipse(bx, by, 10 - k * 2, 6 - k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
