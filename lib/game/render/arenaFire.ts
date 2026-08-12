/** Аренын дүрэлзсэн галын хүрээ — улбар эсвэл хөх */

export type ArenaFirePalette = {
  core: string;
  mid: string;
  tip: string;
  glow: string;
  ground: string;
  groundEdge: string;
};

export const ORANGE_FIRE: ArenaFirePalette = {
  core: "rgba(255,250,210,",
  mid: "rgba(255,170,40,",
  tip: "rgba(255,55,10,",
  glow: "rgba(255,110,20,",
  ground: "rgba(50,10,4,",
  groundEdge: "rgba(28,6,2,",
};

export const BLUE_FIRE: ArenaFirePalette = {
  core: "rgba(240,250,255,",
  mid: "rgba(100,200,255,",
  tip: "rgba(40,100,255,",
  glow: "rgba(70,160,255,",
  ground: "rgba(4,12,40,",
  groundEdge: "rgba(2,6,22,",
};

function a(base: string, alpha: number): string {
  return `${base}${Math.max(0, Math.min(1, alpha))})`;
}

function drawFlameTongue(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  nx: number,
  ny: number,
  h: number,
  w: number,
  sway: number,
  palette: ArenaFirePalette,
  flicker: number,
): void {
  const tipX = bx + nx * (5 + h * 0.2);
  const tipY = by + ny * (5 + h * 0.2) - h;
  const midX = bx + nx * 4 + sway * 0.55;
  const midY = by + ny * 3 - h * 0.42;

  // Гадна — өргөн, тод
  ctx.fillStyle = a(palette.tip, 0.55 + flicker * 0.4);
  ctx.beginPath();
  ctx.moveTo(bx - ny * w, by + nx * w);
  ctx.quadraticCurveTo(midX - ny * w * 0.75, midY, tipX, tipY);
  ctx.quadraticCurveTo(midX + ny * w * 0.75, midY, bx + ny * w, by - nx * w);
  ctx.closePath();
  ctx.fill();

  // Дунд
  ctx.fillStyle = a(palette.mid, 0.65 + flicker * 0.32);
  ctx.beginPath();
  ctx.moveTo(bx - ny * w * 0.58, by + nx * w * 0.58);
  ctx.quadraticCurveTo(midX, midY + h * 0.04, tipX - nx * 1.2, tipY + h * 0.18);
  ctx.quadraticCurveTo(midX, midY + h * 0.04, bx + ny * w * 0.58, by - nx * w * 0.58);
  ctx.closePath();
  ctx.fill();

  // Цөм — хурц цагаан/шар
  ctx.fillStyle = a(palette.core, 0.7 + flicker * 0.28);
  ctx.beginPath();
  ctx.moveTo(bx - ny * w * 0.28, by + nx * w * 0.28);
  ctx.quadraticCurveTo(
    midX * 0.35 + bx * 0.65,
    midY + h * 0.08,
    tipX - nx * 2.5,
    tipY + h * 0.32,
  );
  ctx.quadraticCurveTo(
    midX * 0.35 + bx * 0.65,
    midY + h * 0.08,
    bx + ny * w * 0.28,
    by - nx * w * 0.28,
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Дугуй хүрээн дээр дүрэлзсэн гал.
 * heightScale: дөлний өндөр · fierce: ширүүн хөдөлгөөн.
 */
export function drawFlameArenaRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  time: number,
  palette: ArenaFirePalette,
  opts?: {
    heightScale?: number;
    fierce?: boolean;
    defeated?: boolean;
  },
): void {
  const heightScale = opts?.heightScale ?? 1;
  const fierce = opts?.fierce ?? false;
  const defeated = opts?.defeated ?? false;
  const pulse = 0.78 + Math.sin(time * (fierce ? 7 : 5)) * 0.18;
  const flameCount = fierce ? 72 : 58;
  const baseH = (fierce ? 44 : 34) * heightScale;

  ctx.save();

  // Газрын нөмрөг — илүү харанхуй / гүн
  const ground = ctx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius + 20);
  ground.addColorStop(0, a(palette.ground, defeated ? 0.22 : 0.55));
  ground.addColorStop(0.55, a(palette.groundEdge, defeated ? 0.16 : 0.38));
  ground.addColorStop(1, a(palette.groundEdge, 0));
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
  ctx.fill();

  // Өргөн гадна гэрэл
  ctx.strokeStyle = a(palette.glow, defeated ? 0.14 : 0.32 + pulse * 0.18);
  ctx.lineWidth = fierce ? 36 : 28;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.stroke();

  // Хоёр дахь гэрэл — илүү тод
  ctx.strokeStyle = a(palette.mid, defeated ? 0.1 : 0.28 + pulse * 0.15);
  ctx.lineWidth = fierce ? 14 : 11;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
  ctx.stroke();

  if (defeated) {
    ctx.strokeStyle = a(palette.mid, 0.4);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Гал — additive-иш илүү хурц
  ctx.globalCompositeOperation = "lighter";

  // Гадна давхарга — өндөр дөл
  for (let i = 0; i < flameCount; i++) {
    const ang =
      (i / flameCount) * Math.PI * 2 +
      time * (fierce ? 0.55 : 0.4) +
      Math.sin(time * 2.2 + i) * 0.04;
    const flicker =
      0.55 +
      0.45 *
        Math.sin(time * (fierce ? 18 : 14) + i * 2.1) *
        Math.sin(time * (fierce ? 11 : 8) + i * 1.3);
    const h = baseH * flicker * (0.85 + (i % 4) * 0.12);
    const w = (fierce ? 9.5 : 8) * (0.75 + flicker * 0.55);
    const bx = cx + Math.cos(ang) * radius;
    const by = cy + Math.sin(ang) * radius;
    const nx = Math.cos(ang);
    const ny = Math.sin(ang);
    const sway = Math.sin(time * (fierce ? 16 : 12) + i * 1.4) * (fierce ? 8 : 6);
    drawFlameTongue(ctx, bx, by, nx, ny, h, w, sway, palette, flicker);
  }

  // Дотор давхарга — илүү олон жижиг дөл
  const innerN = fierce ? 56 : 44;
  for (let i = 0; i < innerN; i++) {
    const ang =
      (i / innerN) * Math.PI * 2 -
      time * (fierce ? 0.7 : 0.5) +
      0.15;
    const flicker =
      0.5 +
      0.5 *
        Math.sin(time * (fierce ? 22 : 17) + i * 2.8) *
        Math.sin(time * 9 + i);
    const h = baseH * 0.55 * flicker * (0.7 + (i % 3) * 0.15);
    const w = (fierce ? 6 : 5) * (0.6 + flicker * 0.5);
    const r = radius - 3;
    const bx = cx + Math.cos(ang) * r;
    const by = cy + Math.sin(ang) * r;
    const nx = Math.cos(ang);
    const ny = Math.sin(ang);
    const sway = Math.sin(time * 20 + i * 1.7) * (fierce ? 6 : 4.5);
    drawFlameTongue(ctx, bx, by, nx, ny, h, w, sway, palette, flicker);
  }

  // Босоо оч / оч шидэлт
  const sparkN = fierce ? 42 : 32;
  for (let i = 0; i < sparkN; i++) {
    const life = (time * (fierce ? 2.4 : 1.8) + i * 0.37) % 1;
    const ang = (i / sparkN) * Math.PI * 2 * 3.7 + time * 0.8;
    const rise = life * baseH * (1.1 + (i % 3) * 0.25);
    const rr = radius + Math.sin(i * 1.7) * 6;
    const sx = cx + Math.cos(ang) * rr + Math.sin(time * 9 + i) * 3;
    const sy = cy + Math.sin(ang) * rr - rise;
    const sa = (1 - life) * (0.55 + flickerBoost(i) * 0.35);
    ctx.fillStyle = a(palette.core, sa);
    ctx.beginPath();
    ctx.arc(sx, sy, (fierce ? 2.8 : 2.2) * (1 - life * 0.5), 0, Math.PI * 2);
    ctx.fill();
    // Сүүл
    ctx.strokeStyle = a(palette.mid, sa * 0.7);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 2);
    ctx.lineTo(sx + Math.sin(i) * 2, sy + 6 + life * 4);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";

  // Үндсэн хүрээ — хурц цагираг
  ctx.strokeStyle = a(palette.mid, 0.85 + pulse * 0.15);
  ctx.lineWidth = fierce ? 5.5 : 4.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = a(palette.core, 0.65 + pulse * 0.25);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - (fierce ? 12 : 9), 0, Math.PI * 2);
  ctx.stroke();

  // Дотор эргэдэг оч цагираг
  const orbitN = fierce ? 22 : 16;
  for (let i = 0; i < orbitN; i++) {
    const ang = time * (fierce ? 2.4 : 1.6) + (i / orbitN) * Math.PI * 2;
    const rr = radius - 20 - (i % 4) * 7;
    const sx = cx + Math.cos(ang) * rr;
    const sy = cy + Math.sin(ang) * rr;
    const sa = 0.45 + Math.sin(time * 12 + i) * 0.3;
    ctx.fillStyle = a(palette.core, sa);
    ctx.beginPath();
    ctx.arc(sx, sy, fierce ? 2.6 : 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function flickerBoost(i: number): number {
  return 0.5 + (i % 5) * 0.1;
}
