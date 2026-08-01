import {
  BerryBush,
  Camera,
  Campfire,
  Dog,
  type Elder,
  type Fence,
  Player,
  Projectile,
  Sheep,
  Thief,
  Tree,
  type Vector2,
  type WorldRock,
  Wolf,
} from "../types";
import { clamp, roundRectPath } from "../utils";

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  ctx.fillStyle = "rgba(20,25,15,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawGer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  winterClosed = false,
): void {
  // Тоглоомын зөөлөн градиент хэв маягт буулгасан, жишээ зургийн элементтэй гэр:
  // хөх дээврийн хээ, улаан цагираг тооно, алтан хана мод, улаан хаалга
  const NAVY = "#3c5680";
  const NAVY_DEEP = "#2e4368";
  const RED = "#b04a32";
  const GOLD = "#c9a04e";
  const GREEN = "#5f7e46";
  const SOFT_LINE = "rgba(120,100,70,0.45)";

  drawShadow(ctx, x, y + 26, 52, 14);

  const baseY = y + 24;
  const wallTopY = y - 4;
  const peakY = y - 42;

  // ===== Ханын их бие — цагаан эсгий (зөөлөн градиент) =====
  const bodyG = ctx.createLinearGradient(x - 46, y, x + 46, y);
  bodyG.addColorStop(0, "#cfc8b8");
  bodyG.addColorStop(0.5, "#f2ecdc");
  bodyG.addColorStop(1, "#d8d0c0");
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.moveTo(x - 46, baseY);
  ctx.lineTo(x - 46, wallTopY);
  ctx.quadraticCurveTo(x, wallTopY - 8, x + 46, wallTopY);
  ctx.lineTo(x + 46, baseY);
  ctx.closePath();
  ctx.fill();

  // ===== Эсгий давхаргын зөөлөн шугамууд (3) =====
  ctx.strokeStyle = SOFT_LINE;
  ctx.lineWidth = 1.5;
  for (const oy of [5, 12, 19]) {
    ctx.beginPath();
    ctx.moveTo(x - 45, y + oy);
    ctx.quadraticCurveTo(x, y + oy - 4, x + 45, y + oy);
    ctx.stroke();
  }

  // ===== Зүүн доод — зун эсгий сөхөгдөж алтан хана мод харагдана,
  // өвөлд хаяа битүү шуугддаг =====
  if (!winterClosed) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - 46, y + 6);
    ctx.lineTo(x - 46, baseY);
    ctx.lineTo(x - 14, baseY);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = "#4a3c28";
    ctx.fillRect(x - 46, y + 4, 34, 22);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.7;
    ctx.lineCap = "round";
    for (let i = -3; i < 7; i++) {
      const ox = x - 46 + i * 6;
      ctx.beginPath();
      ctx.moveTo(ox, y + 4);
      ctx.lineTo(ox + 22, baseY + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox + 22, y + 4);
      ctx.lineTo(ox, baseY + 2);
      ctx.stroke();
    }
    ctx.restore();

    // Сөхөгдсөн эсгийн зөөлөн давхарга
    ctx.fillStyle = "#ece5d2";
    ctx.beginPath();
    ctx.moveTo(x - 46, y + 3);
    ctx.quadraticCurveTo(x - 30, y + 8, x - 18, y + 18);
    ctx.quadraticCurveTo(x - 15, y + 20, x - 13, baseY);
    ctx.lineTo(x - 19, baseY);
    ctx.quadraticCurveTo(x - 28, y + 15, x - 38, y + 9);
    ctx.quadraticCurveTo(x - 42, y + 7, x - 46, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = SOFT_LINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else {
    // Өвөл — хаяа битүү: суурийг тойрсон зузаан эсгий хормой
    ctx.fillStyle = "#e6dfcc";
    ctx.beginPath();
    ctx.moveTo(x - 46, baseY - 6);
    ctx.quadraticCurveTo(x, baseY - 9, x + 46, baseY - 6);
    ctx.lineTo(x + 46, baseY);
    ctx.lineTo(x - 46, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = SOFT_LINE;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 46, baseY - 6);
    ctx.quadraticCurveTo(x, baseY - 9, x + 46, baseY - 6);
    ctx.stroke();
    // Хормойг дарсан цасны намуухан хунгар
    ctx.fillStyle = "rgba(244,246,250,0.7)";
    ctx.beginPath();
    ctx.ellipse(x - 30, baseY + 1, 15, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 26, baseY + 1, 18, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ===== Дээвэр — цагаан эсгий конус (зөөлөн градиент) =====
  const roofG = ctx.createLinearGradient(x, peakY, x, wallTopY);
  roofG.addColorStop(0, "#f8f2e2");
  roofG.addColorStop(1, "#d0c8b4");
  ctx.fillStyle = roofG;
  ctx.beginPath();
  ctx.moveTo(x - 50, wallTopY + 1);
  ctx.quadraticCurveTo(x - 18, peakY + 4, x - 6, peakY);
  ctx.lineTo(x + 6, peakY);
  ctx.quadraticCurveTo(x + 18, peakY + 4, x + 50, wallTopY + 1);
  ctx.quadraticCurveTo(x, wallTopY - 9, x - 50, wallTopY + 1);
  ctx.closePath();
  ctx.fill();

  // ===== Дээвэр/хананы зааг — намуухан хөх тууз =====
  ctx.strokeStyle = "rgba(60,86,128,0.85)";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 47, wallTopY + 1);
  ctx.quadraticCurveTo(x, wallTopY - 7, x + 47, wallTopY + 1);
  ctx.stroke();

  // ===== Дээврийн хөх хээ — оройг бүрхэж, доод ирмэг нь дэгээт =====
  {
    const motifG = ctx.createLinearGradient(x, peakY, x, y - 8);
    motifG.addColorStop(0, NAVY);
    motifG.addColorStop(1, NAVY_DEEP);
    ctx.fillStyle = motifG;
    ctx.beginPath();
    // Зүүн налуу дагаж дээшээ
    ctx.moveTo(x - 30, y - 18);
    ctx.quadraticCurveTo(x - 15, peakY + 3, x - 6, peakY);
    ctx.lineTo(x + 6, peakY);
    ctx.quadraticCurveTo(x + 15, peakY + 3, x + 30, y - 18);
    // Баруун дэгээ — доош бөхийж мушгирна
    ctx.quadraticCurveTo(x + 32, y - 12, x + 25, y - 11);
    ctx.quadraticCurveTo(x + 19, y - 11, x + 18, y - 16);
    // Дотогшоо залгиур сүүл рүү
    ctx.quadraticCurveTo(x + 13, y - 21, x + 8, y - 18);
    ctx.quadraticCurveTo(x + 3, y - 14, x, y - 7);
    ctx.quadraticCurveTo(x - 3, y - 14, x - 8, y - 18);
    ctx.quadraticCurveTo(x - 13, y - 21, x - 18, y - 16);
    ctx.quadraticCurveTo(x - 19, y - 11, x - 25, y - 11);
    ctx.quadraticCurveTo(x - 32, y - 12, x - 30, y - 18);
    ctx.closePath();
    ctx.fill();

    // Дэгээний мушгиа толгойнууд
    ctx.beginPath();
    ctx.arc(x - 24, y - 12, 3.4, 0, Math.PI * 2);
    ctx.arc(x + 24, y - 12, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e9e2cf";
    ctx.beginPath();
    ctx.arc(x - 23, y - 13, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 23, y - 13, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Хээний доторх цайвар завсарууд — хээ амьсгалтай харагдана
    ctx.fillStyle = "rgba(240,234,218,0.85)";
    ctx.beginPath();
    ctx.ellipse(x - 13, peakY + 9, 5.5, 3, -0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 13, peakY + 9, 5.5, 3, 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  // ===== Тооно — улаан цагираг, хөх дотор, хигээстэй =====
  const toonoY = peakY - 1;
  ctx.fillStyle = NAVY_DEEP;
  ctx.beginPath();
  ctx.ellipse(x, toonoY, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(40,35,30,0.55)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, toonoY);
    ctx.lineTo(x + Math.cos(a) * 8, toonoY + Math.sin(a) * 4.3);
    ctx.stroke();
  }
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(x, toonoY, 9, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#3a332c";
  ctx.beginPath();
  ctx.ellipse(x, toonoY, 2.2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ===== Яндан — босоо хоолой (зөөлөн бараан) =====
  ctx.fillStyle = "#3a3632";
  ctx.fillRect(x - 2, toonoY - 16, 4, 14);
  ctx.fillStyle = "rgba(255,250,235,0.25)";
  ctx.fillRect(x - 2, toonoY - 16, 1.3, 14);

  // ===== Хаалга — улаан хүрээ, алтан дотор, ногоон самбар =====
  {
    const dw = 22;
    const dh = 23;
    const dx = x - dw / 2;
    const dy = y + 2;
    ctx.fillStyle = RED;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeStyle = "rgba(90,40,24,0.7)";
    ctx.lineWidth = 1.3;
    ctx.strokeRect(dx, dy, dw, dh);
    // Алтан дотор самбар
    const ix = dx + 3;
    const iy = dy + 2.5;
    const iw = dw - 6;
    const ih = dh - 5;
    ctx.fillStyle = GOLD;
    ctx.fillRect(ix, iy, iw, ih);
    // Хоёр эгнээ × гурван ногоон босоо самбар
    const slotW = (iw - 7) / 3;
    const slotH = ih / 2 - 3.4;
    for (let row = 0; row < 2; row++) {
      const sy = iy + 1.8 + row * (ih / 2);
      for (let col = 0; col < 3; col++) {
        const sx = ix + 1.8 + col * (slotW + 1.7);
        ctx.fillStyle = GREEN;
        ctx.fillRect(sx, sy, slotW, slotH);
        ctx.strokeStyle = "rgba(60,50,30,0.5)";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(sx, sy, slotW, slotH);
      }
    }
    // Дунд хөндлөн улаан хуваалт
    ctx.fillStyle = RED;
    ctx.fillRect(ix, iy + ih / 2 - 1, iw, 2);
  }
}

export function drawTree(
  ctx: CanvasRenderingContext2D,
  tree: Tree,
  cam: Camera,
  time: number,
  windAmp: number,
): void {
  const x = tree.pos.x - cam.x;
  const y = tree.pos.y - cam.y;

  if (tree.hp <= 0) {
    drawShadow(ctx, x, y + 4, 11, 5);
    ctx.fillStyle = "#4a3828";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a5238";
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (tree.riddleHost && !tree.riddleSolved) {
      drawRiddleGlow(ctx, x, y - 6, time, tree.id);
    }
    return;
  }

  const sway = Math.sin(time * 1.6 + tree.id * 1.7) * windAmp;
  drawShadow(ctx, x + 4, y + 6, 18, 7);

  // Иш
  ctx.fillStyle = "#5c3d22";
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 8);
  ctx.quadraticCurveTo(x - 2 + sway * 0.3, y - 8, x - 1.5 + sway * 0.5, y - 16);
  ctx.lineTo(x + 1.5 + sway * 0.5, y - 16);
  ctx.quadraticCurveTo(x + 2 + sway * 0.3, y - 8, x + 4, y + 8);
  ctx.closePath();
  ctx.fill();

  // Навчис — давхарласан
  const cx = x + sway;
  const layers: Array<[number, number, number, string]> = [
    [0, -20, 17, "#2a6332"],
    [-11, -13, 12, "#2f7a3a"],
    [11, -13, 12, "#2f7a3a"],
    [0, -28, 12, "#3d8f48"],
    [-5, -21, 8, "#4aa356"],
  ];
  for (const [ox, oy, r, c] of layers) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(cx + ox, y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (tree.hp < tree.maxHp) {
    const bw = 26;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - 46, bw, 5, 2);
    ctx.fill();
    ctx.fillStyle = "#6fcf6f";
    roundRectPath(ctx, x - bw / 2, y - 46, (bw * tree.hp) / tree.maxHp, 5, 2);
    ctx.fill();
  }

  if (tree.riddleHost && !tree.riddleSolved) {
    drawRiddleGlow(ctx, x, y - 18, time, tree.id);
  }
}

export function drawBerryBush(
  ctx: CanvasRenderingContext2D,
  bush: BerryBush,
  cam: Camera,
  time = 0,
): void {
  const x = bush.pos.x - cam.x;
  const y = bush.pos.y - cam.y;

  drawShadow(ctx, x, y + 6, 16, 6);

  const alive = bush.berries > 0;
  const clumps: Array<[number, number, number]> = [
    [0, 0, 13],
    [-9, -5, 9],
    [8, -4, 8],
    [0, -8, 8],
  ];
  for (const [ox, oy, r] of clumps) {
    const g = ctx.createRadialGradient(
      x + ox - 2,
      y + oy - 3,
      1,
      x + ox,
      y + oy,
      r,
    );
    g.addColorStop(0, alive ? "#3f7a38" : "#485842");
    g.addColorStop(1, alive ? "#274d22" : "#37452f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (alive) {
    const n = Math.min(bush.berries, 5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.5;
      const bx = x + Math.cos(a) * 7;
      const by = y - 4 + Math.sin(a) * 5;
      ctx.fillStyle = "#c42a5a";
      ctx.beginPath();
      ctx.arc(bx, by, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(bx - 0.8, by - 0.8, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (bush.riddleHost && !bush.riddleSolved) {
    drawRiddleGlow(ctx, x, y - 10, time, bush.id);
  }
}

export function drawCampfire(
  ctx: CanvasRenderingContext2D,
  fire: Campfire,
  cam: Camera,
  time: number,
): void {
  const x = fire.pos.x - cam.x;
  const y = fire.pos.y - cam.y;

  drawShadow(ctx, x, y + 6, 17, 7);

  // Чулуун хүрээ
  ctx.fillStyle = "#6a6558";
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 15, y + Math.sin(a) * 7 + 3, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Түлээний гуалин
  ctx.strokeStyle = "#5a3a20";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 4);
  ctx.lineTo(x + 9, y - 2);
  ctx.moveTo(x - 9, y - 2);
  ctx.lineTo(x + 9, y + 4);
  ctx.stroke();

  if (fire.lit) {
    const f1 = 1 + Math.sin(time * 11) * 0.15;
    const f2 = 1 + Math.sin(time * 17 + 2) * 0.2;

    // Гадна дөл
    const outer = ctx.createLinearGradient(x, y - 26 * f1, x, y + 2);
    outer.addColorStop(0, "rgba(255,120,30,0.15)");
    outer.addColorStop(0.4, "#ff8c2a");
    outer.addColorStop(1, "#d84a10");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(x, y - 26 * f1);
    ctx.quadraticCurveTo(x + 11, y - 8, x + 8, y + 2);
    ctx.lineTo(x - 8, y + 2);
    ctx.quadraticCurveTo(x - 11, y - 8, x, y - 26 * f1);
    ctx.fill();

    // Дотор дөл
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.moveTo(x, y - 14 * f2);
    ctx.quadraticCurveTo(x + 5, y - 4, x + 4, y + 1);
    ctx.lineTo(x - 4, y + 1);
    ctx.quadraticCurveTo(x - 5, y - 4, x, y - 14 * f2);
    ctx.fill();

    // Газрын гэрэлт толбо
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 42);
    glow.addColorStop(0, "rgba(255,150,50,0.28)");
    glow.addColorStop(1, "rgba(255,150,50,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 42, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFence(
  ctx: CanvasRenderingContext2D,
  fence: Fence,
  cam: Camera,
  time: number,
): void {
  const x = fence.pos.x - cam.x;
  const y = fence.pos.y - cam.y;
  const ns = fence.orient === 1;
  const tier = fence.tier ?? 1;
  const open = fence.isGate ? fence.gateOpen : 0;

  ctx.save();
  ctx.translate(x, y);
  if (ns) ctx.rotate(Math.PI / 2);
  drawShadow(ctx, 0, 5, 18, 5);

  if (tier === 1) {
    drawFenceWoodEW(ctx, 0, 0, fence.isGate, open);
  } else if (tier === 2) {
    drawFenceBarbedEW(ctx, 0, 0, fence.isGate, open);
  } else {
    drawFenceElectricEW(ctx, 0, 0, time, fence.id, fence.isGate, open);
  }

  ctx.restore();

  if (fence.hp < fence.maxHp) {
    const bw = 22;
    const ratio = clamp(fence.hp / fence.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - 30, bw, 4, 2);
    ctx.fill();
    const barColor =
      tier === 3 ? "#7ec8ff" : tier === 2 ? "#a8a8a8" : "#c49a6c";
    ctx.fillStyle = ratio > 0.35 ? barColor : "#d64545";
    roundRectPath(ctx, x - bw / 2, y - 30, bw * ratio, 4, 2);
    ctx.fill();
  }
}

/** Модон хашааны цагаан тунгалаг ghost (preview) */
export function drawFenceGhost(
  ctx: CanvasRenderingContext2D,
  pos: Vector2,
  orient: 0 | 1,
  cam: Camera,
): void {
  const x = pos.x - cam.x;
  const y = pos.y - cam.y;
  const ns = orient === 1;

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.translate(x, y);
  if (ns) ctx.rotate(Math.PI / 2);

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  roundRectPath(ctx, -15, -3, 30, 9, 3);
  ctx.fill();

  const post = (px: number, py: number): void => {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(px - 2.2, py - 18, 4.4, 20);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(px - 1.6, py - 17, 2.2, 18);
  };

  post(-12, 0);
  post(12, 0);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-11, -14);
  ctx.lineTo(11, -14);
  ctx.moveTo(-11, -7);
  ctx.lineTo(11, -7);
  ctx.stroke();

  ctx.restore();
}

function drawWoodPost(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
): void {
  ctx.fillStyle = "#5a3a1e";
  ctx.fillRect(px - 2.2, py - 18, 4.4, 20);
  ctx.fillStyle = "#7a5230";
  ctx.fillRect(px - 1.6, py - 17, 2.2, 18);
  ctx.fillStyle = "#3d2814";
  ctx.beginPath();
  ctx.moveTo(px - 2.6, py - 18);
  ctx.lineTo(px, py - 22);
  ctx.lineTo(px + 2.6, py - 18);
  ctx.closePath();
  ctx.fill();
}

/** Ижил модон төмөр — урт (урд) */
function drawWoodRails(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  py: number,
): void {
  ctx.strokeStyle = "#6b4524";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, py - 14);
  ctx.lineTo(x1, py - 14);
  ctx.moveTo(x0, py - 7);
  ctx.lineTo(x1, py - 7);
  ctx.stroke();
  ctx.strokeStyle = "#8a6238";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0, py - 15);
  ctx.lineTo(x1, py - 15);
  ctx.moveTo(x0, py - 8);
  ctx.lineTo(x1, py - 8);
  ctx.stroke();
}

/** Хаалганы хавтан — hinge-ээс эргэнэ (open 0..1) */
function drawGateSwing(
  ctx: CanvasRenderingContext2D,
  drawPanel: (ctx: CanvasRenderingContext2D) => void,
  open: number,
): void {
  const hingeX = -11;
  ctx.save();
  ctx.translate(hingeX, 0);
  ctx.rotate(-open * (Math.PI / 2) * 0.92);
  ctx.translate(-hingeX, 0);
  drawPanel(ctx);
  ctx.restore();
}

function drawFenceWoodEW(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isGate: boolean,
  open: number,
): void {
  drawWoodPost(ctx, x - 12, y);
  drawWoodPost(ctx, x + 12, y);
  if (isGate) {
    drawGateSwing(ctx, (c) => {
      drawWoodRails(c, x - 11, x + 11, y);
      // Хаалганы босоо бариул
      c.strokeStyle = "#5a3a1e";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + 2, y - 16);
      c.lineTo(x + 2, y - 2);
      c.stroke();
    }, open);
  } else {
    drawWoodRails(ctx, x - 11, x + 11, y);
  }
}

/** Дунд шат — өргөстэй төмөр тор */
function drawBarbedPost(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
): void {
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(px - 2, py - 19, 4, 21);
  ctx.fillStyle = "#6a6a6a";
  ctx.fillRect(px - 1.4, py - 18, 2, 19);
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(px - 2.4, py - 20, 4.8, 3);
}

function drawBarbedPanel(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  py: number,
): void {
  const mid = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  ctx.strokeStyle = "#8a8a8a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x0, py - 15);
  ctx.lineTo(x1, py - 15);
  ctx.moveTo(x0, py - 9);
  ctx.lineTo(x1, py - 9);
  ctx.moveTo(x0, py - 3);
  ctx.lineTo(x1, py - 3);
  ctx.stroke();
  ctx.strokeStyle = "#b0b0b0";
  ctx.lineWidth = 1;
  const step = half > 8 ? 4 : 5;
  for (let i = -half + 2; i <= half - 2; i += step) {
    ctx.beginPath();
    ctx.moveTo(mid + i - 2, py - 16);
    ctx.lineTo(mid + i + 2, py - 2);
    ctx.moveTo(mid + i + 2, py - 16);
    ctx.lineTo(mid + i - 2, py - 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#d0d0d0";
  const barbStep = half > 8 ? 5 : 4;
  for (let i = -half + 1; i <= half - 1; i += barbStep) {
    for (const hy of [-15, -9, -3]) {
      ctx.beginPath();
      ctx.arc(mid + i, py + hy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFenceBarbedEW(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isGate: boolean,
  open: number,
): void {
  drawBarbedPost(ctx, x - 12, y);
  drawBarbedPost(ctx, x + 12, y);
  if (isGate) {
    drawGateSwing(ctx, (c) => drawBarbedPanel(c, x - 11, x + 11, y), open);
  } else {
    drawBarbedPanel(ctx, x - 11, x + 11, y);
  }
}

/** Дээд шат — чулуун суурь + цахилгаан утас */
function drawFenceElectricEW(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  id: number,
  isGate: boolean,
  open: number,
): void {
  const pulse = 0.55 + 0.45 * Math.sin(time * 8 + id);

  const drawStones = (sx: number, sy: number, sw: number, sh: number): void => {
    ctx.fillStyle = "#5a6570";
    ctx.fillRect(sx, sy - 6, sw, sh);
    ctx.fillStyle = "#7a8894";
    ctx.fillRect(sx + 1, sy - 5, sw - 3, sh - 3);
    ctx.fillStyle = "#3a4550";
    ctx.fillRect(sx, sy - 6 + sh - 2, sw, 2);
  };

  for (const [sx, sy, sw, sh] of [
    [-11, -2, 10, 8],
    [-1, -3, 11, 9],
    [8, -1, 8, 7],
  ] as const) {
    drawStones(x + sx, y + sy, sw, sh);
  }

  const drawWires = (c: CanvasRenderingContext2D): void => {
    c.strokeStyle = `rgba(120, 210, 255, ${0.55 + pulse * 0.35})`;
    c.lineWidth = 1.8;
    c.shadowColor = "#6ad0ff";
    c.shadowBlur = 4 + pulse * 4;
    c.beginPath();
    c.moveTo(x - 12, y - 16);
    c.lineTo(x + 12, y - 16);
    c.moveTo(x - 12, y - 10);
    c.lineTo(x + 12, y - 10);
    c.stroke();
    c.shadowBlur = 0;
  };

  if (isGate) {
    drawGateSwing(ctx, drawWires, open);
  } else {
    drawWires(ctx);
  }

  if (pulse > 0.85 && open < 0.5) {
    const sx = x + Math.sin(time * 12 + id) * 8;
    const sy = y - 13;
    ctx.fillStyle = "#e8f8ff";
    ctx.beginPath();
    ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(160,230,255,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy);
    ctx.lineTo(sx + 3, sy);
    ctx.moveTo(sx, sy - 3);
    ctx.lineTo(sx, sy + 3);
    ctx.stroke();
  }
}

export function drawSheep(
  ctx: CanvasRenderingContext2D,
  sheep: Sheep,
  cam: Camera,
  time: number,
): void {
  const x = sheep.pos.x - cam.x;
  const y = sheep.pos.y - cam.y;
  const flip = sheep.face;
  const moving = Math.hypot(sheep.vel.x, sheep.vel.y) > 6;
  const walk = moving ? Math.sin(time * 10 + sheep.id) * 2 : 0;
  const graze =
    !moving && Math.sin(time * 0.6 + sheep.grazeSeed) > 0.4 ? 3.5 : 0;
  const kind = sheep.kind ?? "sheep";

  // Сүүдэр/анивчилтын хэмжээ — төрлөөр
  let rx = 11;
  let ry = 8;
  if (kind === "goat") {
    rx = 9;
    ry = 7;
  } else if (kind === "cattle") {
    rx = 14;
    ry = 10;
  } else if (kind === "horse") {
    rx = 13;
    ry = 9;
  } else if (kind === "camel") {
    rx = 15;
    ry = 12;
  }

  drawShadow(ctx, x, y + 8, rx, 4);

  if (kind === "goat") {
    drawGoatBody(ctx, x, y, flip, walk, graze);
  } else if (kind === "cattle") {
    drawCattleBody(ctx, x, y, flip, walk, graze, time, sheep.id);
  } else if (kind === "horse") {
    drawHerdHorseBody(ctx, x, y, flip, walk, graze);
  } else if (kind === "camel") {
    drawCamelBody(ctx, x, y, flip, walk, graze);
  } else {
    drawSheepBody(ctx, x, y, flip, walk, graze);
  }

  if (sheep.flash > 0) {
    ctx.fillStyle = `rgba(255,90,90,${Math.min(1, sheep.flash * 4)})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 1, rx + 2, ry + 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (sheep.hp < 3) {
    const bw = 18;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - 18, bw, 3.5, 1.5);
    ctx.fill();
    ctx.fillStyle = "#8fd08f";
    roundRectPath(ctx, x - bw / 2, y - 18, (bw * sheep.hp) / 3, 3.5, 1.5);
    ctx.fill();
  }

  // Бүтээгдэхүүн бэлэн — анивчсан цэг
  if (sheep.produceReady) {
    const pulse = 0.55 + Math.sin(time * 6 + sheep.id) * 0.35;
    ctx.fillStyle = `rgba(255,220,100,${pulse})`;
    ctx.beginPath();
    ctx.arc(x, y - ry - 10, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8d0";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("E", x, y - ry - 7);
    ctx.textAlign = "left";
  }

  // Залуу төллөлт — дулааны зурвас
  if (sheep.newborn) {
    const bw = 14;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - ry - 16, bw, 3, 1);
    ctx.fill();
    ctx.fillStyle =
      sheep.newbornWarmth < 35 ? "#ff6a4a" : "#7ec8ff";
    roundRectPath(
      ctx,
      x - bw / 2,
      y - ry - 16,
      (bw * sheep.newbornWarmth) / 100,
      3,
      1,
    );
    ctx.fill();
  }
}

/** Хонь — ноосон бөөрөнхий бие */
function drawSheepBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flip: 1 | -1,
  walk: number,
  graze: number,
): void {
  // Хөл
  ctx.strokeStyle = "#8a7f70";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 3);
  ctx.lineTo(x - 6 + walk * 0.4, y + 9);
  ctx.moveTo(x + 5, y + 3);
  ctx.lineTo(x + 5 - walk * 0.4, y + 9);
  ctx.stroke();

  const wool = ctx.createRadialGradient(x - 3, y - 4, 2, x, y, 13);
  wool.addColorStop(0, "#fbf7ee");
  wool.addColorStop(1, "#ddd4c4");
  ctx.fillStyle = wool;
  ctx.beginPath();
  ctx.ellipse(x, y, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [ox, oy, r] of [
    [-7, -4, 4.5],
    [-1, -6, 5],
    [5, -4, 4.5],
  ] as Array<[number, number, number]>) {
    ctx.beginPath();
    ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Толгой
  const hx = x + 9 * flip;
  const hy = y - 1 + graze;
  ctx.fillStyle = "#c9bfae";
  ctx.beginPath();
  ctx.ellipse(hx, hy, 5, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Унжсан чих
  ctx.fillStyle = "#b0a692";
  ctx.beginPath();
  ctx.ellipse(hx - 3 * flip, hy + 1, 2.2, 1.3, flip * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#332a20";
  ctx.beginPath();
  ctx.arc(hx + 1.8 * flip, hy - 1, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

/** Ямаа — туранхай бие, хойш матийсан эвэр, сахал */
function drawGoatBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flip: 1 | -1,
  walk: number,
  graze: number,
): void {
  // Хөл — нарийхан
  ctx.strokeStyle = "#7a705e";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 3);
  ctx.lineTo(x - 5 + walk * 0.4, y + 9);
  ctx.moveTo(x + 4, y + 3);
  ctx.lineTo(x + 4 - walk * 0.4, y + 9);
  ctx.stroke();

  // Богино дээш соотойсон сүүл
  ctx.strokeStyle = "#9a8c72";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 8 * flip, y - 3);
  ctx.lineTo(x - 11 * flip, y - 8);
  ctx.stroke();

  // Бие — гөлгөр туранхай
  const g = ctx.createLinearGradient(x, y - 7, x, y + 6);
  g.addColorStop(0, "#ece4d2");
  g.addColorStop(1, "#b0a084");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, 9, 6.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Толгой — өндөр өргөгдсөн
  const hx = x + 8.5 * flip;
  const hy = y - 6.5 + graze;
  // Хүзүү
  ctx.strokeStyle = "#c8bca2";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 5 * flip, y - 2);
  ctx.lineTo(hx, hy + 1);
  ctx.stroke();
  ctx.fillStyle = "#c8bca2";
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.6, 3.6, flip * 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Хойш матийсан эвэр
  ctx.strokeStyle = "#6a5a40";
  ctx.lineWidth = 1.7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx - 0.5 * flip, hy - 3);
  ctx.quadraticCurveTo(hx - 4 * flip, hy - 9, hx - 8 * flip, hy - 8);
  ctx.moveTo(hx + 1.5 * flip, hy - 3.2);
  ctx.quadraticCurveTo(hx - 2 * flip, hy - 8.5, hx - 5.5 * flip, hy - 8.5);
  ctx.stroke();
  // Сахал
  ctx.strokeStyle = "#b0a488";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hx + 2.5 * flip, hy + 3);
  ctx.lineTo(hx + 3 * flip, hy + 6.5);
  ctx.stroke();
  // Соотон чих
  ctx.fillStyle = "#a89878";
  ctx.beginPath();
  ctx.ellipse(hx - 3.5 * flip, hy - 1, 2.4, 1.2, flip * -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Нүд
  ctx.fillStyle = "#2a2418";
  ctx.beginPath();
  ctx.arc(hx + 1.6 * flip, hy - 0.8, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

/** Үхэр — том толботой бие, дэлүү эвэр, өргөн хоншоор */
function drawCattleBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flip: 1 | -1,
  walk: number,
  graze: number,
  time: number,
  id: number,
): void {
  // Дөрвөн бүдүүн хөл
  ctx.strokeStyle = "#3a2a18";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 4);
  ctx.lineTo(x - 9 + walk * 0.5, y + 11);
  ctx.moveTo(x - 4, y + 5);
  ctx.lineTo(x - 4 - walk * 0.5, y + 11);
  ctx.moveTo(x + 4, y + 5);
  ctx.lineTo(x + 4 + walk * 0.5, y + 11);
  ctx.moveTo(x + 9, y + 4);
  ctx.lineTo(x + 9 - walk * 0.5, y + 11);
  ctx.stroke();

  // Сүүл — үзүүртээ багц үстэй
  ctx.strokeStyle = "#4a3424";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - 13 * flip, y - 3);
  ctx.quadraticCurveTo(
    x - 17 * flip,
    y + 2 + Math.sin(time * 3 + id) * 1.5,
    x - 16 * flip,
    y + 8,
  );
  ctx.stroke();
  ctx.fillStyle = "#2a1c10";
  ctx.beginPath();
  ctx.ellipse(x - 16 * flip, y + 9, 1.8, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Бие — хүрэн, цагаан толботой
  const g = ctx.createLinearGradient(x, y - 9, x, y + 7);
  g.addColorStop(0, "#8a5c38");
  g.addColorStop(1, "#5a3a22");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 14, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8dcc8";
  ctx.beginPath();
  ctx.ellipse(x - 5, y - 3.5, 4.5, 3.2, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 3, 3.6, 2.6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Толгой — өргөн, доошоо хоншоортой
  const hx = x + 13 * flip;
  const hy = y - 3 + graze;
  ctx.fillStyle = "#6a4628";
  ctx.beginPath();
  ctx.ellipse(hx, hy, 5.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Цайвар хоншоор
  ctx.fillStyle = "#d8c4a8";
  ctx.beginPath();
  ctx.ellipse(hx + 1.5 * flip, hy + 3, 4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Хамрын нүх
  ctx.fillStyle = "#4a3220";
  ctx.beginPath();
  ctx.arc(hx + 3 * flip, hy + 3, 0.7, 0, Math.PI * 2);
  ctx.arc(hx + 0.5 * flip, hy + 3.4, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Хажуу тийш соотон чих
  ctx.fillStyle = "#5a3a22";
  ctx.beginPath();
  ctx.ellipse(hx - 5 * flip, hy - 2, 2.8, 1.5, flip * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Дээш матийсан эвэр
  ctx.strokeStyle = "#e0d4bc";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx - 2 * flip, hy - 4.5);
  ctx.quadraticCurveTo(hx - 5 * flip, hy - 8, hx - 3 * flip, hy - 10.5);
  ctx.moveTo(hx + 2.5 * flip, hy - 4.5);
  ctx.quadraticCurveTo(hx + 5.5 * flip, hy - 8, hx + 4 * flip, hy - 10.5);
  ctx.stroke();
  // Нүд
  ctx.fillStyle = "#1e150c";
  ctx.beginPath();
  ctx.arc(hx + 1.8 * flip, hy - 1.5, 1, 0, Math.PI * 2);
  ctx.fill();
}

/** Сүргийн морь — урт хүзүү, дэл, урт сүүл (уналгын морьтой ижил төрх) */
function drawHerdHorseBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flip: 1 | -1,
  walk: number,
  graze: number,
): void {
  // Дөрвөн хөл
  ctx.strokeStyle = "#3a2a18";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 3);
  ctx.lineTo(x - 9 + walk * 0.7, y + 11);
  ctx.moveTo(x - 4, y + 4);
  ctx.lineTo(x - 4 - walk * 0.7, y + 11);
  ctx.moveTo(x + 4, y + 4);
  ctx.lineTo(x + 4 + walk * 0.7, y + 11);
  ctx.moveTo(x + 9, y + 3);
  ctx.lineTo(x + 9 - walk * 0.7, y + 11);
  ctx.stroke();

  // Урт сүүл
  ctx.strokeStyle = "#241808";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(x - 12 * flip, y - 2);
  ctx.quadraticCurveTo(x - 17 * flip, y + 3, x - 15 * flip, y + 10);
  ctx.stroke();

  // Бие
  const g = ctx.createLinearGradient(x, y - 8, x, y + 5);
  g.addColorStop(0, "#6b4a26");
  g.addColorStop(1, "#4a3016");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Хүзүү ба толгой — өндөр
  const drop = graze * 1.2;
  ctx.fillStyle = "#5d3f1f";
  ctx.beginPath();
  ctx.moveTo(x + 7 * flip, y - 4);
  ctx.lineTo(x + 15 * flip, y - 12 + drop);
  ctx.lineTo(x + 18 * flip, y - 9 + drop);
  ctx.lineTo(x + 11 * flip, y - 1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    x + 17.5 * flip,
    y - 11.5 + drop,
    4.8,
    3,
    flip * -0.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Дэл
  ctx.strokeStyle = "#241808";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x + 8 * flip, y - 5);
  ctx.lineTo(x + 15 * flip, y - 13 + drop);
  ctx.stroke();

  // Нүд
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(x + 18.5 * flip, y - 12.5 + drop, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

/** Тэмээ — хоёр бөх, урт хүзүү, өндөр хөл */
function drawCamelBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flip: 1 | -1,
  walk: number,
  graze: number,
): void {
  // Урт хөл
  ctx.strokeStyle = "#7a5c34";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 3);
  ctx.lineTo(x - 8 + walk * 0.6, y + 12);
  ctx.moveTo(x - 3, y + 4);
  ctx.lineTo(x - 3 - walk * 0.6, y + 12);
  ctx.moveTo(x + 4, y + 4);
  ctx.lineTo(x + 4 + walk * 0.6, y + 12);
  ctx.moveTo(x + 8, y + 3);
  ctx.lineTo(x + 8 - walk * 0.6, y + 12);
  ctx.stroke();

  // Богино сүүл
  ctx.strokeStyle = "#8a6840";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - 12 * flip, y - 3);
  ctx.quadraticCurveTo(x - 15 * flip, y, x - 14 * flip, y + 5);
  ctx.stroke();

  // Бие
  const g = ctx.createLinearGradient(x, y - 8, x, y + 6);
  g.addColorStop(0, "#c8a468");
  g.addColorStop(1, "#8a6840");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 13, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Хоёр бөх
  ctx.fillStyle = "#b08c50";
  ctx.beginPath();
  ctx.ellipse(x - 6 * flip, y - 9, 4.6, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 2 * flip, y - 9.5, 4.6, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Бөхний үсэрхэг орой
  ctx.fillStyle = "#7a5830";
  ctx.beginPath();
  ctx.ellipse(x - 6 * flip, y - 12, 3, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 2 * flip, y - 12.6, 3, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Урт муруй хүзүү — урагш дээш
  const drop = graze * 1.4;
  ctx.strokeStyle = "#b08c50";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 9 * flip, y - 2);
  ctx.quadraticCurveTo(
    x + 15 * flip,
    y - 6,
    x + 15.5 * flip,
    y - 13 + drop,
  );
  ctx.stroke();

  // Толгой — унжуу хоншоортой
  const hx = x + 16.5 * flip;
  const hy = y - 14.5 + drop;
  ctx.fillStyle = "#b08c50";
  ctx.beginPath();
  ctx.ellipse(hx, hy, 4.4, 2.8, flip * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#967444";
  ctx.beginPath();
  ctx.ellipse(hx + 3.4 * flip, hy + 1, 2.2, 1.6, flip * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Жижиг чих
  ctx.fillStyle = "#7a5830";
  ctx.beginPath();
  ctx.ellipse(hx - 3 * flip, hy - 2, 1.4, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Нүд
  ctx.fillStyle = "#221808";
  ctx.beginPath();
  ctx.arc(hx + 1 * flip, hy - 0.8, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFeeder(
  ctx: CanvasRenderingContext2D,
  feeder: { pos: { x: number; y: number }; hay: number; maxHay: number },
  cam: Camera,
): void {
  const x = feeder.pos.x - cam.x;
  const y = feeder.pos.y - cam.y;
  const fill = feeder.hay / Math.max(1, feeder.maxHay);

  drawShadow(ctx, x, y + 6, 22, 7);
  // Тевш
  ctx.fillStyle = "#6a4a28";
  ctx.beginPath();
  ctx.moveTo(x - 22, y - 4);
  ctx.lineTo(x - 18, y + 8);
  ctx.lineTo(x + 18, y + 8);
  ctx.lineTo(x + 22, y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a2810";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (fill > 0.02) {
    ctx.fillStyle = "#b8a84a";
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 16 * fill + 2, 4 + 3 * fill, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Дүүргэлтийн зурвас
  const bw = 28;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRectPath(ctx, x - bw / 2, y - 18, bw, 4, 1);
  ctx.fill();
  ctx.fillStyle = fill < 0.15 ? "#d64545" : "#a8c050";
  roundRectPath(ctx, x - bw / 2, y - 18, bw * fill, 4, 1);
  ctx.fill();
}

export function drawWildHorse(
  ctx: CanvasRenderingContext2D,
  horse: { pos: { x: number; y: number }; vel: { x: number; y: number }; face: 1 | -1; id: number; spooked: number },
  cam: Camera,
  time: number,
): void {
  const x = horse.pos.x - cam.x;
  const y = horse.pos.y - cam.y;
  const flip = horse.face;
  const moving = Math.hypot(horse.vel.x, horse.vel.y) > 6;
  const walk = moving ? Math.sin(time * 10 + horse.id) * 2 : 0;

  drawShadow(ctx, x, y + 8, 13, 4);
  drawHerdHorseBody(ctx, x, y, flip, walk, 0);

  ctx.fillStyle = "rgba(255,220,120,0.85)";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("зэрлэг", x, y - 22);
  ctx.textAlign = "left";
}

function drawEnemyCombatFeedback(
  ctx: CanvasRenderingContext2D,
  enemy: Wolf,
  x: number,
  y: number,
  scale: number,
  time: number,
): void {
  const stunned = enemy.attackPhase === "stunned";
  if (enemy.attackPhase === "windup" || enemy.attackPhase === "leaping") {
    const grab = enemy.attackKind === "bearGrab";
    const warningWindow = enemy.kind === "bear" ? 0.24 : 0.22;
    const parryNow = !grab && enemy.attackTimer <= warningWindow;
    const color = grab ? "#d26cff" : parryNow ? "#ff4a42" : "#ffd35a";
    const pulse = 1 + Math.sin(time * 18) * 0.08;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = parryNow ? 3 : 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, (enemy.radius * scale + 9) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    const direction = enemy.attackDirection;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + direction.x * (enemy.radius * scale + 28),
      y + direction.y * (enemy.radius * scale + 28),
    );
    ctx.stroke();
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(grab ? "DODGE" : parryNow ? "PARRY" : "!", x, y - 30 * scale);
    ctx.restore();
  }

  if (enemy.posture < enemy.maxPosture || stunned) {
    const width = Math.max(28, 28 * scale);
    const top = y - 25 * scale;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    roundRectPath(ctx, x - width / 2, top, width, 3.5, 1.5);
    ctx.fill();
    ctx.fillStyle = stunned ? "#ffe08a" : "#d7b35b";
    roundRectPath(
      ctx,
      x - width / 2,
      top,
      width * Math.max(0, enemy.posture / enemy.maxPosture),
      3.5,
      1.5,
    );
    ctx.fill();
    if (stunned) {
      ctx.fillStyle = "#ffe08a";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("J — ТӨГСГӨЛ", x, top - 4);
      ctx.textAlign = "left";
    }
  }
}

export function drawWolf(
  ctx: CanvasRenderingContext2D,
  wolf: Wolf,
  cam: Camera,
  time: number,
): void {
  const x = wolf.pos.x - cam.x;
  const y = wolf.pos.y - cam.y;
  const flip = wolf.face;
  const run = Math.sin(time * 14 + wolf.id) * 3;
  const s = wolf.scale;

  drawShadow(ctx, x, y + 9 * s, 15 * s, 5 * s);

  // Түвшингээр томорсон чоныг scale-тэй зурна
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // Хөл
  ctx.strokeStyle = "#3f3f42";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-9, 4);
  ctx.lineTo(-9 + run, 10);
  ctx.moveTo(-3, 5);
  ctx.lineTo(-3 - run, 10);
  ctx.moveTo(4, 5);
  ctx.lineTo(4 + run, 10);
  ctx.moveTo(9, 4);
  ctx.lineTo(9 - run, 10);
  ctx.stroke();

  // Сүүл
  ctx.strokeStyle = "#4a4a4e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-13 * flip, 0);
  ctx.quadraticCurveTo(-19 * flip, -3 + Math.sin(time * 6) * 2, -22 * flip, -7);
  ctx.stroke();

  // Бие
  const body = ctx.createLinearGradient(0, -8, 0, 6);
  body.addColorStop(0, "#6a6a70");
  body.addColorStop(1, "#45454a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Толгой + хоншоор
  const hx = 12 * flip;
  ctx.fillStyle = "#5a5a60";
  ctx.beginPath();
  ctx.ellipse(hx, -3, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a4a4e";
  ctx.beginPath();
  ctx.ellipse(hx + 5 * flip, -1.5, 4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Хамар
  ctx.fillStyle = "#1a1a1c";
  ctx.beginPath();
  ctx.arc(hx + 8.5 * flip, -1.8, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // Чих
  ctx.fillStyle = "#3f3f44";
  ctx.beginPath();
  ctx.moveTo(hx - 3 * flip, -7);
  ctx.lineTo(hx - 1 * flip, -13);
  ctx.lineTo(hx + 2 * flip, -8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + 1 * flip, -8);
  ctx.lineTo(hx + 4 * flip, -12);
  ctx.lineTo(hx + 6 * flip, -6);
  ctx.closePath();
  ctx.fill();
  // Улаан нүд
  ctx.fillStyle = "#ff3030";
  ctx.beginPath();
  ctx.arc(hx + 2 * flip, -4.5, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Цохиулсан анивчилт
  if (wolf.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${wolf.flash * 5})`;
    ctx.beginPath();
    ctx.ellipse(0, -1, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (wolf.hp < wolf.maxHp) {
    const bw = 24 * s;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - 20 * s, bw, 4, 2);
    ctx.fill();
    ctx.fillStyle = "#e05050";
    roundRectPath(
      ctx,
      x - bw / 2,
      y - 20 * s,
      (bw * wolf.hp) / wolf.maxHp,
      4,
      2,
    );
    ctx.fill();
  }
  drawEnemyCombatFeedback(ctx, wolf, x, y, s, time);
}

/** Баавгай — чононоос хоёр дахин том, хүчтэй араатан */
export function drawBear(
  ctx: CanvasRenderingContext2D,
  bear: Wolf,
  cam: Camera,
  time: number,
): void {
  const x = bear.pos.x - cam.x;
  const y = bear.pos.y - cam.y;
  const flip = bear.face;
  const lumber = Math.sin(time * 8 + bear.id) * 2.5;
  const s = bear.scale;

  drawShadow(ctx, x, y + 11 * s, 18 * s, 6 * s);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // Хөл — бүдүүн сарвуутай
  ctx.strokeStyle = "#3a2814";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-10, 5);
  ctx.lineTo(-10 + lumber, 12);
  ctx.moveTo(-3, 6);
  ctx.lineTo(-3 - lumber, 12);
  ctx.moveTo(5, 6);
  ctx.lineTo(5 + lumber, 12);
  ctx.moveTo(11, 5);
  ctx.lineTo(11 - lumber, 12);
  ctx.stroke();

  // Бие — бөөрөнхий, бөгтөр нуруутай
  const body = ctx.createLinearGradient(0, -12, 0, 8);
  body.addColorStop(0, "#6a4a28");
  body.addColorStop(1, "#42301a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -1, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Мөрний бөгтөр
  ctx.beginPath();
  ctx.ellipse(-4 * flip, -8, 8, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Толгой
  const hx = 13 * flip;
  ctx.fillStyle = "#5c4022";
  ctx.beginPath();
  ctx.ellipse(hx, -5, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Хоншоор
  ctx.fillStyle = "#8a6a42";
  ctx.beginPath();
  ctx.ellipse(hx + 5.5 * flip, -3, 4.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Хамар
  ctx.fillStyle = "#1a120a";
  ctx.beginPath();
  ctx.ellipse(hx + 9 * flip, -3.5, 2, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Дугуй чих
  ctx.fillStyle = "#42301a";
  ctx.beginPath();
  ctx.arc(hx - 4 * flip, -11, 3.2, 0, Math.PI * 2);
  ctx.arc(hx + 2 * flip, -12, 3.2, 0, Math.PI * 2);
  ctx.fill();
  // Ууртай улаан нүд
  ctx.fillStyle = "#ff4020";
  ctx.beginPath();
  ctx.arc(hx + 2 * flip, -6, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Соёо
  ctx.strokeStyle = "#e8e0d0";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(hx + 7 * flip, -0.5);
  ctx.lineTo(hx + 7.5 * flip, 1.8);
  ctx.stroke();

  // Сарвууны хумс
  ctx.strokeStyle = "#d8d0c0";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(11 - lumber, 12);
  ctx.lineTo(13 - lumber + 2 * flip, 12.5);
  ctx.moveTo(-10 + lumber, 12);
  ctx.lineTo(-8 + lumber + 2 * flip, 12.5);
  ctx.stroke();

  // Цохиулсан анивчилт
  if (bear.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${bear.flash * 5})`;
    ctx.beginPath();
    ctx.ellipse(0, -2, 19, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (bear.hp < bear.maxHp) {
    const bw = 30 * s;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - 24 * s, bw, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = "#e05050";
    roundRectPath(
      ctx,
      x - bw / 2,
      y - 24 * s,
      (bw * bear.hp) / bear.maxHp,
      5,
      2.5,
    );
    ctx.fill();
  }
  drawEnemyCombatFeedback(ctx, bear, x, y, s, time);
}

export function drawThief(
  ctx: CanvasRenderingContext2D,
  thief: Thief,
  cam: Camera,
  time: number,
): void {
  const x = thief.pos.x - cam.x;
  const y = thief.pos.y - cam.y;
  const flip = thief.face;
  const moving = Math.abs(thief.vel.x) + Math.abs(thief.vel.y) > 0.05;
  const run = moving ? Math.sin(time * 13 + thief.id) * 3 : 0;
  const armSwing = moving
    ? -Math.sin(time * 13 + thief.id) * 4.5
    : -Math.sin(time * 1.5 + thief.id) * 0.8;
  const armFlip = -flip;
  const shoulderY = y - 5;

  drawShadow(ctx, x, y + 11, 10, 4);

  // Хөл
  ctx.strokeStyle = "#2a2020";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 4);
  ctx.lineTo(x - 3 + run, y + 11);
  ctx.moveTo(x + 3, y + 4);
  ctx.lineTo(x + 3 - run, y + 11);
  ctx.stroke();

  // Хойд гар
  ctx.strokeStyle = "#c4a574";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 5.5 * armFlip, shoulderY);
  ctx.lineTo(
    x - 8.5 * armFlip - armSwing * 0.35,
    shoulderY + 6.5 - armSwing * 0.15,
  );
  ctx.stroke();

  // Уут (хулгайлсан хонь)
  if (thief.stolen > 0) {
    ctx.fillStyle = "#7a5c3a";
    ctx.beginPath();
    ctx.ellipse(x - 10 * flip, y - 6, 8, 9, 0.3 * flip, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a3820";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Хонины толгой цухуйна
    ctx.fillStyle = "#e8e0d0";
    ctx.beginPath();
    ctx.arc(x - 10 * flip, y - 14, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Дээл (хар хүрэн)
  const deel = ctx.createLinearGradient(x, y - 8, x, y + 6);
  deel.addColorStop(0, "#4a3020");
  deel.addColorStop(1, "#332015");
  ctx.fillStyle = deel;
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 8.5, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Бүс
  ctx.strokeStyle = "#8a2020";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + 8, y);
  ctx.stroke();

  // Толгой — нүүр далдалсан алчуур
  ctx.fillStyle = "#c4a574";
  ctx.beginPath();
  ctx.arc(x, y - 13, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1010";
  ctx.fillRect(x - 5.5, y - 15, 11, 4);
  // Малгай
  ctx.fillStyle = "#2a1a12";
  ctx.beginPath();
  ctx.arc(x, y - 16, 5.5, Math.PI, 0);
  ctx.fill();

  // Урд гар
  const handX = x + 6.5 * armFlip + armSwing * 0.25;
  const handY = shoulderY + 7.5 + armSwing * 0.2;
  ctx.strokeStyle = "#c4a574";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 5.5 * armFlip, shoulderY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  if (thief.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${thief.flash * 5})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Хулгайлсан тоо
  ctx.fillStyle = "#ffd0d0";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`−${thief.stolen}`, x, y - 25);
  ctx.textAlign = "left";

  const bw = 22;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRectPath(ctx, x - bw / 2, y + 14, bw, 4, 2);
  ctx.fill();
  ctx.fillStyle = "#50a0e0";
  roundRectPath(ctx, x - bw / 2, y + 14, (bw * thief.hp) / thief.maxHp, 4, 2);
  ctx.fill();
}

/**
 * Side patches + pigtails — paint BEFORE the head disk so they peek
 * from behind the circular silhouette (not over the face).
 * `cx, hy` = head center.
 */
export function drawHerderHairBack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  hy: number,
  _flip = 1,
  time = 0,
): void {
  const hair = "#1a1410";
  const tie = "#e8e4dc";

  // Side circular patches + small pigtails (absolute L/R; sit behind head disk)
  for (const side of [-1, 1] as const) {
    const sx = cx + side * 5.35;
    const sy = hy - 2.6;
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.15, 0, Math.PI * 2);
    ctx.fill();

    const sway = Math.sin(time * 5 + side * 1.7) * 0.45;
    const midX = sx + side * 3.2;
    const midY = sy + 0.8;
    const tipX = sx + side * 5.8;
    const tipY = sy + 2.4 + sway;

    ctx.strokeStyle = hair;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx + side * 1.1, sy + 0.35);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();

    // Soft tip bulb
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 1.45, 0, Math.PI * 2);
    ctx.fill();

    // Light hair tie near the patch
    const tx = sx + side * 2.35;
    ctx.strokeStyle = tie;
    ctx.lineWidth = 1.35;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx, sy - 0.35);
    ctx.lineTo(tx, sy + 1.55);
    ctx.stroke();
    // Tiny knot highlight
    ctx.fillStyle = "#f4f0e8";
    ctx.beginPath();
    ctx.arc(tx, sy + 0.55, 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Central forehead tuft — paint AFTER the head disk (and face), so bangs
 * sit on the forehead above the eyes.
 */
export function drawHerderHairFront(
  ctx: CanvasRenderingContext2D,
  cx: number,
  hy: number,
  flip = 1,
): void {
  const hair = "#1a1410";
  const hairDeep = "#0c0a08";
  const fx = 0.5 * flip;
  const bx = cx + fx;

  // Front central tuft — short bangs high on forehead (clear of eyes ~hy-0.8)
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(bx - 1.9, hy - 4.35);
  ctx.quadraticCurveTo(bx - 0.7, hy - 5.55, bx, hy - 5.35);
  ctx.quadraticCurveTo(bx + 0.7, hy - 5.55, bx + 1.9, hy - 4.35);
  // Jagged bang tips — bottom edge stays above the eye area
  ctx.lineTo(bx + 1.45, hy - 2.95);
  ctx.lineTo(bx + 0.55, hy - 3.55);
  ctx.lineTo(bx, hy - 2.7);
  ctx.lineTo(bx - 0.55, hy - 3.55);
  ctx.lineTo(bx - 1.45, hy - 2.95);
  ctx.closePath();
  ctx.fill();

  // Depth lines in the bangs
  ctx.strokeStyle = hairDeep;
  ctx.lineWidth = 0.55;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 0.35, hy - 4.7);
  ctx.lineTo(bx - 0.2, hy - 3.15);
  ctx.moveTo(bx + 0.45, hy - 4.7);
  ctx.lineTo(bx + 0.3, hy - 3.3);
  ctx.stroke();
}

/**
 * Full hair pass when no head disk is interleaved (back then front).
 */
export function drawHerderHair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  hy: number,
  flip = 1,
  time = 0,
): void {
  drawHerderHairBack(ctx, cx, hy, flip, time);
  drawHerderHairFront(ctx, cx, hy, flip);
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
  gerPacked = false,
): void {
  const x = player.pos.x - cam.x;
  const y = player.pos.y - cam.y;
  // facing.x < 0 → зүүн тийш нүүр / бие
  const flip = player.facing.x < 0 ? -1 : 1;
  const walk = player.moving ? Math.sin(time * 11) * 3 : 0;
  const bob = player.moving
    ? Math.abs(Math.sin(time * 11)) * 1.5
    : Math.sin(time * 2) * 0.6;

  // Хамгаалалттай үед анивчина
  if (player.invuln > 0 && Math.floor(time * 14) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  // Морьтой бол морио зураад, малчнаа дээр нь өргөж зурна
  const riding = player.gear.horse;
  if (riding) {
    drawHorse(ctx, x, y + 2, flip, time, player.moving, gerPacked);
    // Морины амь — шархадсан үед л харагдана
    if (player.horseHp < player.horseMaxHp) {
      const bw = 30;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      roundRectPath(ctx, x - bw / 2, y + 18, bw, 4, 2);
      ctx.fill();
      ctx.fillStyle = "#c98a3a";
      roundRectPath(
        ctx,
        x - bw / 2,
        y + 18,
        (bw * Math.max(0, player.horseHp)) / player.horseMaxHp,
        4,
        2,
      );
      ctx.fill();
    }
    ctx.save();
    ctx.translate(0, -14);
  }

  drawShadow(ctx, x, y + 12, 11, 4.5);

  // Хөл (гутал) — эсрэг чиглэлд хөдөлнө
  ctx.strokeStyle = "#2a2a30";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(x - 3.5, y + 4);
  ctx.lineTo(x - 3.5 + walk, y + 12);
  ctx.moveTo(x + 3.5, y + 4);
  ctx.lineTo(x + 3.5 - walk, y + 12);
  ctx.stroke();

  // Гарын дүүжин — биеийн flip-ээс эсрэг талд, хөлтэй эсрэг фаз
  const armSwing = player.moving
    ? -Math.sin(time * 11) * 4.5
    : -Math.sin(time * 1.5) * 0.8;
  const armFlip = -flip;
  const shoulderY = y - 6 - bob * 0.3;

  // Хойд гар (биений ард)
  ctx.strokeStyle = "#d8b088";
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 6 * armFlip, shoulderY);
  ctx.lineTo(
    x - 9 * armFlip - armSwing * 0.35,
    shoulderY + 7 - armSwing * 0.15,
  );
  ctx.stroke();

  // Дээл — хөх торгон, градиенттай
  const deel = ctx.createLinearGradient(x - 8, y - 10, x + 8, y + 6);
  deel.addColorStop(0, "#3a62a0");
  deel.addColorStop(1, "#24457a");
  ctx.fillStyle = deel;
  ctx.beginPath();
  ctx.ellipse(x, y - 2 - bob * 0.4, 9.5, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Энгэрийн эмжээр
  ctx.strokeStyle = "#e8c56a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 1 * flip, y - 11);
  ctx.quadraticCurveTo(x + 7 * flip, y - 6, x + 5 * flip, y + 2);
  ctx.stroke();
  // Улбар шар бүс
  ctx.strokeStyle = "#d88a2a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 1);
  ctx.lineTo(x + 9, y + 1);
  ctx.stroke();

  // Толгой — үсний ард хэсэг → бүрэн тойрог → нүүр → духны өрөв
  const hdy = y - 15 - bob;
  drawHerderHairBack(ctx, x, hdy, flip, time);
  ctx.fillStyle = "#e0b890";
  ctx.beginPath();
  ctx.arc(x, hdy, 6, 0, Math.PI * 2);
  ctx.fill();

  // Нүүр: хоёр нүд, хөмсөг, ам — дайрах үед ууртай нүүр
  const fx = 1.6 * flip;
  const angry = player.attackAnim > 0;
  ctx.fillStyle = "#2a2018";
  ctx.beginPath();
  ctx.arc(x + fx - 2.2, hdy - 0.8, angry ? 1.05 : 0.9, 0, Math.PI * 2);
  ctx.arc(x + fx + 2.2, hdy - 0.8, angry ? 1.05 : 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2c1c";
  ctx.lineWidth = angry ? 1.15 : 0.9;
  ctx.beginPath();
  if (angry) {
    // Ууртай хөмсөг — дотогш налуу
    ctx.moveTo(x + fx - 3.6, hdy - 3.2);
    ctx.lineTo(x + fx - 0.8, hdy - 2.2);
    ctx.moveTo(x + fx + 0.8, hdy - 2.2);
    ctx.lineTo(x + fx + 3.6, hdy - 3.2);
  } else {
    ctx.moveTo(x + fx - 3.4, hdy - 2.6);
    ctx.lineTo(x + fx - 1, hdy - 2.9);
    ctx.moveTo(x + fx + 1, hdy - 2.9);
    ctx.lineTo(x + fx + 3.4, hdy - 2.6);
  }
  ctx.stroke();
  if (angry) {
    // Нээлттэй ам
    ctx.fillStyle = "#5a2830";
    ctx.beginPath();
    ctx.ellipse(x + fx * 0.6, hdy + 2.4, 1.8, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c07060";
    ctx.beginPath();
    ctx.ellipse(x + fx * 0.6, hdy + 1.7, 1.5, 0.55, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    // Тайван ам — богино шулуун хэвтээ зураас
    ctx.strokeStyle = "#8a5838";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.beginPath();
    const mx = x + fx * 0.6;
    const my = hdy + 2.2;
    ctx.moveTo(mx - 1.4, my);
    ctx.lineTo(mx + 1.4, my);
    ctx.stroke();
  }
  // Хацрын улайлт
  ctx.fillStyle = angry ? "rgba(214,90,60,0.45)" : "rgba(214,110,80,0.35)";
  ctx.beginPath();
  ctx.arc(x + fx - 3.6, hdy + 1.4, 1.4, 0, Math.PI * 2);
  ctx.arc(x + fx + 3.6, hdy + 1.4, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Духны өрөв — толгойн дээр, нүднээс дээш
  drawHerderHairFront(ctx, x, hdy, flip);

  const ang = Math.atan2(player.facing.y, player.facing.x);
  const hasGun = player.gear.gun;
  const hasBow = player.gear.bow && !hasGun;
  const punching = player.attackMelee && player.attackAnim > 0;

  // Урд гар — цохих үед нударгаар урагш шидэгдэнэ, бусад үед дүүжинэ
  const handX = x + 7 * armFlip + armSwing * 0.25;
  const handY = shoulderY + 8 + armSwing * 0.2;
  if (punching) {
    // Нударгын цохилт: гар урагш сунаад буцна
    const p = 1 - player.attackAnim / 0.22;
    const ext = Math.sin(p * Math.PI);
    const reach = 7 + ext * 15;
    const fx2 = x + 3 * flip + Math.cos(ang) * reach;
    const fy2 = shoulderY + 2 + Math.sin(ang) * reach;
    // Тохойтой гар
    const elbowX = x + 4 * flip + Math.cos(ang) * reach * 0.45;
    const elbowY = shoulderY + 5 - ext * 2 + Math.sin(ang) * reach * 0.45;
    ctx.strokeStyle = "#d8b088";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 4 * flip, shoulderY);
    ctx.quadraticCurveTo(elbowX, elbowY, fx2, fy2);
    ctx.stroke();
    // Нударга
    ctx.fillStyle = "#d8b088";
    ctx.beginPath();
    ctx.arc(fx2, fy2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b08858";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Цохилтын хурдны зурвасууд
    if (ext > 0.5) {
      ctx.strokeStyle = `rgba(255,240,200,${(ext - 0.5) * 1.4})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const off of [-3.5, 0, 3.5]) {
        const px2 = fx2 - Math.cos(ang) * 9 - Math.sin(ang) * off;
        const py2 = fy2 - Math.sin(ang) * 9 + Math.cos(ang) * off;
        ctx.moveTo(px2, py2);
        ctx.lineTo(px2 - Math.cos(ang) * 6, py2 - Math.sin(ang) * 6);
      }
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = "#d8b088";
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 6 * armFlip, shoulderY);
    ctx.lineTo(handX, handY);
    ctx.stroke();
  }

  if (punching) {
    // Гараар цохих үед зэвсэг зурахгүй
  } else if (hasGun) {
    // Буу — барьсан байдал
    const kick = player.attackAnim > 0 ? (1 - player.attackAnim / 0.18) * 3 : 0;
    const gx = handX + Math.cos(ang) * (4 - kick);
    const gy = handY + Math.sin(ang) * (4 - kick) - 1;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(ang);
    ctx.fillStyle = "#3a2a1a";
    roundRectPath(ctx, -4, -2.2, 22, 4.4, 1.5);
    ctx.fill();
    ctx.fillStyle = "#2a2a30";
    roundRectPath(ctx, 14, -1.4, 10, 2.8, 1);
    ctx.fill();
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(2, -3.2, 3, 6.4);
    // Галлалтын оч
    if (player.attackAnim > 0.08) {
      ctx.fillStyle = `rgba(255,200,80,${player.attackAnim * 4})`;
      ctx.beginPath();
      ctx.arc(26, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (hasBow) {
    // Нум — барьсан байдал
    const draw =
      player.attackAnim > 0
        ? Math.min(1, (0.18 - player.attackAnim) / 0.12)
        : 0;
    ctx.save();
    ctx.translate(handX, handY - 1);
    ctx.rotate(ang);
    ctx.strokeStyle = "#8a5a28";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(2, -11);
    ctx.quadraticCurveTo(14, 0, 2, 11);
    ctx.stroke();
    // Хөвч
    ctx.strokeStyle = "#e8e0d0";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(2, -11);
    ctx.lineTo(2 - draw * 6, 0);
    ctx.lineTo(2, 11);
    ctx.stroke();
    // Сум (байнга нүхлүүртэй)
    ctx.strokeStyle = "#c8a060";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(2 - draw * 6, 0);
    ctx.lineTo(16, 0);
    ctx.stroke();
    ctx.fillStyle = "#e8e0d0";
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(14, -2);
    ctx.lineTo(14, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (riding) ctx.restore();
  if (player.parryPhase === "startup" || player.parryPhase === "active") {
    const angle = Math.atan2(player.facing.y, player.facing.x);
    ctx.save();
    ctx.strokeStyle =
      player.parryPhase === "active" ? "#9de9ff" : "#e8f7ff";
    ctx.lineWidth = player.parryPhase === "active" ? 4 : 2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x, y - 4, 25, angle - 0.9, angle + 0.9);
    ctx.stroke();
    ctx.restore();
  }
  if (player.dodgePhase === "dodging") {
    ctx.save();
    ctx.strokeStyle = "rgba(184,232,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 2, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** Морь — уналгын үед малчны доор зурагдана; нүүдэлд гэр ачна */
export function drawHorse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flip: number,
  time: number,
  moving: boolean,
  gerPacked = false,
): void {
  const run = moving ? Math.sin(time * 12) * 4 : 0;

  drawShadow(ctx, x, y + 12, 20, 6);

  // Хөл
  ctx.strokeStyle = "#3a2a18";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 2);
  ctx.lineTo(x - 12 + run, y + 13);
  ctx.moveTo(x - 6, y + 3);
  ctx.lineTo(x - 6 - run, y + 13);
  ctx.moveTo(x + 6, y + 3);
  ctx.lineTo(x + 6 + run, y + 13);
  ctx.moveTo(x + 12, y + 2);
  ctx.lineTo(x + 12 - run, y + 13);
  ctx.stroke();

  // Сүүл
  ctx.strokeStyle = "#241808";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 16 * flip, y - 2);
  ctx.quadraticCurveTo(x - 22 * flip, y + 4, x - 20 * flip, y + 12);
  ctx.stroke();

  // Бие
  const body = ctx.createLinearGradient(x, y - 10, x, y + 6);
  body.addColorStop(0, "#6b4a26");
  body.addColorStop(1, "#4a3016");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 17, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Нүүдэл — хураасан гэрийг морины нуруун дээр ачна
  if (gerPacked) {
    const bx = x - 2 * flip;
    const by = y - 14;
    // Оосор
    ctx.strokeStyle = "#5a3a1e";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx - 8, by + 4);
    ctx.lineTo(x - 8, y - 2);
    ctx.moveTo(bx + 8, by + 4);
    ctx.lineTo(x + 6, y - 2);
    ctx.stroke();
    // Эсгий ачаа / гэр — шинэ өнгөний схемтэй тааруулсан
    ctx.fillStyle = "#f7f4ec";
    ctx.beginPath();
    ctx.ellipse(bx, by, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f7f4ec";
    ctx.beginPath();
    ctx.moveTo(bx - 12, by - 2);
    ctx.quadraticCurveTo(bx, by - 16, bx + 12, by - 2);
    ctx.closePath();
    ctx.fill();
    // Хөх хээ
    ctx.strokeStyle = "#1a3d7a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx, by - 14);
    ctx.quadraticCurveTo(bx - 4, by - 6, bx - 8, by - 2);
    ctx.moveTo(bx, by - 14);
    ctx.quadraticCurveTo(bx + 4, by - 6, bx + 8, by - 2);
    ctx.stroke();
    // Тооно улаан
    ctx.fillStyle = "#d42028";
    ctx.beginPath();
    ctx.arc(bx, by - 12, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a3d7a";
    ctx.beginPath();
    ctx.arc(bx, by - 12, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(bx, by, 11, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Хүзүү ба толгой
  ctx.fillStyle = "#5d3f1f";
  ctx.beginPath();
  ctx.moveTo(x + 10 * flip, y - 6);
  ctx.lineTo(x + 20 * flip, y - 16);
  ctx.lineTo(x + 24 * flip, y - 12);
  ctx.lineTo(x + 15 * flip, y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 23 * flip, y - 15, 6, 3.6, flip * -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Дэл
  ctx.strokeStyle = "#241808";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + 11 * flip, y - 7);
  ctx.lineTo(x + 20 * flip, y - 17);
  ctx.stroke();

  // Нүд
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(x + 24 * flip, y - 16, 1, 0, Math.PI * 2);
  ctx.fill();
}

/** Хоньчин нохой */
export function drawDog(
  ctx: CanvasRenderingContext2D,
  dog: Dog,
  cam: Camera,
  time: number,
): void {
  const x = dog.pos.x - cam.x;
  const y = dog.pos.y - cam.y;
  const flip = dog.face;
  const moving = Math.abs(dog.vel.x) + Math.abs(dog.vel.y) > 0.1;
  const run = moving ? Math.sin(time * 13) * 2.5 : 0;

  drawShadow(ctx, x, y + 7, 10, 3.5);

  // Хөл
  ctx.strokeStyle = "#4a3520";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 3);
  ctx.lineTo(x - 6 + run, y + 8);
  ctx.moveTo(x + 5, y + 3);
  ctx.lineTo(x + 5 - run, y + 8);
  ctx.stroke();

  // Сүүл — өргөгдсөн, найгадаг
  ctx.strokeStyle = "#5a4228";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 9 * flip, y - 2);
  ctx.quadraticCurveTo(
    x - 14 * flip,
    y - 10 + Math.sin(time * 8) * 1.5,
    x - 11 * flip,
    y - 12,
  );
  ctx.stroke();

  // Бие
  const body = ctx.createLinearGradient(x, y - 6, x, y + 5);
  body.addColorStop(0, "#7a5c38");
  body.addColorStop(1, "#523c22");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Толгой
  const hx = x + 9 * flip;
  ctx.fillStyle = "#6a4c2c";
  ctx.beginPath();
  ctx.ellipse(hx, y - 4, 5.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#523c22";
  ctx.beginPath();
  ctx.ellipse(hx + 4 * flip, y - 3, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(hx + 6.5 * flip, y - 3.4, 1.1, 0, Math.PI * 2);
  ctx.fill();
  // Чих
  ctx.fillStyle = "#3f2d18";
  ctx.beginPath();
  ctx.moveTo(hx - 2 * flip, y - 8);
  ctx.lineTo(hx - 0.5 * flip, y - 13);
  ctx.lineTo(hx + 2.5 * flip, y - 8.5);
  ctx.closePath();
  ctx.fill();
  // Нүд
  ctx.fillStyle = "#20180c";
  ctx.beginPath();
  ctx.arc(hx + 1.5 * flip, y - 5, 1, 0, Math.PI * 2);
  ctx.fill();

  // Хазуулсны анивчилт
  if (dog.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, dog.flash * 5)})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Амь — шархадсан үед л харагдана
  if (dog.hp < dog.maxHp) {
    const bw = 20;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - 20, bw, 3.5, 1.5);
    ctx.fill();
    ctx.fillStyle = "#8fd08f";
    roundRectPath(
      ctx,
      x - bw / 2,
      y - 20,
      (bw * Math.max(0, dog.hp)) / dog.maxHp,
      3.5,
      1.5,
    );
    ctx.fill();
  }
}

/** Нум сум / бууны сум / сүнсний сум */
export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  p: Projectile,
  cam: Camera,
): void {
  const x = p.pos.x - cam.x;
  const y = p.pos.y - cam.y;
  const ang = Math.atan2(p.vel.y, p.vel.x);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (p.kind === "spiritBolt") {
    ctx.shadowColor = "rgba(120,210,255,0.85)";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "rgba(160,230,255,0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(4, 0);
    ctx.stroke();
    ctx.strokeStyle = "#9ee8ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
    ctx.fillStyle = "#e8f8ff";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(3, -3);
    ctx.lineTo(3, 3);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (p.kind === "arrow") {
    ctx.strokeStyle = "#c8a060";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
    ctx.fillStyle = "#e8e0d0";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(3, -2.5);
    ctx.lineTo(3, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#d05050";
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-11, -2.5);
    ctx.moveTo(-8, 0);
    ctx.lineTo(-11, 2.5);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#ffd860";
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,216,96,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-4, 0);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawRiddleGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  id: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + id);
  ctx.fillStyle = `rgba(232,197,106,${0.25 + pulse * 0.3})`;
  ctx.beginPath();
  ctx.arc(x, y, 10 + pulse * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,220,100,${0.45 + pulse * 0.4})`;
  ctx.beginPath();
  ctx.arc(x, y, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawWorldRock(
  ctx: CanvasRenderingContext2D,
  rock: WorldRock,
  cam: Camera,
  time: number,
): void {
  const x = rock.pos.x - cam.x;
  const y = rock.pos.y - cam.y;
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + rock.id);
  drawShadow(ctx, x, y + 2, 14, 6);

  const g = ctx.createLinearGradient(x - 14, y - 12, x + 12, y + 8);
  g.addColorStop(0, rock.riddleSolved ? "#6a655c" : "#8a8478");
  g.addColorStop(1, rock.riddleSolved ? "#4a4640" : "#5c564c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 13, y + 5);
  ctx.quadraticCurveTo(x - 16, y - 8, x - 2, y - 14);
  ctx.quadraticCurveTo(x + 12, y - 12, x + 14, y + 3);
  ctx.quadraticCurveTo(x + 5, y + 10, x - 13, y + 5);
  ctx.fill();

  if (!rock.riddleSolved) {
    drawRiddleGlow(ctx, x + 1, y - 5, time, rock.id);
  }
}

/** Задарсан өвөрмөц гэр — хана нурсан, тооно хажуу тийш */
export function drawDismantledGer(
  ctx: CanvasRenderingContext2D,
  pos: Vector2,
  cam: Camera,
  time: number,
): void {
  const x = pos.x - cam.x;
  const y = pos.y - cam.y;
  const sway = Math.sin(time * 0.8) * 0.6;

  drawShadow(ctx, x, y + 18, 48, 14);

  // Шал / буурь
  ctx.fillStyle = "rgba(90,70,45,0.45)";
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 46, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Унасан хананы хэсэг (зүүн)
  ctx.fillStyle = "#c8bca8";
  ctx.beginPath();
  ctx.moveTo(x - 42, y + 10);
  ctx.lineTo(x - 38 + sway, y - 18);
  ctx.lineTo(x - 8, y - 8);
  ctx.lineTo(x - 14, y + 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(120,90,50,0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Баруун хагас хана — хазайсан
  ctx.fillStyle = "#d8cdb8";
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 12);
  ctx.lineTo(x + 36, y + 6);
  ctx.lineTo(x + 40, y - 10);
  ctx.lineTo(x + 12, y - 4);
  ctx.closePath();
  ctx.fill();

  // Дээврийн яс / унасан мод
  ctx.strokeStyle = "#6a4a28";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 6);
  ctx.quadraticCurveTo(x - 4, y - 28, x + 22, y - 8);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 8);
  ctx.lineTo(x + 18, y - 22);
  ctx.stroke();

  // Тооно — хажуу тийш унасан
  ctx.fillStyle = "#a07040";
  ctx.beginPath();
  ctx.ellipse(x + 26, y - 16, 7, 5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a3820";
  ctx.beginPath();
  ctx.ellipse(x + 26, y - 16, 3, 2.2, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Хуучин бүслүүр
  ctx.strokeStyle = "rgba(140,100,50,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 36, y + 2);
  ctx.quadraticCurveTo(x, y - 4, x + 30, y + 4);
  ctx.stroke();
}

/** Өвгөн — ширэн дэвсгэр дээр завилж, буурал сахалтай */
export function drawElder(
  ctx: CanvasRenderingContext2D,
  elder: Elder,
  cam: Camera,
  time: number,
): void {
  const x = elder.pos.x - cam.x;
  const y = elder.pos.y - cam.y;
  const breath = Math.sin(time * 1.6) * 0.8;
  const beardGlow = 0.25 + 0.2 * Math.sin(time * 2.1);

  // Ширэн дэвсгэр
  drawShadow(ctx, x, y + 10, 28, 10);
  ctx.fillStyle = "#5a3a22";
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(200,160,90,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 22, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Сууж буй дээл (хөх-бор)
  const deel = ctx.createLinearGradient(x - 16, y - 8, x + 16, y + 10);
  deel.addColorStop(0, "#3a4a62");
  deel.addColorStop(0.5, "#4a5a48");
  deel.addColorStop(1, "#3a3830");
  ctx.fillStyle = deel;
  ctx.beginPath();
  ctx.ellipse(x, y + 2 + breath * 0.1, 15, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Хүзүүвч захарсан
  ctx.strokeStyle = "#8a7050";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 6);
  ctx.quadraticCurveTo(x, y - 10, x + 8, y - 6);
  ctx.stroke();
  // Эртний хээ
  ctx.strokeStyle = "rgba(200,160,80,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 2);
  ctx.lineTo(x + 6, y + 2);
  ctx.moveTo(x, y - 2);
  ctx.lineTo(x, y + 6);
  ctx.stroke();

  // Бүс + бөөгийн толь
  ctx.fillStyle = "#6a4828";
  ctx.fillRect(x - 12, y + 4, 24, 3);
  ctx.fillStyle = "#c8a860";
  ctx.beginPath();
  ctx.arc(x + 10, y + 5, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7ec8ff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + 10, y + 5, 2, 0, Math.PI * 2);
  ctx.stroke();
  // Хөөрөг
  ctx.fillStyle = "#8a6030";
  ctx.beginPath();
  ctx.ellipse(x - 10, y + 6, 3, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Толгой
  ctx.fillStyle = "#c49a72";
  ctx.beginPath();
  ctx.ellipse(x, y - 14 + breath * 0.15, 7.5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Шанаа
  ctx.fillStyle = "#a87850";
  ctx.beginPath();
  ctx.ellipse(x - 5.5, y - 12, 2.2, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 5.5, y - 12, 2.2, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Үс сүлжих (орой)
  ctx.fillStyle = "#d8d0c0";
  ctx.beginPath();
  ctx.arc(x, y - 22, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a89880";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x + 1, y - 28);
  ctx.stroke();

  // Буурал сахал + бага зэрэг туяа
  if (elder.eyeMode !== "idle") {
    ctx.fillStyle = `rgba(180,210,255,${beardGlow * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e8e4dc";
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 10);
  ctx.quadraticCurveTo(x - 10, y + 2, x, y + 6);
  ctx.quadraticCurveTo(x + 10, y + 2, x + 7, y - 10);
  ctx.quadraticCurveTo(x, y - 2, x - 7, y - 10);
  ctx.fill();

  // Нүд
  const eyeY = y - 15;
  if (elder.eyeMode === "idle") {
    ctx.strokeStyle = "#2a2018";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 4, eyeY);
    ctx.quadraticCurveTo(x - 2.5, eyeY + 1.2, x - 1, eyeY);
    ctx.moveTo(x + 1, eyeY);
    ctx.quadraticCurveTo(x + 2.5, eyeY + 1.2, x + 4, eyeY);
    ctx.stroke();
  } else {
    const glow =
      elder.eyeMode === "spirit"
        ? `rgba(100,180,255,${0.55 + beardGlow * 0.4})`
        : `rgba(255,200,80,${0.55 + beardGlow * 0.4})`;
    const pupil = elder.eyeMode === "spirit" ? "#7ec8ff" : "#e8c56a";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x - 2.5, eyeY, 3.5, 0, Math.PI * 2);
    ctx.arc(x + 2.5, eyeY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.arc(x - 2.5, eyeY, 1.6, 0, Math.PI * 2);
    ctx.arc(x + 2.5, eyeY, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
