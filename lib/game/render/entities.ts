import {
  BerryBush,
  Camera,
  Campfire,
  CAMPFIRE_IGNITE_SEC,
  Dog,
  type Elder,
  type Fence,
  type Fish,
  FENCE_GRID,
  type ParentNpc,
  Player,
  Projectile,
  Sheep,
  Thief,
  Tree,
  type Vector2,
  type WorldStone,
  Wolf,
} from "../types";
import { clamp, roundRectPath } from "../utils";

/** Хашааны хагас урт — хөрш сегментийн шон/үзүүр нийлнэ */
const FENCE_HALF = FENCE_GRID / 2;

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

/** Хоёр том шон + урт уяа — гэрийн хажууд морь уях */
export function drawHorseHitch(
  ctx: CanvasRenderingContext2D,
  left: Vector2,
  right: Vector2,
  cam: Camera,
): void {
  const lx = left.x - cam.x;
  const ly = left.y - cam.y;
  const rx = right.x - cam.x;
  const ry = right.y - cam.y;
  const postH = 34;

  const drawPost = (px: number, py: number) => {
    drawShadow(ctx, px, py + 4, 7, 3.2);
    // Шон
    const wood = ctx.createLinearGradient(px - 4, py - postH, px + 4, py);
    wood.addColorStop(0, "#8a6540");
    wood.addColorStop(0.45, "#6a4a2c");
    wood.addColorStop(1, "#4a3218");
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.moveTo(px - 3.5, py + 3);
    ctx.lineTo(px - 4.2, py - postH + 4);
    ctx.lineTo(px + 4.2, py - postH + 4);
    ctx.lineTo(px + 3.5, py + 3);
    ctx.closePath();
    ctx.fill();
    // Толгой / орой
    ctx.fillStyle = "#5a3c22";
    ctx.beginPath();
    ctx.ellipse(px, py - postH + 2, 5.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2814";
    ctx.beginPath();
    ctx.ellipse(px, py - postH + 1, 3.2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Уяаны цагираг
    ctx.strokeStyle = "#c0a060";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(px, py - postH + 12, 3.2, 0, Math.PI * 2);
    ctx.stroke();
  };

  drawPost(lx, ly);
  drawPost(rx, ry);

  // Урт уяа — хоёр шонгоос унжсан
  const ropeY = (ly + ry) / 2 - postH + 12;
  const midX = (lx + rx) / 2;
  const sag = 10;
  ctx.strokeStyle = "rgba(55,40,22,0.55)";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(lx, ly - postH + 12);
  ctx.quadraticCurveTo(midX, ropeY + sag + 1.5, rx, ry - postH + 12);
  ctx.stroke();
  ctx.strokeStyle = "#c4a06a";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(lx, ly - postH + 12);
  ctx.quadraticCurveTo(midX, ropeY + sag, rx, ry - postH + 12);
  ctx.stroke();
  // Уяаны зөөлөн гэрэл
  ctx.strokeStyle = "rgba(232,210,160,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx, ly - postH + 11);
  ctx.quadraticCurveTo(midX, ropeY + sag - 1.5, rx, ry - postH + 11);
  ctx.stroke();
}

export function drawGer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  winterClosed = false,
  smoking = false,
  time = 0,
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

  // Зуух ассан үед яндангаас утаа
  if (smoking) {
    for (let i = 0; i < 5; i++) {
      const phase = time * 0.85 + i * 1.55;
      const rise = (phase % 3.4) / 3.4;
      const sx = x + Math.sin(phase * 1.4 + i) * (1.5 + rise * 5);
      const sy = toonoY - 18 - rise * 34;
      const r = 2.5 + rise * 8;
      const a = (1 - rise) * 0.32;
      ctx.fillStyle = `rgba(72,72,78,${a})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 1.15, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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
  const kind = tree.kind ?? "leafy";

  if (tree.hp <= 0) {
    drawShadow(ctx, x, y + 4, 11, 5);
    ctx.fillStyle = kind === "birch" ? "#c8c0b0" : "#4a3828";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = kind === "birch" ? "#9a9488" : "#6a5238";
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Мод хөдөлгөөнгүй — салхинд найгахгүй
  const sway = 0;
  drawShadow(ctx, x + 4, y + 6, kind === "pine" ? 14 : 18, 7);

  if (kind === "pine") {
    drawPineTree(ctx, x, y, sway);
  } else if (kind === "birch") {
    drawBirchTree(ctx, x, y, sway);
  } else {
    drawLeafyTree(ctx, x, y, sway);
  }

  if (tree.hp < tree.maxHp) {
    const bw = 26;
    const barY = kind === "pine" ? -54 : -46;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y + barY, bw, 5, 2);
    ctx.fill();
    ctx.fillStyle = "#6fcf6f";
    roundRectPath(
      ctx,
      x - bw / 2,
      y + barY,
      (bw * tree.hp) / tree.maxHp,
      5,
      2,
    );
    ctx.fill();
  }
}

function drawPineTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sway: number,
): void {
  // Нарс — бор иш, гурвалжин навчис
  ctx.fillStyle = "#4a3220";
  ctx.beginPath();
  ctx.moveTo(x - 3.2, y + 8);
  ctx.lineTo(x - 1.2 + sway * 0.35, y - 14);
  ctx.lineTo(x + 1.2 + sway * 0.35, y - 14);
  ctx.lineTo(x + 3.2, y + 8);
  ctx.closePath();
  ctx.fill();

  const cx = x + sway;
  const tiers: Array<[number, number, number, string]> = [
    [0, -18, 16, "#1e4a28"],
    [0, -28, 13, "#245a30"],
    [0, -37, 10, "#2d6e3a"],
    [0, -45, 7, "#3a8248"],
  ];
  for (const [ox, oy, halfW, color] of tiers) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx + ox, y + oy - halfW * 0.85);
    ctx.lineTo(cx + ox - halfW, y + oy + halfW * 0.55);
    ctx.lineTo(cx + ox + halfW, y + oy + halfW * 0.55);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBirchTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sway: number,
): void {
  // Хус — цагаан иш, хар зураас, цайвар навч
  const trunkTop = y - 18;
  ctx.fillStyle = "#e8e4d8";
  ctx.beginPath();
  ctx.moveTo(x - 3.5, y + 8);
  ctx.quadraticCurveTo(x - 2 + sway * 0.25, y - 6, x - 1.5 + sway * 0.45, trunkTop);
  ctx.lineTo(x + 1.5 + sway * 0.45, trunkTop);
  ctx.quadraticCurveTo(x + 2 + sway * 0.25, y - 6, x + 3.5, y + 8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(40,36,32,0.72)";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const ty = y + 4 - i * 5.2;
    const side = i % 2 === 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x + side * 0.4, ty);
    ctx.lineTo(x + side * 2.8, ty - 1.2);
    ctx.stroke();
  }

  const cx = x + sway;
  const layers: Array<[number, number, number, string]> = [
    [0, -24, 14, "#5a9a58"],
    [-9, -18, 10, "#6aac62"],
    [9, -18, 10, "#6aac62"],
    [0, -32, 10, "#7cbc70"],
    [-5, -26, 7, "#8ec87e"],
  ];
  for (const [ox, oy, r, c] of layers) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(cx + ox, y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLeafyTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sway: number,
): void {
  // Навчит — бор иш, бөөрөнхий ногоон титэм
  ctx.fillStyle = "#5c3d22";
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 8);
  ctx.quadraticCurveTo(x - 2 + sway * 0.3, y - 8, x - 1.5 + sway * 0.5, y - 16);
  ctx.lineTo(x + 1.5 + sway * 0.5, y - 16);
  ctx.quadraticCurveTo(x + 2 + sway * 0.3, y - 8, x + 4, y + 8);
  ctx.closePath();
  ctx.fill();

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
}

export function drawBerryBush(
  ctx: CanvasRenderingContext2D,
  bush: BerryBush,
  cam: Camera,
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

}

export function drawCampfire(
  ctx: CanvasRenderingContext2D,
  fire: Campfire,
  cam: Camera,
  time: number,
): void {
  const x = fire.pos.x - cam.x;
  const y = fire.pos.y - cam.y;
  const igniteProgress =
    fire.igniting > 0
      ? clamp(1 - fire.igniting / CAMPFIRE_IGNITE_SEC, 0, 1)
      : fire.lit
        ? 1
        : 0;

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

  // Асаах үе — утаа, оч, аажмаар томрох дөл
  if (fire.igniting > 0 || fire.lit) {
    const p = igniteProgress;
    const f1 = 1 + Math.sin(time * 11) * 0.15;
    const f2 = 1 + Math.sin(time * 17 + 2) * 0.2;

    // Утаа (эхэнд илүү, дараа нь багасна)
    if (p < 0.95) {
      const smokeA = (1 - p) * 0.35 + 0.08;
      for (let i = 0; i < 3; i++) {
        const sy =
          y - 8 - p * 18 - i * 10 - Math.sin(time * 3 + i) * 3;
        const sx = x + Math.sin(time * 2.2 + i * 1.7) * (4 + i * 2);
        const sr = 4 + i * 2.5 + p * 2;
        ctx.fillStyle = `rgba(90,90,95,${smokeA * (1 - i * 0.25)})`;
        ctx.beginPath();
        ctx.ellipse(sx, sy, sr, sr * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Оч — асаах үед
    if (fire.igniting > 0) {
      for (let i = 0; i < 5; i++) {
        const ang = time * 4 + i * 1.3;
        const bounce = (Math.sin(time * 9 + i * 2) + 1) * 0.5;
        const ox = x + Math.cos(ang) * (3 + bounce * 8 * p);
        const oy = y - 2 - bounce * (10 + p * 16) - i * 2;
        ctx.fillStyle =
          i % 2 === 0
            ? `rgba(255,180,60,${0.4 + p * 0.5})`
            : `rgba(255,100,40,${0.35 + p * 0.4})`;
        ctx.beginPath();
        ctx.arc(ox, oy, 1.2 + p * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (p > 0.08) {
      const h = 26 * f1 * p;
      // Гадна дөл
      const outer = ctx.createLinearGradient(x, y - h, x, y + 2);
      outer.addColorStop(0, `rgba(255,120,30,${0.1 + p * 0.05})`);
      outer.addColorStop(0.4, `rgba(255,140,42,${0.55 + p * 0.45})`);
      outer.addColorStop(1, `rgba(216,74,16,${0.5 + p * 0.5})`);
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.quadraticCurveTo(x + 11 * p, y - 8 * p, x + 8 * p, y + 2);
      ctx.lineTo(x - 8 * p, y + 2);
      ctx.quadraticCurveTo(x - 11 * p, y - 8 * p, x, y - h);
      ctx.fill();

      // Дотор дөл
      if (p > 0.25) {
        const ih = 14 * f2 * ((p - 0.25) / 0.75);
        ctx.fillStyle = `rgba(255,224,102,${0.5 + p * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(x, y - ih);
        ctx.quadraticCurveTo(x + 5 * p, y - 4 * p, x + 4 * p, y + 1);
        ctx.lineTo(x - 4 * p, y + 1);
        ctx.quadraticCurveTo(x - 5 * p, y - 4 * p, x, y - ih);
        ctx.fill();
      }

      // Газрын гэрэлт толбо
      const glowR = 42 * p;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, glowR);
      glow.addColorStop(0, `rgba(255,150,50,${0.28 * p})`);
      glow.addColorStop(1, "rgba(255,150,50,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }
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
  if (ns) drawShadow(ctx, 0, 2, 6, FENCE_HALF + 2);
  else drawShadow(ctx, 0, 5, FENCE_HALF + 4, 5);

  if (tier === 1) {
    drawFenceWood(ctx, 0, 0, ns, fence.isGate, open);
  } else if (tier === 2) {
    drawFenceBarbed(ctx, 0, 0, ns, fence.isGate, open);
  } else {
    drawFenceElectric(ctx, 0, 0, ns, time, fence.id, fence.isGate, open);
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

  const post = (px: number, py: number): void => {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(px - 2.2, py - 18, 4.4, 20);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(px - 1.6, py - 17, 2.2, 18);
  };

  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 3;
  ctx.lineCap = "butt";
  if (ns) {
    post(0, 0);
    ctx.beginPath();
    ctx.moveTo(0, -FENCE_HALF);
    ctx.lineTo(0, FENCE_HALF);
    ctx.stroke();
  } else {
    post(-FENCE_HALF, 0);
    post(FENCE_HALF, 0);
    ctx.beginPath();
    ctx.moveTo(-FENCE_HALF, -14);
    ctx.lineTo(FENCE_HALF, -14);
    ctx.moveTo(-FENCE_HALF, -7);
    ctx.lineTo(FENCE_HALF, -7);
    ctx.stroke();
  }

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
  // Дээд орой — хурц гурвалжин өргөс
  ctx.fillStyle = "#4a3018";
  ctx.beginPath();
  ctx.moveTo(px - 3.2, py - 18);
  ctx.lineTo(px, py - 26);
  ctx.lineTo(px + 3.2, py - 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#8a6238";
  ctx.beginPath();
  ctx.moveTo(px - 1.4, py - 18);
  ctx.lineTo(px, py - 24);
  ctx.lineTo(px + 1.4, py - 18);
  ctx.closePath();
  ctx.fill();
}

/** Хэвтээ төмөр — үзүүрээс үзүүрт (тасралтгүй) */
function drawWoodRailsEW(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  py: number,
): void {
  ctx.strokeStyle = "#6b4524";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "butt";
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

/** Босоо төмөр — үзүүрээс үзүүрт (тасралтгүй), ганц гол шонтой */
function drawWoodRailsNS(
  ctx: CanvasRenderingContext2D,
  px: number,
  y0: number,
  y1: number,
): void {
  ctx.strokeStyle = "#6b4524";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(px, y0);
  ctx.lineTo(px, y1);
  ctx.stroke();
  ctx.strokeStyle = "#8a6238";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px + 1.2, y0);
  ctx.lineTo(px + 1.2, y1);
  ctx.stroke();
}

/** Хаалганы хавтан — hinge-ээс эргэнэ (open 0..1) */
function drawGateSwing(
  ctx: CanvasRenderingContext2D,
  drawPanel: (ctx: CanvasRenderingContext2D) => void,
  open: number,
  ns = false,
): void {
  const hingeX = ns ? 0 : -FENCE_HALF;
  const hingeY = ns ? -FENCE_HALF : 0;
  ctx.save();
  ctx.translate(hingeX, hingeY);
  ctx.rotate(-open * (Math.PI / 2) * 0.92);
  ctx.translate(-hingeX, -hingeY);
  drawPanel(ctx);
  ctx.restore();
}

function drawFenceWood(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ns: boolean,
  isGate: boolean,
  open: number,
): void {
  if (ns) {
    // Ганц шон голд; төмөр бүрэн урт — хөрштэй үзүүр нийлнэ
    if (isGate) {
      drawGateSwing(
        ctx,
        (c) => {
          drawWoodRailsNS(c, x, y - FENCE_HALF, y + FENCE_HALF);
          c.strokeStyle = "#5a3a1e";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x + 5, y - 4);
          c.lineTo(x + 5, y + 8);
          c.stroke();
        },
        open,
        true,
      );
    } else {
      drawWoodRailsNS(ctx, x, y - FENCE_HALF, y + FENCE_HALF);
    }
    drawWoodPost(ctx, x, y);
    return;
  }

  // Хэвтээ — хоёр үзүүрт шон (хөрштэй нийлнэ)
  if (isGate) {
    drawGateSwing(ctx, (c) => {
      drawWoodRailsEW(c, x - FENCE_HALF, x + FENCE_HALF, y);
      c.strokeStyle = "#5a3a1e";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + 2, y - 16);
      c.lineTo(x + 2, y - 2);
      c.stroke();
    }, open);
  } else {
    drawWoodRailsEW(ctx, x - FENCE_HALF, x + FENCE_HALF, y);
  }
  drawWoodPost(ctx, x - FENCE_HALF, y);
  drawWoodPost(ctx, x + FENCE_HALF, y);
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
  // Дээд орой — төмөр гурвалжин өргөс
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.moveTo(px - 3.4, py - 19);
  ctx.lineTo(px, py - 27);
  ctx.lineTo(px + 3.4, py - 19);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9a9a9a";
  ctx.beginPath();
  ctx.moveTo(px - 1.5, py - 19);
  ctx.lineTo(px, py - 25);
  ctx.lineTo(px + 1.5, py - 19);
  ctx.closePath();
  ctx.fill();
}

function drawBarbedPanelEW(
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

function drawBarbedPanelNS(
  ctx: CanvasRenderingContext2D,
  px: number,
  y0: number,
  y1: number,
): void {
  const mid = (y0 + y1) / 2;
  const half = (y1 - y0) / 2;
  ctx.strokeStyle = "#8a8a8a";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(px, y0);
  ctx.lineTo(px, y1);
  ctx.stroke();
  ctx.strokeStyle = "#b0b0b0";
  ctx.lineWidth = 1;
  const step = half > 8 ? 4 : 5;
  for (let i = -half + 2; i <= half - 2; i += step) {
    ctx.beginPath();
    ctx.moveTo(px - 4, mid + i - 2);
    ctx.lineTo(px + 4, mid + i + 2);
    ctx.moveTo(px + 4, mid + i - 2);
    ctx.lineTo(px - 4, mid + i + 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#d0d0d0";
  const barbStep = half > 8 ? 5 : 4;
  for (let i = -half + 1; i <= half - 1; i += barbStep) {
    ctx.beginPath();
    ctx.arc(px, mid + i, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFenceBarbed(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ns: boolean,
  isGate: boolean,
  open: number,
): void {
  if (ns) {
    if (isGate) {
      drawGateSwing(
        ctx,
        (c) => drawBarbedPanelNS(c, x, y - FENCE_HALF, y + FENCE_HALF),
        open,
        true,
      );
    } else {
      drawBarbedPanelNS(ctx, x, y - FENCE_HALF, y + FENCE_HALF);
    }
    drawBarbedPost(ctx, x, y);
    return;
  }

  drawBarbedPost(ctx, x - FENCE_HALF, y);
  drawBarbedPost(ctx, x + FENCE_HALF, y);
  if (isGate) {
    drawGateSwing(
      ctx,
      (c) => drawBarbedPanelEW(c, x - FENCE_HALF, x + FENCE_HALF, y),
      open,
    );
  } else {
    drawBarbedPanelEW(ctx, x - FENCE_HALF, x + FENCE_HALF, y);
  }
}

/** Дээд шат — чулуун суурь + цахилгаан утас */
function drawFenceElectric(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ns: boolean,
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

  if (ns) {
    for (const [sx, sy, sw, sh] of [
      [-5, -4, 10, 9],
    ] as const) {
      drawStones(x + sx, y + sy, sw, sh);
    }
  } else {
    for (const [sx, sy, sw, sh] of [
      [-11, -2, 10, 8],
      [-1, -3, 11, 9],
      [8, -1, 8, 7],
    ] as const) {
      drawStones(x + sx, y + sy, sw, sh);
    }
  }

  const drawWires = (c: CanvasRenderingContext2D): void => {
    c.strokeStyle = `rgba(120, 210, 255, ${0.55 + pulse * 0.35})`;
    c.lineWidth = 1.8;
    c.shadowColor = "#6ad0ff";
    c.shadowBlur = 4 + pulse * 4;
    c.beginPath();
    if (ns) {
      c.moveTo(x, y - 16);
      c.lineTo(x, y + 8);
    } else {
      c.moveTo(x - 12, y - 16);
      c.lineTo(x + 12, y - 16);
      c.moveTo(x - 12, y - 10);
      c.lineTo(x + 12, y - 10);
    }
    c.stroke();
    c.shadowBlur = 0;
  };

  if (isGate) {
    drawGateSwing(ctx, drawWires, open, ns);
  } else {
    drawWires(ctx);
  }

  if (pulse > 0.85 && open < 0.5) {
    const sx = ns
      ? x + Math.sin(time * 12 + id) * 3
      : x + Math.sin(time * 12 + id) * 8;
    const sy = ns ? y + Math.cos(time * 10 + id) * 6 : y - 13;
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

  // Толгой — бага зэрэг 3/4 өнцөг, хоёр нүдтэй
  const hx = x + 12 * flip;
  const hy = y - 3.5 + graze;
  ctx.fillStyle = "#6a4628";
  ctx.beginPath();
  ctx.ellipse(hx, hy, 6.2, 5.4, flip * -0.12, 0, Math.PI * 2);
  ctx.fill();
  // Цайвар хоншоор / амсар
  ctx.fillStyle = "#d4c0a4";
  ctx.beginPath();
  ctx.ellipse(hx + 2.2 * flip, hy + 2.8, 3.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Хамрын нүх — жижиг, нүднээс ялгаатай
  ctx.fillStyle = "#3a2818";
  ctx.beginPath();
  ctx.ellipse(hx + 3.4 * flip, hy + 2.6, 0.55, 0.4, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + 1.6 * flip, hy + 2.9, 0.55, 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Хажуу тийш соотон чих
  ctx.fillStyle = "#5a3a22";
  ctx.beginPath();
  ctx.ellipse(hx - 4.5 * flip, hy - 2.2, 2.6, 1.4, flip * 0.35, 0, Math.PI * 2);
  ctx.ellipse(hx + 1.2 * flip, hy - 3.8, 2.2, 1.2, flip * -0.45, 0, Math.PI * 2);
  ctx.fill();
  // Дээш матийсан эвэр
  ctx.strokeStyle = "#e0d4bc";
  ctx.lineWidth = 2.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx - 2.2 * flip, hy - 4.2);
  ctx.quadraticCurveTo(hx - 5.5 * flip, hy - 8.2, hx - 3.2 * flip, hy - 11);
  ctx.moveTo(hx + 2.8 * flip, hy - 4.4);
  ctx.quadraticCurveTo(hx + 6 * flip, hy - 8.4, hx + 4.2 * flip, hy - 11);
  ctx.stroke();
  // Хоёр нүд — зөвхөн хар
  for (const side of [-1, 1] as const) {
    const ex = hx + side * 2.1 + 0.4 * flip;
    const ey = hy - 1.35;
    ctx.fillStyle = "#1a120c";
    ctx.beginPath();
    ctx.arc(ex + 0.25 * flip, ey, 1.05, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Сүргийн морь — урт хүзүү, дэл, урт сүүл (уналгын морьтой ижил төрх) */
function drawHerdHorseBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flip: 1 | -1,
  walk: number,
  graze: number,
  longMane = false,
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
  ctx.lineWidth = longMane ? 2.8 : 2.2;
  ctx.beginPath();
  ctx.moveTo(x + 8 * flip, y - 5);
  ctx.lineTo(x + 15 * flip, y - 13 + drop);
  ctx.stroke();
  if (longMane) {
    // Урт үс — хүзүүнээс унасан дэл
    ctx.lineWidth = 1.9;
    const strands = [
      { t: 0.2, len: 11 },
      { t: 0.45, len: 13 },
      { t: 0.7, len: 10 },
    ];
    for (const { t, len } of strands) {
      const sx = x + (8 + t * 7) * flip;
      const sy = y - 5 - t * 8 + drop * t;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + 2 * flip,
        sy + len * 0.45,
        sx - 1 * flip,
        sy + len,
      );
      ctx.stroke();
    }
  }

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
  horse: {
    pos: { x: number; y: number };
    vel: { x: number; y: number };
    face: 1 | -1;
    id: number;
    spooked: number;
  },
  cam: Camera,
  time: number,
): void {
  const x = horse.pos.x - cam.x;
  const y = horse.pos.y - cam.y;
  const f = horse.face;
  const moving = Math.hypot(horse.vel.x, horse.vel.y) > 8;
  const run = moving ? Math.sin(time * 8 + horse.id) * 3.2 : 0;
  const maneSway = Math.sin(time * 3.2 + horse.id) * 2.2;

  drawShadow(ctx, x, y + 12, 20, 6);

  // Хөл — унах морьтой ижил хэмжээ
  ctx.strokeStyle = "#2a1810";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
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
  ctx.strokeStyle = "#0a0804";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x - 12 + run, y + 12);
  ctx.lineTo(x - 12 + run, y + 14);
  ctx.moveTo(x - 6 - run, y + 12);
  ctx.lineTo(x - 6 - run, y + 14);
  ctx.moveTo(x + 6 + run, y + 12);
  ctx.lineTo(x + 6 + run, y + 14);
  ctx.moveTo(x + 12 - run, y + 12);
  ctx.lineTo(x + 12 - run, y + 14);
  ctx.stroke();

  // Сүүл — урт, чөлөөтэй
  ctx.strokeStyle = "#1a1008";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(x - 16 * f, y - 2);
  ctx.quadraticCurveTo(
    x - 26 * f,
    y + 6 + maneSway * 0.4,
    x - 22 * f,
    y + 14,
  );
  ctx.stroke();
  ctx.strokeStyle = "#3a2810";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x - 16 * f, y - 1);
  ctx.quadraticCurveTo(x - 28 * f, y + 8 + maneSway, x - 20 * f, y + 13);
  ctx.stroke();

  // Бие — унах морьтой ижил хэмжээ, эмээлгүй
  const body = ctx.createRadialGradient(x - 2, y - 5, 2, x, y, 18);
  body.addColorStop(0, "#8a6040");
  body.addColorStop(0.55, "#5a3820");
  body.addColorStop(1, "#2e1c10");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 17, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(200,160,100,0.12)";
  ctx.beginPath();
  ctx.ellipse(x + 2 * f, y - 5, 10, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Урт дэл — хүзүү/толгойтой наалдсан
  ctx.fillStyle = "#1a1008";
  ctx.beginPath();
  ctx.moveTo(x + 10 * f, y - 7);
  ctx.quadraticCurveTo(
    x + 12 * f + maneSway * 0.35,
    y - 18,
    x + 20 * f,
    y - 16,
  );
  ctx.quadraticCurveTo(x + 16 * f, y - 10, x + 12 * f, y - 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0c0804";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  for (const t of [0.2, 0.45, 0.7] as const) {
    const mx = x + (11 + t * 8) * f;
    const my = y - 8 - t * 7;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(
      mx - 3 * f + maneSway * 0.4,
      my - 4,
      mx - 2 * f,
      my + 5 + maneSway * 0.3,
    );
    ctx.stroke();
  }

  // Хүзүү + толгой
  ctx.fillStyle = "#4a3020";
  ctx.beginPath();
  ctx.moveTo(x + 10 * f, y - 6);
  ctx.lineTo(x + 18 * f, y - 14);
  ctx.lineTo(x + 22 * f, y - 11);
  ctx.lineTo(x + 14 * f, y - 2);
  ctx.closePath();
  ctx.fill();

  // Дэлний орой — толгойн дээд ирмэгт наалдсан
  ctx.strokeStyle = "#0c0804";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(x + 12 * f, y - 8);
  ctx.lineTo(x + 19 * f, y - 15);
  ctx.stroke();
  ctx.fillStyle = "#1a1008";
  ctx.beginPath();
  ctx.moveTo(x + 17 * f, y - 15);
  ctx.quadraticCurveTo(x + 19 * f, y - 20, x + 22 * f, y - 16.5);
  ctx.quadraticCurveTo(x + 20 * f, y - 14, x + 18 * f, y - 13.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#4a3020";
  ctx.beginPath();
  ctx.ellipse(x + 22 * f, y - 14.5, 5.5, 3.3, f * -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2418";
  ctx.beginPath();
  ctx.ellipse(x + 26.5 * f, y - 13.5, 2.8, 2.0, f * -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Чих
  ctx.fillStyle = "#2a1810";
  ctx.beginPath();
  ctx.moveTo(x + 19 * f, y - 16);
  ctx.lineTo(x + 18.5 * f, y - 21);
  ctx.lineTo(x + 21.5 * f, y - 17);
  ctx.closePath();
  ctx.fill();

  // Нүд
  ctx.fillStyle = "#0a0804";
  ctx.beginPath();
  ctx.arc(x + 23.5 * f, y - 15.5, 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,240,200,0.3)";
  ctx.beginPath();
  ctx.arc(x + 23.8 * f, y - 15.8, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

/** Голын загас */
export function drawFish(
  ctx: CanvasRenderingContext2D,
  fish: Fish,
  cam: Camera,
  time: number,
  thrashing = false,
): void {
  const x = fish.pos.x - cam.x;
  const y = fish.pos.y - cam.y;
  if (x < -40 || x > 1000 || y < -40 || y > 600) return;
  const flip = fish.face;
  const tier = fish.tier === "hard" || fish.tier === "elite" ? fish.tier : "easy";
  const scale = tier === "elite" ? 1.35 : tier === "hard" ? 1.15 : 1;
  const wiggle =
    Math.sin(time * (thrashing ? 28 : 9) + fish.id) *
    (thrashing ? 3.2 : 1.2) *
    scale;

  const colors =
    tier === "elite"
      ? { a: "#f0a050", b: "#d07028", c: "#8a4010", tail: "#a05018" }
      : tier === "hard"
        ? { a: "#6ecf9a", b: "#3a9a70", c: "#246a48", tail: "#2a7850" }
        : { a: "#5a9ad0", b: "#3a78b0", c: "#2a5a90", tail: "#2a68a0" };

  ctx.save();
  ctx.translate(x, y + wiggle * 0.3);
  ctx.rotate(thrashing ? Math.sin(time * 22 + fish.id) * 0.35 : 0);
  ctx.scale(flip * scale, scale);

  ctx.fillStyle = "rgba(20,40,70,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 9, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createLinearGradient(-8, -3, 8, 3);
  body.addColorStop(0, colors.a);
  body.addColorStop(0.5, colors.b);
  body.addColorStop(1, colors.c);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 3.6 + wiggle * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.tail;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(-13, -4 + wiggle);
  ctx.lineTo(-13, 4 - wiggle);
  ctx.closePath();
  ctx.fill();

  if (tier !== "easy") {
    ctx.strokeStyle =
      tier === "elite" ? "rgba(255,220,120,0.7)" : "rgba(180,255,210,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.4, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#0a1828";
  ctx.beginPath();
  ctx.arc(5.5, -0.8, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8f4ff";
  ctx.beginPath();
  ctx.arc(5.8, -1.1, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
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
    const warningWindow = enemy.kind === "bear" ? 0.3 : 0.3;
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
      ctx.fillText("J / Attack", x, top - 4);
      ctx.textAlign = "left";
    }
  }
}

export function drawWolf(
  ctx: CanvasRenderingContext2D,
  wolf: Wolf,
  cam: Camera,
  time: number,
  showCombatFeedback = true,
): void {
  if (!wolf.alive) {
    // Сэг зурахгүй — шууд арилна
    return;
  }

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
  if (showCombatFeedback) {
    drawEnemyCombatFeedback(ctx, wolf, x, y, s, time);
  }
}

/** Баавгай — чононоос хоёр дахин том, хүчтэй араатан */
export function drawBear(
  ctx: CanvasRenderingContext2D,
  bear: Wolf,
  cam: Camera,
  time: number,
): void {
  if (!bear.alive) {
    // Сэг зурахгүй — шууд арилна
    return;
  }

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
 * Хажуугийн уяатай гэзэг — толгойн тойргийн АРД зурна.
 * Ихэнх толгой хулзан; зөвхөн чихний дээр хоёр нимгэн гэзэг.
 */
export function drawHerderHairBack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  hy: number,
  _flip = 1,
  time = 0,
): void {
  const hair = "#2a1c12";
  const hairDeep = "#1a120c";
  const cord = "#e8b84a";
  const cordDeep = "#c49028";

  for (const side of [-1, 1] as const) {
    const sx = cx + side * 5.15;
    const sy = hy - 2.35;
    const sway = Math.sin(time * 4.8 + side * 1.4) * 0.55;

    // Суурь — жижиг хар өрөв
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 1.55, 1.75, side * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Шар уяа — хэдэн эргэлттэй
    for (let i = 0; i < 3; i++) {
      const ty = sy - 0.55 + i * 0.85;
      ctx.strokeStyle = i === 1 ? cord : cordDeep;
      ctx.lineWidth = 1.15;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx - 1.35, ty);
      ctx.lineTo(sx + 1.35, ty);
      ctx.stroke();
    }
    // Уяаны гялбаа
    ctx.strokeStyle = "rgba(255,240,180,0.55)";
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(sx - 0.9, sy - 0.35);
    ctx.lineTo(sx + 0.5, sy - 0.35);
    ctx.stroke();

    // Гэзэг — гадагш, дараа нь доош шовх үзүүртэй (эвэр шиг)
    const midX = sx + side * 3.6;
    const midY = sy + 0.35 + sway * 0.3;
    const tipX = sx + side * 4.4 + sway * 0.4;
    const tipY = sy + 5.2 + sway;

    ctx.strokeStyle = hair;
    ctx.lineWidth = 2.05;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx + side * 1.2, sy + 0.55);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();

    // Дотор гүн
    ctx.strokeStyle = hairDeep;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(sx + side * 1.35, sy + 0.85);
    ctx.quadraticCurveTo(midX - side * 0.2, midY + 0.4, tipX - side * 0.15, tipY - 0.6);
    ctx.stroke();

    // Шовх үзүүр
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(tipX - side * 0.55, tipY - 0.9);
    ctx.lineTo(tipX + side * 0.15, tipY + 0.35);
    ctx.lineTo(tipX - side * 0.95, tipY - 0.15);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Духны төв өрөв — толгой ихэнхдээ хулзан, зөвхөн дээд төвд жижиг хар үс.
 */
export function drawHerderHairFront(
  ctx: CanvasRenderingContext2D,
  cx: number,
  hy: number,
  flip = 1,
): void {
  const hair = "#2a1c12";
  const hairDeep = "#1a120c";
  const bx = cx + 0.35 * flip;

  // Жижиг төв өрөв — духны дээд хэсэгт
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(bx - 2.05, hy - 4.85);
  ctx.quadraticCurveTo(bx - 1.1, hy - 6.35, bx, hy - 6.55);
  ctx.quadraticCurveTo(bx + 1.1, hy - 6.35, bx + 2.05, hy - 4.85);
  ctx.quadraticCurveTo(bx + 1.4, hy - 4.15, bx + 0.55, hy - 3.85);
  ctx.quadraticCurveTo(bx, hy - 4.35, bx - 0.55, hy - 3.85);
  ctx.quadraticCurveTo(bx - 1.4, hy - 4.15, bx - 2.05, hy - 4.85);
  ctx.closePath();
  ctx.fill();

  // Гүн сүүдэр
  ctx.fillStyle = hairDeep;
  ctx.beginPath();
  ctx.ellipse(bx - 0.15, hy - 5.35, 0.85, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Дүрийн нарийвчилсан туслахууд — дээл, гутал, ханцуй, нүүр
// ---------------------------------------------------------------------------

interface DeelStyleSpec {
  /** Гэрэлтэй тал */
  light: string;
  /** Сүүдэртэй тал */
  dark: string;
  /** Энгэр, зах, хормойн эмжээр */
  trim: string;
  /** Бүс */
  sash: string;
  /** Бүсний сүүдэр */
  sashDeep: string;
}

interface HerderFaceSpec {
  skin: string;
  skinLight: string;
  brow: string;
  browWidth: number;
  eye: "round" | "narrow" | "soft";
  /** Өнгөт уруул (ээж) */
  lip?: string;
  blushAlpha: number;
}

const BOY_DEEL: DeelStyleSpec = {
  light: "#4a76b8",
  dark: "#27477c",
  trim: "#e8c56a",
  sash: "#d8862a",
  sashDeep: "#a05e16",
};

const FATHER_DEEL: DeelStyleSpec = {
  light: "#3f628f",
  dark: "#243a5c",
  trim: "#d4b060",
  sash: "#c07a22",
  sashDeep: "#8a5414",
};

const MOTHER_DEEL: DeelStyleSpec = {
  light: "#a04860",
  dark: "#5c2438",
  trim: "#e8c56a",
  sash: "#d4a040",
  sashDeep: "#9a7020",
};

const FATHER_FACE: HerderFaceSpec = {
  skin: "#d9a878",
  skinLight: "#ebc49a",
  brow: "#2a2014",
  browWidth: 1.15,
  eye: "narrow",
  blushAlpha: 0.12,
};

const MOTHER_FACE: HerderFaceSpec = {
  skin: "#e6b890",
  skinLight: "#f5d4b4",
  brow: "#2a1c12",
  browWidth: 0.9,
  eye: "soft",
  lip: "#c06068",
  blushAlpha: 0.42,
};

const BOY_SLEEVE = "#2c4f86";
const FATHER_SLEEVE = "#2a4468";
const MOTHER_SLEEVE = "#6e3048";

const ELDER_DEEL: DeelStyleSpec = {
  light: "#8a8a92",
  dark: "#4a4a52",
  trim: "#c8b070",
  sash: "#6a5a40",
  sashDeep: "#3e3424",
};

const ELDER_FACE: HerderFaceSpec = {
  skin: "#c9a07a",
  skinLight: "#dfb894",
  brow: "#6a6458",
  browWidth: 1.25,
  eye: "narrow",
  blushAlpha: 0.06,
};

const ELDER_SLEEVE = "#5a5a62";
const ELDER_BEARD = "#e4e0d6";
const ELDER_BEARD_DEEP = "#b8b4a8";

/** Монгол гутал — сөхсөн хоншоор, түрий, өмдтэй хөл */
function drawLegsAndBoots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  walk: number,
  flip: number,
  trouser = "#33323b",
  boot = "#241f26",
  bootTrim = "#8a5a2e",
): void {
  ctx.lineCap = "round";
  const feet: Array<[number, number]> = [
    [x - 3.5, x - 3.5 + walk],
    [x + 3.5, x + 3.5 - walk],
  ];
  for (const [hipX, footX] of feet) {
    // Өмд
    ctx.strokeStyle = trouser;
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(hipX, y + 3);
    ctx.lineTo(footX, y + 9.5);
    ctx.stroke();
    // Түрий
    ctx.fillStyle = boot;
    ctx.beginPath();
    ctx.ellipse(footX, y + 10.4, 2.3, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Улавч
    ctx.beginPath();
    ctx.ellipse(footX + flip * 1.3, y + 12.1, 3.4, 1.75, 0, 0, Math.PI * 2);
    ctx.fill();
    // Сөхсөн хоншоор
    ctx.strokeStyle = boot;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(footX + flip * 3.9, y + 12);
    ctx.quadraticCurveTo(footX + flip * 5.3, y + 11.4, footX + flip * 4.9, y + 10);
    ctx.stroke();
    // Түрийн эмжээр
    ctx.strokeStyle = bootTrim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(footX - 2.1, y + 8.6);
    ctx.lineTo(footX + 2.1, y + 8.6);
    ctx.stroke();
  }
}

/**
 * Shift dodge — гүйлтийн поза:
 * нэг хөл өвдөг цээж рүү нугарсан, нөгөө хөл хойш сунасан.
 * cycle: -1..1 (аль хөл урд)
 */
function drawSprintLegsAndBoots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flip: number,
  cycle: number,
  trouser = "#33323b",
  boot = "#241f26",
  bootTrim = "#8a5a2e",
): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const t = Math.max(-1, Math.min(1, cycle));
  // Нугарсан (урд) хөл
  const tuckHip = x + 2.4 * flip;
  const tuckKneeX = x + 5.2 * flip;
  const tuckKneeY = y - 0.5;
  const tuckFootX = x + 1.6 * flip;
  const tuckFootY = y + 4.8;
  // Сунасан (хойд) хөл
  const stretchHip = x - 2.8 * flip;
  const stretchKneeX = x - 6.2 * flip;
  const stretchKneeY = y + 6.8;
  const stretchFootX = x - 10 * flip;
  const stretchFootY = y + 11.4;

  const drawOne = (
    hipX: number,
    kneeX: number,
    kneeY: number,
    footX: number,
    footY: number,
    width: number,
  ): void => {
    ctx.strokeStyle = trouser;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(hipX, y + 2.4);
    ctx.quadraticCurveTo(kneeX, kneeY, footX, footY - 1.1);
    ctx.stroke();

    ctx.fillStyle = boot;
    ctx.beginPath();
    ctx.ellipse(footX, footY, 2.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      footX + flip * 1.35,
      footY + 1.45,
      3.2,
      1.55,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = bootTrim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(footX - 2, footY - 1.35);
    ctx.lineTo(footX + 2, footY - 1.35);
    ctx.stroke();
  };

  if (t >= 0) {
    drawOne(stretchHip, stretchKneeX, stretchKneeY, stretchFootX, stretchFootY, 3.5);
    drawOne(tuckHip, tuckKneeX, tuckKneeY, tuckFootX, tuckFootY, 3.85);
  } else {
    // Эсрэг хөл урд — толин тусгалтай
    drawOne(
      x + 2.4 * flip,
      x - 5.2 * flip,
      stretchKneeY,
      x - 9.2 * flip,
      stretchFootY,
      3.5,
    );
    drawOne(
      x - 2.8 * flip,
      x + 4.8 * flip,
      tuckKneeY,
      x + 0.8 * flip,
      tuckFootY,
      3.85,
    );
  }
}

/** Дээл — мөрөндөө нарийн, хормойдоо дэлгэр; эмжээр, зах, бүс, зангилаатай */
function drawDeelBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  cy: number,
  flip: number,
  s: DeelStyleSpec,
  w = 1,
): void {
  const body = new Path2D();
  body.moveTo(x - 6.6 * w, cy - 9.4);
  body.quadraticCurveTo(x - 10.2 * w, cy - 1.5, x - 10.6 * w, cy + 7.4);
  body.quadraticCurveTo(x, cy + 11.8, x + 10.6 * w, cy + 7.4);
  body.quadraticCurveTo(x + 10.2 * w, cy - 1.5, x + 6.6 * w, cy - 9.4);
  body.quadraticCurveTo(x, cy - 12.4, x - 6.6 * w, cy - 9.4);
  body.closePath();

  const grad = ctx.createLinearGradient(x - 9 * w, cy - 11, x + 8 * w, cy + 9);
  grad.addColorStop(0, s.light);
  grad.addColorStop(1, s.dark);
  ctx.fillStyle = grad;
  ctx.fill(body);

  ctx.save();
  ctx.clip(body);
  // Сүүдэр — гэрлээс холын тал
  ctx.fillStyle = "rgba(10,8,16,0.2)";
  ctx.beginPath();
  ctx.ellipse(x + 7.5 * w, cy + 2.5, 7.5 * w, 12, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Гэрэл — зүүн мөр
  ctx.fillStyle = "rgba(255,240,214,0.13)";
  ctx.beginPath();
  ctx.ellipse(x - 4.5 * w, cy - 5.5, 4.6 * w, 6.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Хормойн нугалаас
  ctx.strokeStyle = "rgba(6,6,12,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 3.5 * w, cy + 4.5);
  ctx.quadraticCurveTo(x - 4.3 * w, cy + 8, x - 3.8 * w, cy + 10.8);
  ctx.moveTo(x + 2.6 * w, cy + 4.8);
  ctx.quadraticCurveTo(x + 3.4 * w, cy + 8, x + 3 * w, cy + 10.8);
  ctx.stroke();
  // Хормойн эмжээр
  ctx.strokeStyle = s.trim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 10.4 * w, cy + 6.2);
  ctx.quadraticCurveTo(x, cy + 10.6, x + 10.4 * w, cy + 6.2);
  ctx.stroke();
  // Энгэрийн ташуу эмжээр
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 0.6 * flip, cy - 12);
  ctx.quadraticCurveTo(x + 5.4 * flip, cy - 8.4, x + 6.8 * flip, cy - 4.4);
  ctx.quadraticCurveTo(x + 7.4 * flip, cy - 1.5, x + 7.2 * flip, cy + 1.5);
  ctx.stroke();
  ctx.restore();

  // Өндөр зах
  ctx.strokeStyle = s.trim;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 3.4, cy - 11.1);
  ctx.quadraticCurveTo(x, cy - 12.8, x + 3.4, cy - 11.1);
  ctx.stroke();

  // Бүс — өргөн торго
  const beltY = cy + 1.6;
  ctx.fillStyle = s.sash;
  ctx.beginPath();
  ctx.moveTo(x - 9.7 * w, beltY - 2.3);
  ctx.quadraticCurveTo(x, beltY - 0.9, x + 9.7 * w, beltY - 2.3);
  ctx.lineTo(x + 9.4 * w, beltY + 2.5);
  ctx.quadraticCurveTo(x, beltY + 3.9, x - 9.4 * w, beltY + 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = s.sashDeep;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 9.4 * w, beltY + 2.4);
  ctx.quadraticCurveTo(x, beltY + 3.8, x + 9.4 * w, beltY + 2.4);
  ctx.stroke();
  // Бүсний зангилаа, унжлага
  ctx.fillStyle = s.sash;
  ctx.beginPath();
  ctx.arc(x + 4.6 * flip, beltY + 0.6, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = s.sashDeep;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x + 4.6 * flip, beltY + 1.6);
  ctx.quadraticCurveTo(x + 5.6 * flip, beltY + 4.4, x + 4.9 * flip, beltY + 6.6);
  ctx.moveTo(x + 4.2 * flip, beltY + 1.8);
  ctx.quadraticCurveTo(x + 3.2 * flip, beltY + 4.2, x + 3.6 * flip, beltY + 6.2);
  ctx.stroke();
}

/** Ханцуйтай гар — дээлийн ханцуй, эмжээр уйма, арьсан сарвуу */
function drawSleevedArm(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sleeve: string,
  cuff: string,
  skin: string,
  midX?: number,
  midY?: number,
): void {
  ctx.lineCap = "round";
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  if (midX !== undefined && midY !== undefined) {
    ctx.quadraticCurveTo(midX, midY, x1, y1);
  } else {
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();
  const fromX = midX ?? x0;
  const fromY = midY ?? y0;
  const dx = x1 - fromX;
  const dy = y1 - fromY;
  const len = Math.hypot(dx, dy) || 1;
  // Уйма
  ctx.fillStyle = cuff;
  ctx.beginPath();
  ctx.arc(x1, y1, 2.3, 0, Math.PI * 2);
  ctx.fill();
  // Сарвуу
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(x1 + (dx / len) * 2.1, y1 + (dy / len) * 2.1, 1.7, 0, Math.PI * 2);
  ctx.fill();
}

/** Толгойн суурь — чих, арьсны градиент, эрүүний сүүдэр */
function drawHerderHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
  flip: number,
  s: HerderFaceSpec,
  r = 6.2,
): void {
  const earX = x - 5.5 * flip;
  ctx.fillStyle = s.skin;
  ctx.beginPath();
  ctx.arc(earX, hdy + 0.5, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(140,85,50,0.4)";
  ctx.beginPath();
  ctx.arc(earX - 0.3 * flip, hdy + 0.6, 0.7, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createRadialGradient(
    x - 1.8 * flip,
    hdy - 2.2,
    0.5,
    x,
    hdy,
    r + 1.2,
  );
  g.addColorStop(0, s.skinLight);
  g.addColorStop(1, s.skin);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, hdy, r, 0, Math.PI * 2);
  ctx.fill();

  // Эрүүний зөөлөн сүүдэр
  ctx.fillStyle = "rgba(150,90,50,0.15)";
  ctx.beginPath();
  ctx.ellipse(x + 0.5 * flip, hdy + r * 0.62, r * 0.62, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Аавын толгойн үс + гэзгийн үндэс (толгойтой холбоотой) */
function drawFatherHairScalp(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
): void {
  const hair = "#140e0a";
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(x, hdy - 1.4, 6.6, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Гэзгийн үндэс — чихэнд наалдсан (тасрахгүй)
  for (const side of [-1, 1] as const) {
    const rootX = x + side * 5.35;
    const rootY = hdy + 0.55;
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(rootX, rootY, 1.85, 2.0, side * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rootX - side * 0.3, rootY - 1.0);
    ctx.quadraticCurveTo(rootX + side * 1.1, rootY + 0.8, rootX + side * 0.45, rootY + 2.2);
    ctx.quadraticCurveTo(rootX - side * 0.7, rootY + 0.9, rootX - side * 0.3, rootY - 1.0);
    ctx.fill();
  }
}

/**
 * Аавын унжсан гэзэг — үндэснээс үргэлжилнэ (агаарт хөвөхгүй).
 * Толгой зурагдсаны дараа, нүүрийг бүрхэхгүйгээр зурна.
 */
function drawFatherBraids(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
  time: number,
  moving: boolean,
): void {
  const hair = "#140e0a";
  const hairDeep = "#0a0705";
  const cord = "#8a4030";
  const cordLite = "#a85840";
  const sway = moving ? Math.sin(time * 5.2) * 0.35 : Math.sin(time * 1.5) * 0.18;

  for (const side of [-1, 1] as const) {
    const rootX = x + side * 5.35;
    const rootY = hdy + 0.55;
    const tipX = rootX + side * 0.25 + sway * 0.7;
    const tipY = hdy + 6.8;

    // Үндэстэй холбоос — толгойноос гарах хэсэг
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(rootX - side * 0.8, rootY + 0.2);
    ctx.quadraticCurveTo(rootX + side * 0.7, rootY + 1.2, rootX + side * 0.25, rootY + 2.4);
    ctx.quadraticCurveTo(rootX - side * 0.9, rootY + 1.3, rootX - side * 0.8, rootY + 0.2);
    ctx.fill();

    // Улаан хүрэн уяа
    for (let i = 0; i < 4; i++) {
      const ty = rootY + 0.95 + i * 0.55;
      ctx.strokeStyle = i % 2 === 0 ? cordLite : cord;
      ctx.lineWidth = 1.25;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rootX - 1.5, ty);
      ctx.quadraticCurveTo(rootX, ty + 0.18, rootX + 1.5, ty);
      ctx.stroke();
    }

    const braidStartY = rootY + 3.1;
    ctx.strokeStyle = hair;
    ctx.lineWidth = 3.0;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rootX, braidStartY - 0.2);
    ctx.quadraticCurveTo(
      rootX + side * 0.7 + sway,
      (braidStartY + tipY) / 2,
      tipX,
      tipY,
    );
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4;
      const px =
        rootX * (1 - t) + tipX * t + side * Math.sin(t * Math.PI * 3) * 0.55 + sway * t;
      const py = braidStartY + (tipY - braidStartY) * t;
      const zig = i % 2 === 0 ? 1 : -1;
      ctx.fillStyle = i % 2 === 0 ? hairDeep : hair;
      ctx.beginPath();
      ctx.ellipse(
        px + side * zig * 0.4,
        py,
        1.15 - t * 0.3,
        0.9 - t * 0.15,
        side * 0.35 * zig,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(tipX, tipY + 0.25, 0.9, 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Аавын духны үс — дунд хуваарь, нягт татсан */
function drawFatherHairFront(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
  _flip: number,
): void {
  const hair = "#140e0a";
  for (const side of [-1, 1] as const) {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(x, hdy - 6.5);
    ctx.quadraticCurveTo(x + side * 5.6, hdy - 5.8, x + side * 6.2, hdy - 0.8);
    ctx.quadraticCurveTo(x + side * 4.6, hdy - 3.4, x + side * 1.2, hdy - 4.4);
    ctx.quadraticCurveTo(x + side * 0.25, hdy - 5.2, x, hdy - 6.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 0.7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, hdy - 6.3);
  ctx.lineTo(x, hdy - 3.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 3.2, hdy - 5.2);
  ctx.quadraticCurveTo(x - 4.6, hdy - 4, x - 5.1, hdy - 2.2);
  ctx.stroke();
}

/** Аавын сахал — нимгэн сахал, ооч, эрүүний шугам */
function drawFatherBeard(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
  flip: number,
): void {
  const fx = 1.6 * flip;
  const beard = "#1a120c";
  const mx = x + fx * 0.55;
  // Сахал — уруулын дээгүүр, нимгэн, амны буланд хүртэл
  ctx.strokeStyle = beard;
  ctx.lineWidth = 1.05;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(mx - 0.15, hdy + 1.45);
  ctx.quadraticCurveTo(mx - 1.9, hdy + 1.15, mx - 2.95, hdy + 2.35);
  ctx.moveTo(mx + 0.15, hdy + 1.45);
  ctx.quadraticCurveTo(mx + 1.9, hdy + 1.15, mx + 2.95, hdy + 2.35);
  ctx.stroke();
  // Ооч — доод уруулын доор, шовх
  ctx.fillStyle = beard;
  ctx.beginPath();
  ctx.moveTo(mx - 0.85, hdy + 3.15);
  ctx.quadraticCurveTo(mx - 1.1, hdy + 4.6, mx, hdy + 5.55);
  ctx.quadraticCurveTo(mx + 1.1, hdy + 4.6, mx + 0.85, hdy + 3.15);
  ctx.quadraticCurveTo(mx, hdy + 3.45, mx - 0.85, hdy + 3.15);
  ctx.closePath();
  ctx.fill();
  // Эрүүний нимгэн шугам
  ctx.strokeStyle = beard;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(mx - 2.7, hdy + 2.6);
  ctx.quadraticCurveTo(mx - 3.2, hdy + 3.8, mx - 1.4, hdy + 4.7);
  ctx.moveTo(mx + 2.7, hdy + 2.6);
  ctx.quadraticCurveTo(mx + 3.2, hdy + 3.8, mx + 1.4, hdy + 4.7);
  ctx.stroke();
}

/** Ээжийн толгойн үс + гэзгийн үндэс */
function drawMotherHairScalp(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
): void {
  const hair = "#170f08";
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(x, hdy - 1, 6.9, 6.1, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1] as const) {
    const bx = x + side * 5.55;
    ctx.beginPath();
    ctx.ellipse(bx, hdy + 0.5, 1.8, 2.2, side * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx - side * 0.4, hdy - 0.6);
    ctx.quadraticCurveTo(bx + side * 1.2, hdy + 1.5, bx + side * 0.4, hdy + 3.4);
    ctx.quadraticCurveTo(bx - side * 1.0, hdy + 1.4, bx - side * 0.4, hdy - 0.6);
    ctx.fill();
  }
}

/** Ээжийн унжсан гэзэг — үндэснээс үргэлжилнэ */
function drawMotherBraids(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
  time: number,
  moving: boolean,
): void {
  const hair = "#170f08";
  const sway = moving ? Math.sin(time * 7) * 0.9 : Math.sin(time * 1.8) * 0.4;
  for (const side of [-1, 1] as const) {
    const bx = x + side * 5.55;
    // Холбоос
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(bx - side * 0.7, hdy + 0.3);
    ctx.quadraticCurveTo(bx + side * 0.8, hdy + 1.8, bx + side * 0.3, hdy + 3.5);
    ctx.quadraticCurveTo(bx - side * 1.0, hdy + 1.6, bx - side * 0.7, hdy + 0.3);
    ctx.fill();

    ctx.strokeStyle = hair;
    ctx.lineWidth = 2.7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, hdy + 2.8);
    ctx.quadraticCurveTo(
      bx + side * 1.8 + sway,
      hdy + 6.5,
      bx + side * 0.4 + sway * 1.6,
      hdy + 11.5,
    );
    ctx.stroke();
    ctx.fillStyle = "#0d0805";
    for (let i = 1; i <= 3; i++) {
      const t = i / 3.4;
      const px = bx + side * (1.5 - t * 1.2) + sway * t * 1.4;
      const py = hdy + 3.2 + t * 8.2;
      ctx.beginPath();
      ctx.arc(px, py, 1.05 - t * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const tipX = bx + side * 0.4 + sway * 1.6;
    const tipY = hdy + 11.5;
    ctx.strokeStyle = "#c8483a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tipX - 1.1, tipY - 0.8);
    ctx.lineTo(tipX + 1.1, tipY - 0.2);
    ctx.stroke();
  }
}

/** Ээжийн духны үс — дунд хуваарьтай; алт-шүрэн ээмэг */
function drawMotherHairFront(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
  flip: number,
): void {
  const hair = "#170f08";
  for (const side of [-1, 1] as const) {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(x, hdy - 6.3);
    ctx.quadraticCurveTo(x + side * 5.8, hdy - 5.5, x + side * 6, hdy - 0.6);
    ctx.quadraticCurveTo(x + side * 4.7, hdy - 3.2, x + side * 1.3, hdy - 4.1);
    ctx.quadraticCurveTo(x + side * 0.3, hdy - 4.9, x, hdy - 6.3);
    ctx.closePath();
    ctx.fill();
  }
  // Үсний гялбаа
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 0.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 3.6, hdy - 5.1);
  ctx.quadraticCurveTo(x - 4.9, hdy - 3.9, x - 5.2, hdy - 1.9);
  ctx.stroke();
  // Ээмэг — алт + шүрэн
  const earX = x - 5.5 * flip;
  ctx.strokeStyle = "#e8c56a";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(earX, hdy + 1.9);
  ctx.lineTo(earX, hdy + 3.4);
  ctx.stroke();
  ctx.fillStyle = "#e8c56a";
  ctx.beginPath();
  ctx.arc(earX, hdy + 4, 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c8483a";
  ctx.beginPath();
  ctx.arc(earX, hdy + 3.9, 0.45, 0, Math.PI * 2);
  ctx.fill();
}

/** Тонгойж зогсоод хоёр чулуу цохих — гал асаах анимэйшн */
function drawPlayerLightingFire(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
  lightingFire: number,
): void {
  const x = player.pos.x - cam.x;
  const y = player.pos.y - cam.y;
  const flip = player.facing.x < 0 ? -1 : 1;
  const progress = clamp(1 - lightingFire / CAMPFIRE_IGNITE_SEC, 0, 1);

  // Цохилтын хэмнэл
  const strike = Math.sin(time * 6.2);
  const impact = strike > 0.82;
  const swing = Math.max(0, -strike);
  const approach = Math.max(0, strike);
  // Тонгойх — урагш бөхийх
  const bend = 5 + approach * 1.5;

  drawShadow(ctx, x, y + 12, 12, 4.5);
  drawLegsAndBoots(ctx, x, y, 0, flip, "#2e2d36", "#1c181e", "#8a5a2e");

  // Бие тонгойсон — төв доош/урд
  const bodyY = y - 1 + bend * 0.35;
  const bodyX = x + bend * 0.45 * flip;
  const shoulderY = bodyY - 7;

  drawDeelBody(ctx, bodyX, bodyY, flip, BOY_DEEL, 0.96);

  // Толгой — доош харж тонгойно (хуучин энгийн нүүр)
  const hdy = bodyY - 13;
  const hx = bodyX + bend * 0.25 * flip;
  drawHerderHairBack(ctx, hx, hdy, flip, time);
  ctx.fillStyle = "#e0b890";
  ctx.beginPath();
  ctx.arc(hx, hdy, 6, 0, Math.PI * 2);
  ctx.fill();

  const faceX = 1.6 * flip;
  ctx.fillStyle = "#2a2018";
  ctx.beginPath();
  ctx.arc(hx + faceX - 2.2, hdy - 0.2, 0.9, 0, Math.PI * 2);
  ctx.arc(hx + faceX + 2.2, hdy - 0.2, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2c1c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hx + faceX - 3.4, hdy - 2.4);
  ctx.lineTo(hx + faceX - 0.8, hdy - 1.9);
  ctx.moveTo(hx + faceX + 0.8, hdy - 1.9);
  ctx.lineTo(hx + faceX + 3.4, hdy - 2.4);
  ctx.stroke();
  ctx.strokeStyle = "#8a5838";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hx + faceX * 0.5 - 1.2, hdy + 2.4);
  ctx.lineTo(hx + faceX * 0.5 + 1.2, hdy + 2.4);
  ctx.stroke();
  ctx.fillStyle = "rgba(214,110,80,0.35)";
  ctx.beginPath();
  ctx.arc(hx + faceX - 3.5, hdy + 1.4, 1.3, 0, Math.PI * 2);
  ctx.arc(hx + faceX + 3.5, hdy + 1.4, 1.3, 0, Math.PI * 2);
  ctx.fill();
  drawHerderHairFront(ctx, hx, hdy, flip);

  // Чулуу цохих цэг — биеийн өмнө, богино гар
  const clashX = bodyX + 6.5 * flip;
  const clashY = bodyY + 4;

  // Зүүн гар — нэг чулуу (бааз, бага хөдөлнө)
  const leftHandX = clashX - 3 - approach * 1;
  const leftHandY = clashY + 1 + swing * 1;
  drawSleevedArm(
    ctx,
    bodyX - 4.5 * flip,
    shoulderY + 1,
    leftHandX,
    leftHandY,
    BOY_SLEEVE,
    BOY_DEEL.trim,
    "#e0b890",
    bodyX - 1.5 * flip + 2,
    shoulderY + 5,
  );

  // Зүүн чулуу
  ctx.fillStyle = "#7a7568";
  ctx.beginPath();
  ctx.ellipse(leftHandX + 2.5, leftHandY + 0.4, 3.2, 2.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9a9488";
  ctx.beginPath();
  ctx.ellipse(leftHandX + 1.8, leftHandY - 0.4, 1.2, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(40,38,32,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(leftHandX + 2.5, leftHandY + 0.4, 3.2, 2.5, -0.2, 0, Math.PI * 2);
  ctx.stroke();

  // Баруун гар — нөгөө чулуугаар цохино
  const rightHandX = clashX + 3 + swing * 6 - approach * 4;
  const rightHandY = clashY - 1 - swing * 5 + approach * 3;
  drawSleevedArm(
    ctx,
    bodyX + 4.5 * flip,
    shoulderY,
    rightHandX,
    rightHandY,
    BOY_SLEEVE,
    BOY_DEEL.trim,
    "#e0b890",
    bodyX + 6.5 * flip + swing * 1.5,
    shoulderY + 3 - swing * 3.5,
  );

  // Баруун чулуу
  ctx.fillStyle = "#6a6560";
  ctx.beginPath();
  ctx.ellipse(rightHandX - 1.8, rightHandY + 0.8, 2.9, 2.3, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a8580";
  ctx.beginPath();
  ctx.ellipse(rightHandX - 1.1, rightHandY, 1.1, 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(30,28,24,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(rightHandX - 1.8, rightHandY + 0.8, 2.9, 2.3, 0.35, 0, Math.PI * 2);
  ctx.stroke();

  // Цохилтын оч
  if (impact || progress > 0.55) {
    const sparkBurst = impact ? 1 : 0.35 + progress * 0.4;
    const cx = (leftHandX + rightHandX) / 2 + 1;
    const cy = (leftHandY + rightHandY) / 2;
    for (let i = 0; i < 6; i++) {
      const a = time * 18 + i * 1.1;
      const len = (3 + (i % 3) * 2.5) * sparkBurst;
      ctx.strokeStyle =
        i % 2 === 0
          ? `rgba(255,220,80,${0.55 * sparkBurst})`
          : `rgba(255,140,40,${0.45 * sparkBurst})`;
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len - 2);
      ctx.stroke();
    }
    if (impact) {
      ctx.fillStyle = `rgba(255,240,180,${0.35 + progress * 0.25})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5 + progress, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
  gerPacked = false,
  lightingFire = 0,
  eyesClosed = false,
): void {
  if (lightingFire > 0) {
    drawPlayerLightingFire(ctx, player, cam, time, lightingFire);
    return;
  }

  const x = player.pos.x - cam.x;
  const y = player.pos.y - cam.y;
  const flip = player.facing.x < 0 ? -1 : 1;
  const riding = player.riding;
  const dashPose =
    !riding &&
    (player.dodgePhase === "dodging" ||
      (player.dodgePhase === "recovery" && player.dodgeTimer > 0.03));
  const dashActive = !riding && player.dodgePhase === "dodging";
  const walk = riding
    ? 0
    : dashPose
      ? 0
      : player.moving
        ? Math.sin(time * 11) * 3
        : 0;
  const bob = riding
    ? Math.sin(time * 2) * 0.25
    : dashPose
      ? Math.abs(Math.sin(time * 26)) * 2.2
      : player.moving
        ? Math.abs(Math.sin(time * 11)) * 1.5
        : Math.sin(time * 2) * 0.6;
  const angry = player.attackAnim > 0 && !eyesClosed;

  if (riding) {
    drawHorse(ctx, x, y + 2, flip, time, player.moving, gerPacked);
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

  if (!eyesClosed) {
    drawShadow(ctx, x, y + 12, dashPose ? 13 : 11, dashPose ? 3.8 : 4.5);
  }

  // Dodge — урагш тонгойх (хөлийн төвөөр эргүүлнэ)
  const lean =
    dashActive ? 0.52 : dashPose ? 0.22 : 0;
  if (lean > 0.02) {
    ctx.save();
    ctx.translate(x, y + 12);
    ctx.rotate(lean * flip);
    ctx.translate(-x, -(y + 12));
  }

  // Морь унасан үед хөл хөдөлгөөнгүй суулгана
  if (riding) {
    drawLegsAndBoots(ctx, x, y + 1, 0, flip, "#2e2d36", "#1c181e", "#8a5a2e");
  } else if (dashPose) {
    // Гүйлтийн хөл — нэг нугарсан, нэг хойш сунасан
    const runCycle = Math.sin(time * 30);
    drawSprintLegsAndBoots(
      ctx,
      x,
      y - bob * 0.1,
      flip,
      runCycle,
      "#2e2d36",
      "#1c181e",
      "#8a5a2e",
    );
  } else {
    drawLegsAndBoots(ctx, x, y - bob * 0.15, walk, flip, "#2e2d36", "#1c181e", "#8a5a2e");
  }

  const armSwing = riding
    ? 0
    : dashPose
      ? 0
      : player.moving
        ? -Math.sin(time * 11) * 4.5
        : -Math.sin(time * 1.5) * 0.8;
  const armFlip = -flip;
  const bodyY = y - 2 - bob * 0.4 + (dashPose ? 1.2 : 0);
  const shoulderY = y - 6 - bob * 0.3 + (dashPose ? 1.0 : 0);

  // Хойд ханцуй — dodge үед хоёр гар хойш
  if (dashPose) {
    drawSleevedArm(
      ctx,
      x - 5.5 * armFlip,
      shoulderY + 1,
      x - 12.5 * armFlip,
      shoulderY + 3.5,
      BOY_SLEEVE,
      BOY_DEEL.trim,
      "#e0b890",
      x - 9 * armFlip,
      shoulderY + 5.5,
    );
  } else {
    drawSleevedArm(
      ctx,
      x - 6.2 * armFlip,
      shoulderY,
      x - 9.2 * armFlip - armSwing * 0.35,
      shoulderY + 7.2 - armSwing * 0.15,
      BOY_SLEEVE,
      BOY_DEEL.trim,
      "#e0b890",
    );
  }

  drawDeelBody(ctx, x, bodyY, flip, BOY_DEEL, 0.96);

  // Толгой — хуучин энгийн нүүр (бие/гутал шинэ хэвээр)
  const hdy = y - 15 - bob + (dashPose ? 0.8 : 0);
  drawHerderHairBack(ctx, x, hdy, flip, time);
  ctx.fillStyle = "#e0b890";
  ctx.beginPath();
  ctx.arc(x, hdy, 6, 0, Math.PI * 2);
  ctx.fill();

  const fx = 1.6 * flip;
  if (eyesClosed) {
    ctx.strokeStyle = "#2a2018";
    ctx.lineWidth = 1.15;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + fx - 3.2, hdy - 0.55);
    ctx.quadraticCurveTo(x + fx - 2.1, hdy + 0.75, x + fx - 0.5, hdy - 0.45);
    ctx.moveTo(x + fx + 0.5, hdy - 0.45);
    ctx.quadraticCurveTo(x + fx + 2.1, hdy + 0.75, x + fx + 3.2, hdy - 0.55);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#2a2018";
    ctx.beginPath();
    ctx.arc(x + fx - 2.2, hdy - 0.8, angry ? 1.05 : 0.9, 0, Math.PI * 2);
    ctx.arc(x + fx + 2.2, hdy - 0.8, angry ? 1.05 : 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#3a2c1c";
  ctx.lineWidth = angry ? 1.15 : 0.9;
  ctx.beginPath();
  if (angry) {
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
    ctx.fillStyle = "#5a2830";
    ctx.beginPath();
    ctx.ellipse(x + fx * 0.6, hdy + 2.4, 1.8, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c07060";
    ctx.beginPath();
    ctx.ellipse(x + fx * 0.6, hdy + 1.7, 1.5, 0.55, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
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
  ctx.fillStyle = angry ? "rgba(214,90,60,0.45)" : "rgba(214,110,80,0.35)";
  ctx.beginPath();
  ctx.arc(x + fx - 3.6, hdy + 1.4, 1.4, 0, Math.PI * 2);
  ctx.arc(x + fx + 3.6, hdy + 1.4, 1.4, 0, Math.PI * 2);
  ctx.fill();
  drawHerderHairFront(ctx, x, hdy, flip);

  const ang = Math.atan2(player.facing.y, player.facing.x);
  const hasBow = player.gear.bow;
  const swordEquipped =
    player.hasSkySword && player.weapon === "skySword";
  const swordSlashing =
    swordEquipped && player.combatPhase !== "idle";
  const punching =
    !swordEquipped && player.attackMelee && player.attackAnim > 0;
  const handX = dashPose
    ? x + 4 * armFlip - 8 * flip
    : x + 7 * armFlip + armSwing * 0.25;
  const handY = dashPose
    ? shoulderY + 5.5
    : shoulderY + 8 + armSwing * 0.2;

  if (dashPose && !punching && !swordSlashing) {
    // Урд гар ч хойш — гүйх поза
    drawSleevedArm(
      ctx,
      x + 5.2 * armFlip,
      shoulderY + 0.5,
      handX,
      handY,
      BOY_SLEEVE,
      BOY_DEEL.trim,
      "#e0b890",
      x + 1.5 * armFlip - 3 * flip,
      shoulderY + 6,
    );
    ctx.fillStyle = "#e0b890";
    ctx.beginPath();
    ctx.arc(handX, handY, 2.3, 0, Math.PI * 2);
    ctx.fill();
    if (swordEquipped) {
      const faceAng = Math.atan2(player.facing.y, player.facing.x);
      drawHeldSkySword(ctx, player, handX, handY, faceAng, time, 0);
    }
  } else if (swordSlashing) {
    // Сэлэм цавчих — гар сэлмийн чиглэлд сунана (нударга биш)
    const atk = player.attackFacing;
    const faceAng = Math.atan2(atk.y, atk.x);
    const phase =
      player.combatPhase === "startup"
        ? 0.2
        : player.combatPhase === "active"
          ? 0.55
          : 0.85;
    const windup = player.combatPhase === "startup";
    const facingLeft = Math.cos(faceAng) < 0;
    const reach = windup ? 6 : 11 + phase * 6;
    const side =
      Math.sin(phase * Math.PI) *
      (windup ? -4 : 5) *
      (facingLeft ? -1 : 1);
    const fx2 =
      x +
      Math.cos(faceAng) * reach -
      Math.sin(faceAng) * side * 0.35;
    const fy2 =
      shoulderY +
      Math.sin(faceAng) * reach * 0.55 -
      (windup ? 5 : 1) +
      Math.cos(faceAng) * side * 0.2;
    const elbowX = x + Math.cos(faceAng) * reach * 0.4;
    const elbowY = shoulderY - (windup ? 3 : 0) + Math.sin(faceAng) * 2;
    drawSleevedArm(
      ctx,
      x + 4 * Math.sign(Math.cos(faceAng) || flip),
      shoulderY,
      fx2,
      fy2,
      BOY_SLEEVE,
      BOY_DEEL.trim,
      "#e0b890",
      elbowX,
      elbowY,
    );
    ctx.fillStyle = "#e0b890";
    ctx.beginPath();
    ctx.arc(fx2, fy2, 2.4, 0, Math.PI * 2);
    ctx.fill();
    drawHeldSkySword(ctx, player, fx2, fy2, faceAng, time, phase);
  } else if (punching) {
    const p = 1 - player.attackAnim / 0.22;
    const ext = Math.sin(p * Math.PI);
    const reach = 7 + ext * 15;
    const fx2 = x + 3 * flip + Math.cos(ang) * reach;
    const fy2 = shoulderY + 2 + Math.sin(ang) * reach;
    const elbowX = x + 4 * flip + Math.cos(ang) * reach * 0.45;
    const elbowY = shoulderY + 5 - ext * 2 + Math.sin(ang) * reach * 0.45;
    drawSleevedArm(
      ctx,
      x + 4 * flip,
      shoulderY,
      fx2,
      fy2,
      BOY_SLEEVE,
      BOY_DEEL.trim,
      "#e0b890",
      elbowX,
      elbowY,
    );
    ctx.fillStyle = "#e0b890";
    ctx.beginPath();
    ctx.arc(fx2, fy2, 2.8, 0, Math.PI * 2);
    ctx.fill();
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
    drawSleevedArm(
      ctx,
      x + 6 * armFlip,
      shoulderY,
      handX,
      handY,
      BOY_SLEEVE,
      BOY_DEEL.trim,
      "#e0b890",
    );
    if (swordEquipped) {
      const faceAng = Math.atan2(player.facing.y, player.facing.x);
      drawHeldSkySword(ctx, player, handX, handY, faceAng, time, 0);
    }
  }

  if (!punching && !swordSlashing && !dashPose && hasBow) {
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
    ctx.strokeStyle = "#e8e0d0";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(2, -11);
    ctx.lineTo(2 - draw * 6, 0);
    ctx.lineTo(2, 11);
    ctx.stroke();
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

  if (lean > 0.02) ctx.restore();
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
  if (player.dodgePhase === "dodging" || player.dodgePhase === "recovery") {
    drawDodgeWindEffect(ctx, player, cam, time);
  }
  ctx.globalAlpha = 1;
}

/**
 * Гарны үзүүрт бариулсан XIII зууны монгол сэлэм (procedural).
 * Баруун тийш гоё — зүүн тийш mirror хийнэ.
 */
function drawHeldSkySword(
  ctx: CanvasRenderingContext2D,
  player: Player,
  handX: number,
  handY: number,
  faceAng: number,
  time: number,
  slashPhase: number,
): void {
  const facingLeft = Math.cos(faceAng) < 0;
  const mir = facingLeft ? -1 : 1;

  // Idle: үзүүр дээш арагш; цавчих: нум (зүүн = барууны mirror)
  let swordAng = faceAng - mir * 2.05;
  let trail = 0;
  const swingFrom = faceAng - mir * 2.35;
  const swingTo = faceAng + mir * 0.55;

  if (player.parryPhase !== "idle") {
    swordAng = faceAng - mir * (Math.PI * 0.55);
  } else if (player.combatPhase !== "idle") {
    const t =
      player.combatPhase === "startup"
        ? 0.15
        : player.combatPhase === "active"
          ? Math.min(1, 0.25 + slashPhase)
          : 0.9;
    swordAng = swingFrom + (swingTo - swingFrom) * t;
    trail = player.combatPhase === "active" ? 0.85 : 0.35;
  } else if (player.moving) {
    swordAng += Math.sin(time * 11) * 0.06 * mir;
  }

  ctx.save();
  ctx.translate(handX, handY);

  if (trail > 0.05) {
    ctx.lineCap = "round";
    const progress =
      player.combatPhase === "startup"
        ? 0.2
        : player.combatPhase === "active"
          ? 0.55
          : 0.85;
    for (let i = 0; i < 5; i++) {
      const t0 = Math.max(0, progress - 0.14 + i * 0.02);
      const t1 = Math.min(1, progress + i * 0.01);
      if (t1 <= t0) continue;
      const a0 = swingFrom + (swingTo - swingFrom) * t0;
      const a1 = swingFrom + (swingTo - swingFrom) * t1;
      ctx.strokeStyle = `rgba(210,230,250,${(0.12 + i * 0.06) * trail})`;
      ctx.lineWidth = 4.5 - i * 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, 28 + i, a0, a1, a1 < a0);
      ctx.stroke();
    }
  }

  ctx.rotate(swordAng);
  // Зүүн тийш — ирийн муруйлтыг mirror
  if (facingLeft) ctx.scale(1, -1);
  ctx.translate(4, 0);

  const bladeLen = 30;
  const curve = 2.8;
  const skyPulse = 0.55 + Math.sin(time * 3.5) * 0.08;
  const striking = trail > 0.5;

  ctx.strokeStyle = "#3a2416";
  ctx.lineWidth = 3.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-9.5, 0);
  ctx.stroke();
  ctx.strokeStyle = "#6a3e22";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.lineTo(-8.2, 0);
  ctx.stroke();
  ctx.strokeStyle = "#8a5a30";
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 3; i++) {
    const gx = -2.2 - i * 1.7;
    ctx.beginPath();
    ctx.moveTo(gx, -1.5);
    ctx.lineTo(gx - 0.35, 1.5);
    ctx.stroke();
  }

  ctx.fillStyle = "#c4a050";
  ctx.beginPath();
  ctx.arc(-10.5, 0, 2.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5820";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = "#5a5550";
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.moveTo(0.4, -4.8);
  ctx.quadraticCurveTo(1.2, 0, 0.4, 4.8);
  ctx.stroke();
  ctx.fillStyle = "#d4b060";
  ctx.beginPath();
  ctx.arc(0.5, -5, 1.15, 0, Math.PI * 2);
  ctx.arc(0.5, 5, 1.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(1.2, -1.3);
  ctx.quadraticCurveTo(bladeLen * 0.55, -1.0 - curve * 0.35, bladeLen, -curve);
  ctx.quadraticCurveTo(bladeLen * 0.7, 0.35 - curve * 0.2, 1.2, 1.4);
  ctx.closePath();
  const steel = ctx.createLinearGradient(0, -3.5, 0, 3.5);
  steel.addColorStop(0, striking ? "#e8f0f8" : "#c8d0d8");
  steel.addColorStop(0.45, "#a8b8c8");
  steel.addColorStop(1, "#6a7888");
  ctx.fillStyle = steel;
  ctx.fill();
  ctx.strokeStyle = "#4a5560";
  ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.strokeStyle = `rgba(200,230,255,${0.32 * skyPulse})`;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(2.5, -1.15);
  ctx.quadraticCurveTo(
    bladeLen * 0.55,
    -1.3 - curve * 0.3,
    bladeLen - 1,
    -curve,
  );
  ctx.stroke();

  ctx.restore();
}

/** Бултах / хурдан гүйх — салхины зураас (цагираг биш) */
export function drawDodgeWindEffect(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
): void {
  const ridingOffset = player.riding ? -14 : 0;
  const x = player.pos.x - cam.x;
  const y = player.pos.y - cam.y + ridingOffset;
  const dx = player.dodgeDirection.x;
  const dy = player.dodgeDirection.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  // Хөдөлгөөний эсрэг — ард үлдэх салхи
  const bx = -nx;
  const by = -ny;
  const px = -ny;
  const py = nx;
  const fading = player.dodgePhase === "recovery";
  const strength = fading
    ? Math.max(0, Math.min(1, player.dodgeTimer / 0.12)) * 0.35
    : 0.55;

  if (strength <= 0.02) return;

  ctx.save();
  ctx.lineCap = "round";

  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const wobble = Math.sin(time * 22 + i * 1.9) * 1.2;
    const side = (i - 2) * 2.6 + wobble;
    const startDist = 3 + t * 3;
    const streakLen = (8 + t * 12 + Math.sin(time * 24 + i) * 1.5) * strength;
    const sx = x + bx * startDist + px * side;
    const sy = y - 2 + by * startDist + py * side * 0.85;
    const ex = sx + bx * streakLen;
    const ey = sy + by * streakLen;
    const alpha = (0.08 + (1 - t) * 0.28) * strength;
    ctx.strokeStyle = `rgba(210,230,245,${alpha})`;
    ctx.lineWidth = 1 + (1 - t) * 0.9;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  // Бага зэрэг тоос
  for (let i = 0; i < 3; i++) {
    const side = (i - 1) * 3.5 + Math.sin(time * 16 + i) * 1.0;
    const dist = (6 + i * 5 + Math.sin(time * 18 + i) * 1.5) * strength;
    const dustX = x + bx * dist + px * side;
    const dustY = y + 8 + by * dist * 0.3;
    ctx.fillStyle = `rgba(190,200,210,${0.12 * strength})`;
    ctx.beginPath();
    ctx.ellipse(
      dustX,
      dustY,
      2.8 + i * 0.4,
      0.9,
      Math.atan2(by, bx),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
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
  const f = flip;

  drawShadow(ctx, x, y + 12, 20, 6);

  // Хөл
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
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
  // Туурайн хар үзүүр
  ctx.strokeStyle = "#0a0804";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x - 12 + run, y + 12);
  ctx.lineTo(x - 12 + run, y + 14);
  ctx.moveTo(x - 6 - run, y + 12);
  ctx.lineTo(x - 6 - run, y + 14);
  ctx.moveTo(x + 6 + run, y + 12);
  ctx.lineTo(x + 6 + run, y + 14);
  ctx.moveTo(x + 12 - run, y + 12);
  ctx.lineTo(x + 12 - run, y + 14);
  ctx.stroke();

  // Сүүл
  ctx.strokeStyle = "#241808";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 16 * f, y - 2);
  ctx.quadraticCurveTo(x - 22 * f, y + 4, x - 20 * f, y + 12);
  ctx.stroke();
  ctx.strokeStyle = "#3a2810";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 16 * f, y - 1);
  ctx.quadraticCurveTo(
    x - 24 * f,
    y + 6 + Math.sin(time * 5) * 1.5,
    x - 18 * f,
    y + 11,
  );
  ctx.stroke();

  // Бие — хар бор
  const body = ctx.createLinearGradient(x, y - 10, x, y + 6);
  body.addColorStop(0, "#4a3420");
  body.addColorStop(0.45, "#2e2014");
  body.addColorStop(1, "#1a120c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 17, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Гялбаа
  ctx.fillStyle = "rgba(180,150,100,0.1)";
  ctx.beginPath();
  ctx.ellipse(x + 2 * f, y - 5, 10, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // ===== Эмээл — монгол хэв (улбар шар нум, ягаан суудал, цэнхэр гөлөм) =====
  if (!gerPacked) {
    const sx = x - 1 * f;
    const sy = y - 5;

    // Доод эсгий дэвсгэр
    ctx.fillStyle = "#5a4030";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 1, 12, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Гөлөм — хар бор хажуугийн хавтан
    ctx.fillStyle = "#2a1810";
    ctx.fillRect(sx - 3 * f - 2, sy - 1, 9, 11);
    ctx.strokeStyle = "#1a1008";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 3 * f - 2, sy - 1, 9, 11);

    // Цэнхэр цагаан цэгтэй гөлөм
    ctx.fillStyle = "#2a4a7a";
    ctx.fillRect(sx - 2.5 * f - 1.5, sy - 2, 7.5, 7);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        ctx.beginPath();
        ctx.arc(
          sx - 2.5 * f + col * 2.2,
          sy - 0.5 + row * 2,
          0.55,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    // Хойд нум (улбар шар)
    const ORANGE = "#e89030";
    const ORANGE_D = "#c07020";
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.moveTo(sx - 8 * f, sy - 2);
    ctx.lineTo(sx - 10 * f, sy - 11);
    ctx.lineTo(sx - 5 * f, sy - 11);
    ctx.lineTo(sx - 4 * f, sy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ORANGE_D;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Урд нум (улбар шар, өндөр)
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.moveTo(sx + 5 * f, sy - 2);
    ctx.lineTo(sx + 4 * f, sy - 12);
    ctx.lineTo(sx + 9 * f, sy - 12);
    ctx.lineTo(sx + 9 * f, sy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ORANGE_D;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Нумны дугуй толгой
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.arc(sx + 6.5 * f, sy - 12.5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx - 7.5 * f, sy - 11.5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Ягаан суудлын дэвсгэр + цагаан цэцэг
    ctx.fillStyle = "#8a2a6a";
    ctx.fillRect(sx - 5.5, sy - 9, 11, 5);
    ctx.strokeStyle = "#c04090";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 5.5, sy - 9, 11, 5);
    // Цагаан 5 навчит цэцэг ×2
    const drawFlower = (fx: number, fy: number): void => {
      ctx.fillStyle = "#f8f0f8";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(
          fx + Math.cos(a) * 1.4,
          fy + Math.sin(a) * 1.4,
          1.1,
          0.7,
          a,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = "#e8d060";
      ctx.beginPath();
      ctx.arc(fx, fy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    };
    drawFlower(sx - 2.2, sy - 6.5);
    drawFlower(sx + 2.2, sy - 6.5);

    // Олом — хэвлийн оосор
    ctx.strokeStyle = "#4a3020";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 4 * f, sy + 3);
    ctx.quadraticCurveTo(sx, sy + 8, sx + 5 * f, sy + 4);
    ctx.stroke();
    ctx.strokeStyle = "#c8b090";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 3 * f, sy + 4);
    ctx.quadraticCurveTo(sx, sy + 7.5, sx + 4 * f, sy + 4.5);
    ctx.stroke();

    // Дөрөө — төмөр
    ctx.strokeStyle = "#3a3028";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx + 1 * f, sy - 1);
    ctx.lineTo(sx + 2 * f, sy + 8);
    ctx.stroke();
    ctx.strokeStyle = "#8a9098";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 0.2 * f, sy + 8);
    ctx.lineTo(sx + 2 * f, sy + 11);
    ctx.lineTo(sx + 3.8 * f, sy + 8);
    ctx.stroke();
    ctx.strokeStyle = "#b0b8c0";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(sx + 2 * f, sy + 8.5, 2.6, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  // Нүүдэл — хураасан гэрийг морины нуруун дээр ачна
  if (gerPacked) {
    const bx = x - 2 * f;
    const by = y - 14;
    ctx.strokeStyle = "#5a3a1e";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx - 8, by + 4);
    ctx.lineTo(x - 8, y - 2);
    ctx.moveTo(bx + 8, by + 4);
    ctx.lineTo(x + 6, y - 2);
    ctx.stroke();
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
    ctx.strokeStyle = "#1a3d7a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx, by - 14);
    ctx.quadraticCurveTo(bx - 4, by - 6, bx - 8, by - 2);
    ctx.moveTo(bx, by - 14);
    ctx.quadraticCurveTo(bx + 4, by - 6, bx + 8, by - 2);
    ctx.stroke();
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
  ctx.fillStyle = "#2a1c12";
  ctx.beginPath();
  ctx.moveTo(x + 10 * f, y - 6);
  ctx.lineTo(x + 18 * f, y - 14);
  ctx.lineTo(x + 22 * f, y - 11);
  ctx.lineTo(x + 14 * f, y - 2);
  ctx.closePath();
  ctx.fill();
  // Толгой
  ctx.beginPath();
  ctx.ellipse(x + 22 * f, y - 14.5, 5.5, 3.3, f * -0.55, 0, Math.PI * 2);
  ctx.fill();
  // Хошуу
  ctx.fillStyle = "#1e160e";
  ctx.beginPath();
  ctx.ellipse(x + 26.5 * f, y - 13.5, 2.8, 2.0, f * -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Чих
  ctx.fillStyle = "#1a120c";
  ctx.beginPath();
  ctx.moveTo(x + 19 * f, y - 16);
  ctx.lineTo(x + 18.5 * f, y - 21);
  ctx.lineTo(x + 21.5 * f, y - 17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5a4030";
  ctx.beginPath();
  ctx.moveTo(x + 19.4 * f, y - 16.5);
  ctx.lineTo(x + 19.2 * f, y - 19.5);
  ctx.lineTo(x + 20.8 * f, y - 17);
  ctx.closePath();
  ctx.fill();

  // Дэл — хүзүүний дээд ирмэг
  ctx.strokeStyle = "#0c0804";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 11 * f, y - 7);
  ctx.lineTo(x + 18 * f, y - 15);
  ctx.stroke();

  // Нүд — хазаараас өмнө
  ctx.fillStyle = "#0a0804";
  ctx.beginPath();
  ctx.arc(x + 23.5 * f, y - 15.5, 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,240,200,0.28)";
  ctx.beginPath();
  ctx.arc(x + 23.8 * f, y - 15.8, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // ===== Хазаар — нимгэн олсоор (хошуу + хацар + жолоо) =====
  const ROPE = "#d4c8b4";
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = 0.95;
  ctx.lineCap = "round";
  // Хошууны оосор — зөвхөн хошууг тойрно
  ctx.beginPath();
  ctx.ellipse(x + 26.4 * f, y - 13.3, 2.35, 1.55, f * -0.4, 0.2, Math.PI * 2 - 0.15);
  ctx.stroke();
  // Хацрын оосор — амнаас нүдний доогуур чих рүү
  ctx.beginPath();
  ctx.moveTo(x + 25.2 * f, y - 12.4);
  ctx.quadraticCurveTo(x + 22.2 * f, y - 13.0, x + 19.4 * f, y - 16.4);
  ctx.stroke();
  // Зажлуурын жижиг цагираг
  ctx.strokeStyle = "#8a929a";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(x + 25.3 * f, y - 12.15, 0.85, 0, Math.PI * 2);
  ctx.stroke();
  // Жолоо — хүзүүний доод талаар эмээл рүү
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = 0.95;
  ctx.beginPath();
  ctx.moveTo(x + 25 * f, y - 11.8);
  ctx.quadraticCurveTo(x + 15 * f, y - 0.5, x + 3 * f, y - 2.5);
  ctx.stroke();
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

/** Нумны сум / сүнсний сум */
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
  } else {
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
  }
  ctx.restore();
}

/** Түүх боломжтой чулууны овоолго */
export function drawWorldStone(
  ctx: CanvasRenderingContext2D,
  stone: WorldStone,
  cam: Camera,
): void {
  if (stone.amount <= 0) return;
  const x = stone.pos.x - cam.x;
  const y = stone.pos.y - cam.y;
  drawShadow(ctx, x, y + 2, 11, 5);

  const drawChunk = (
    ox: number,
    oy: number,
    sx: number,
    sy: number,
    c0: string,
    c1: string,
  ) => {
    const g = ctx.createLinearGradient(x + ox - sx, y + oy - sy, x + ox + sx, y + oy + sy);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + ox - sx, y + oy + sy * 0.4);
    ctx.quadraticCurveTo(x + ox - sx * 1.1, y + oy - sy * 0.6, x + ox, y + oy - sy);
    ctx.quadraticCurveTo(x + ox + sx * 1.05, y + oy - sy * 0.5, x + ox + sx, y + oy + sy * 0.3);
    ctx.quadraticCurveTo(x + ox, y + oy + sy * 0.85, x + ox - sx, y + oy + sy * 0.4);
    ctx.fill();
  };

  drawChunk(-3, 1, 7, 6, "#8a8478", "#5c564c");
  if (stone.amount >= 2) drawChunk(5, 0, 5.5, 5, "#9a9488", "#6a655c");
  if (stone.amount >= 3) drawChunk(0, -4, 4.5, 4, "#7a756c", "#4a4640");
}

/** Бөөгийн урц — шонтой конус, эсгий бүрээс, авдар · эвэр · хэц · малгай */
export function drawDismantledGer(
  ctx: CanvasRenderingContext2D,
  pos: Vector2,
  cam: Camera,
  time: number,
): void {
  const x = pos.x - cam.x;
  const y = pos.y - cam.y;
  const peakY = y - 58;
  const baseRy = 18;
  const baseRx = 42;
  const ribbonSway = Math.sin(time * 2.2);

  drawShadow(ctx, x, y + 14, 52, 16);

  // Газрын үс / арьс
  ctx.fillStyle = "rgba(70,55,40,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 48, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [fx, fy, frx, fry, col] of [
    [-14, 12, 16, 7, "#6a6258"],
    [10, 14, 18, 8, "#8a8070"],
    [-2, 16, 14, 6, "#5a5448"],
  ] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x + fx, y + fy, frx, fry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Шонууд (арын хэсэг — бүрээсний ард)
  const poleCount = 11;
  const poles: Array<{ ax: number; ay: number; bx: number; by: number }> = [];
  for (let i = 0; i < poleCount; i++) {
    const t = i / (poleCount - 1);
    const ang = Math.PI * 0.12 + t * Math.PI * 0.76;
    const bx = x + Math.cos(ang) * baseRx;
    const by = y + Math.sin(ang) * baseRy * 0.55 + 4;
    poles.push({ ax: x, ay: peakY, bx, by });
  }

  // Арын шон
  for (let i = 0; i < poles.length; i++) {
    if (i > 2 && i < poles.length - 3) continue; // урд нээлттэй
    const p = poles[i];
    ctx.strokeStyle = i % 2 === 0 ? "#6a4a28" : "#5a3a1c";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.ax, p.ay);
    ctx.lineTo(p.bx, p.by);
    ctx.stroke();
  }

  // Эсгий / арьсан бүрээс — зүүн ба баруун хажуу
  const cover = ctx.createLinearGradient(x - 40, peakY, x + 40, y + 8);
  cover.addColorStop(0, "#e8e0d0");
  cover.addColorStop(0.45, "#f2ebe0");
  cover.addColorStop(1, "#d4c8b4");

  // Зүүн хажуу
  ctx.fillStyle = cover;
  ctx.beginPath();
  ctx.moveTo(x - 4, peakY + 6);
  ctx.lineTo(x - 38, y + 2);
  ctx.quadraticCurveTo(x - 28, y + 12, x - 10, y + 10);
  ctx.lineTo(x - 2, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(120,100,70,0.35)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Баруун хажуу
  ctx.beginPath();
  ctx.moveTo(x + 4, peakY + 6);
  ctx.lineTo(x + 38, y + 2);
  ctx.quadraticCurveTo(x + 28, y + 12, x + 10, y + 10);
  ctx.lineTo(x + 2, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Дотор бараан зай
  ctx.fillStyle = "rgba(40,28,18,0.55)";
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 8);
  ctx.lineTo(x - 2, y - 10);
  ctx.lineTo(x + 2, y - 10);
  ctx.lineTo(x + 10, y + 8);
  ctx.quadraticCurveTo(x, y + 14, x - 10, y + 8);
  ctx.fill();

  // —— Авдар (дотор) ——
  {
    const cx = x;
    const cy = y - 2;
    const aw = 16;
    const ah = 12;
    ctx.fillStyle = "#6a2a1a";
    ctx.fillRect(cx - aw / 2, cy - ah, aw, ah);
    ctx.fillStyle = "#8a3a22";
    ctx.fillRect(cx - aw / 2 + 1, cy - ah + 1, aw - 2, 3);
    ctx.strokeStyle = "#c8a050";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - aw / 2 + 0.5, cy - ah + 0.5, aw - 1, ah - 1);
    // Угалз
    ctx.strokeStyle = "#d4b060";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - ah / 2 - 1);
    ctx.quadraticCurveTo(cx, cy - ah / 2 - 4, cx + 4, cy - ah / 2 - 1);
    ctx.quadraticCurveTo(cx, cy - ah / 2 + 2, cx - 4, cy - ah / 2 - 1);
    ctx.stroke();
    ctx.fillStyle = "#e8c56a";
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Урд шонууд (нээлтийн хүрээ)
  for (const i of [0, 1, poles.length - 2, poles.length - 1]) {
    const p = poles[i];
    ctx.strokeStyle = "#5a3a1c";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(p.ax, p.ay);
    ctx.lineTo(p.bx, p.by);
    ctx.stroke();
    ctx.strokeStyle = "rgba(200,180,140,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.ax - 0.8, p.ay);
    ctx.lineTo(p.bx - 0.8, p.by);
    ctx.stroke();
  }
  // Гол урд хоёр шон (хаалганы багана)
  ctx.strokeStyle = "#4a3018";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(x - 11, peakY + 4);
  ctx.lineTo(x - 14, y + 10);
  ctx.moveTo(x + 11, peakY + 4);
  ctx.lineTo(x + 14, y + 10);
  ctx.stroke();

  // Оройн уяа
  ctx.strokeStyle = "#3a2810";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, peakY + 3, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#6a4a28";
  ctx.beginPath();
  ctx.arc(x, peakY + 2, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Өнгөт тууз / хадаг — шон дээр найгана
  const ribbonColors = [
    "#3a88d0",
    "#d04040",
    "#e8c040",
    "#4aaa50",
    "#f0f0f0",
    "#c060c0",
  ];
  for (let i = 0; i < 14; i++) {
    const p = poles[1 + (i % (poles.length - 2))];
    const t = 0.25 + (i % 5) * 0.1;
    const rx = p.ax + (p.bx - p.ax) * t;
    const ry = p.ay + (p.by - p.ay) * t;
    const len = 10 + (i % 4) * 3;
    const sway = ribbonSway * (2.5 + (i % 3)) * (i % 2 === 0 ? 1 : -1);
    ctx.strokeStyle = ribbonColors[i % ribbonColors.length];
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.quadraticCurveTo(rx + sway, ry + len * 0.45, rx + sway * 0.4, ry + len);
    ctx.stroke();
  }

  // —— Бугын эвэр (хаалганы дээр) ——
  {
    const ax = x + 2;
    const ay = y - 28;
    ctx.strokeStyle = "#e8d8c0";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Бааз
    ctx.beginPath();
    ctx.moveTo(ax - 3, ay + 4);
    ctx.lineTo(ax + 3, ay + 4);
    ctx.stroke();
    // Зүүн эвэр
    ctx.beginPath();
    ctx.moveTo(ax - 1, ay + 3);
    ctx.quadraticCurveTo(ax - 10, ay - 4, ax - 14, ay - 14);
    ctx.moveTo(ax - 6, ay - 2);
    ctx.lineTo(ax - 11, ay - 8);
    ctx.moveTo(ax - 9, ay - 6);
    ctx.lineTo(ax - 7, ay - 12);
    ctx.stroke();
    // Баруун эвэр
    ctx.beginPath();
    ctx.moveTo(ax + 1, ay + 3);
    ctx.quadraticCurveTo(ax + 10, ay - 4, ax + 14, ay - 14);
    ctx.moveTo(ax + 6, ay - 2);
    ctx.lineTo(ax + 11, ay - 8);
    ctx.moveTo(ax + 9, ay - 6);
    ctx.lineTo(ax + 7, ay - 12);
    ctx.stroke();
    ctx.strokeStyle = "#c8b090";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // —— Бөөгийн хэц (бөмбөр) —— зүүн дотор
  {
    const dx = x - 18;
    const dy = y - 8;
    const hang = Math.sin(time * 1.8) * 1.2;
    ctx.strokeStyle = "#5a3a20";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(dx, dy - 14);
    ctx.lineTo(dx, dy - 4 + hang);
    ctx.stroke();
    // Бөмбөрийн бие
    ctx.fillStyle = "#8a5a30";
    ctx.beginPath();
    ctx.ellipse(dx, dy + hang, 7, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4b890";
    ctx.beginPath();
    ctx.ellipse(dx, dy + hang, 5.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a2a14";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(dx, dy + hang, 7, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Хээ
    ctx.strokeStyle = "#6a3a18";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(dx - 3, dy + hang);
    ctx.lineTo(dx + 3, dy + hang);
    ctx.moveTo(dx, dy - 3 + hang);
    ctx.lineTo(dx, dy + 3 + hang);
    ctx.stroke();
    // Толгой / цохиур
    ctx.fillStyle = "#3a2818";
    ctx.beginPath();
    ctx.arc(dx + 8, dy + 2 + hang, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a4030";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(dx + 5, dy + hang);
    ctx.lineTo(dx + 8, dy + 2 + hang);
    ctx.stroke();
  }

  // —— Бөөгийн малгай —— баруун дотор унжсан
  {
    const hx = x + 17;
    const hy = y - 16 + Math.sin(time * 1.5 + 1) * 1.0;
    ctx.strokeStyle = "#5a3a20";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 10);
    ctx.lineTo(hx, hy - 2);
    ctx.stroke();
    // Титэм / орой
    ctx.fillStyle = "#2a4a3a";
    ctx.beginPath();
    ctx.ellipse(hx, hy, 6.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a6a50";
    ctx.beginPath();
    ctx.ellipse(hx, hy - 1, 5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Өд / чимэг
    ctx.strokeStyle = "#c8a040";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(hx - 2, hy - 3);
    ctx.lineTo(hx - 5, hy - 12);
    ctx.moveTo(hx + 2, hy - 3);
    ctx.lineTo(hx + 6, hy - 11);
    ctx.stroke();
    ctx.fillStyle = "#e8c060";
    ctx.beginPath();
    ctx.arc(hx - 5, hy - 12, 1.5, 0, Math.PI * 2);
    ctx.arc(hx + 6, hy - 11, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Захны зах
    ctx.strokeStyle = "#c07040";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(hx, hy + 2, 6.5, 2, 0, 0, Math.PI);
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + i * 2.4, hy + 2);
      ctx.lineTo(hx + i * 2.4 + ribbonSway * 0.4, hy + 7);
      ctx.stroke();
    }
  }

  // Бүрээсний ирмэгийн оёдол
  ctx.strokeStyle = "rgba(100,80,50,0.4)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(x - 36, y);
  ctx.quadraticCurveTo(x - 20, y + 6, x - 12, y + 6);
  ctx.moveTo(x + 36, y);
  ctx.quadraticCurveTo(x + 20, y + 6, x + 12, y + 6);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Өвгөний халзан орой — гялбаатай */
function drawElderBaldScalp(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
  r: number,
): void {
  const shine = ctx.createRadialGradient(
    x - 1.6,
    hdy - r * 0.55,
    0.4,
    x,
    hdy - r * 0.2,
    r * 0.95,
  );
  shine.addColorStop(0, "rgba(255,236,210,0.55)");
  shine.addColorStop(0.45, "rgba(220,180,140,0.12)");
  shine.addColorStop(1, "rgba(160,110,70,0)");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.ellipse(x, hdy - r * 0.15, r * 0.92, r * 0.78, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(140,100,60,0.25)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, hdy, r * 0.98, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
}

/** Өвгөний үрчлээ — дух, нүдний булан, хацар */
function drawElderWrinkles(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
  flip: number,
): void {
  const fx = 1.6 * flip;
  ctx.strokeStyle = "rgba(110,70,40,0.45)";
  ctx.lineWidth = 0.75;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + fx - 3.6, hdy - 4.4);
  ctx.quadraticCurveTo(x + fx, hdy - 4.9, x + fx + 3.6, hdy - 4.4);
  ctx.moveTo(x + fx - 3.2, hdy - 3.5);
  ctx.quadraticCurveTo(x + fx, hdy - 3.95, x + fx + 3.2, hdy - 3.5);
  ctx.moveTo(x + fx - 2.6, hdy - 2.7);
  ctx.quadraticCurveTo(x + fx, hdy - 3.05, x + fx + 2.6, hdy - 2.7);
  ctx.stroke();
  ctx.strokeStyle = "rgba(110,70,40,0.38)";
  ctx.lineWidth = 0.65;
  for (const side of [-1, 1] as const) {
    const ex = x + fx + side * 3.3;
    ctx.beginPath();
    ctx.moveTo(ex, hdy - 0.4);
    ctx.quadraticCurveTo(ex + side * 1.6, hdy + 0.2, ex + side * 2.2, hdy + 1.1);
    ctx.moveTo(ex + side * 0.2, hdy + 0.5);
    ctx.quadraticCurveTo(ex + side * 1.4, hdy + 1.0, ex + side * 1.9, hdy + 1.7);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x + fx - 4.2, hdy + 1.0);
  ctx.quadraticCurveTo(x + fx - 4.8, hdy + 2.4, x + fx - 3.8, hdy + 3.4);
  ctx.moveTo(x + fx + 4.2, hdy + 1.0);
  ctx.quadraticCurveTo(x + fx + 4.8, hdy + 2.4, x + fx + 3.8, hdy + 3.4);
  ctx.stroke();
}

/** Өвгөний өтгөн цагаан хөмсөг */
function drawElderBrows(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
  flip: number,
): void {
  const fx = 1.6 * flip;
  for (const side of [-1, 1] as const) {
    const bx = x + fx + side * 2.35;
    const by = hdy - 2.85;
    ctx.fillStyle = ELDER_BEARD_DEEP;
    ctx.beginPath();
    ctx.ellipse(bx, by, 2.55, 1.35, side * -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ELDER_BEARD;
    ctx.beginPath();
    ctx.ellipse(bx, by - 0.15, 2.2, 1.05, side * -0.22, 0, Math.PI * 2);
    ctx.fill();
    // Сэвсгэр утаснууд
    ctx.strokeStyle = "rgba(255,255,250,0.7)";
    ctx.lineWidth = 0.7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx - side * 1.8, by - 0.3);
    ctx.quadraticCurveTo(bx - side * 0.4, by - 1.5, bx + side * 1.1, by - 0.6);
    ctx.stroke();
  }
}

/** Өвгөний саглагар цагаан сахал + хоёр салаа mustache */
function drawElderLongBeard(
  ctx: CanvasRenderingContext2D,
  x: number,
  hdy: number,
  flip: number,
  breath = 0,
): void {
  const fx = 1.1 * flip;
  const tipY = hdy + 17.5 + breath * 0.25;

  // Саглагар үндсэн сахал — олон давхарга
  ctx.fillStyle = ELDER_BEARD_DEEP;
  ctx.beginPath();
  ctx.moveTo(x + fx - 6.2, hdy + 2.4);
  ctx.quadraticCurveTo(x + fx - 10.5, hdy + 9, x + fx - 5.5, tipY - 1);
  ctx.quadraticCurveTo(x + fx - 2.2, tipY + 3.2, x + fx, tipY + 2.6);
  ctx.quadraticCurveTo(x + fx + 2.2, tipY + 3.2, x + fx + 5.5, tipY - 1);
  ctx.quadraticCurveTo(x + fx + 10.5, hdy + 9, x + fx + 6.2, hdy + 2.4);
  ctx.quadraticCurveTo(x + fx, hdy + 6.2, x + fx - 6.2, hdy + 2.4);
  ctx.fill();

  ctx.fillStyle = ELDER_BEARD;
  ctx.beginPath();
  ctx.moveTo(x + fx - 5.4, hdy + 1.9);
  ctx.quadraticCurveTo(x + fx - 9.2, hdy + 8.2, x + fx - 4.4, tipY - 2.2);
  ctx.quadraticCurveTo(x + fx - 1.6, tipY + 1.4, x + fx, tipY + 0.8);
  ctx.quadraticCurveTo(x + fx + 1.6, tipY + 1.4, x + fx + 4.4, tipY - 2.2);
  ctx.quadraticCurveTo(x + fx + 9.2, hdy + 8.2, x + fx + 5.4, hdy + 1.9);
  ctx.quadraticCurveTo(x + fx, hdy + 5.4, x + fx - 5.4, hdy + 1.9);
  ctx.fill();

  // Санта шиг сэвсгэр бөмбөлгүүд
  ctx.fillStyle = "rgba(255,255,250,0.55)";
  for (const [ox, oy, rx, ry] of [
    [-3.8, 8.5, 3.2, 3.6],
    [3.6, 8.8, 3.1, 3.5],
    [0, 11.5, 3.8, 4.2],
    [-5.2, 5.2, 2.4, 2.8],
    [5.0, 5.4, 2.4, 2.8],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x + fx + ox, hdy + oy + breath * 0.1, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Хоёр салаа mustache
  for (const side of [-1, 1] as const) {
    ctx.fillStyle = ELDER_BEARD_DEEP;
    ctx.beginPath();
    ctx.moveTo(x + fx + side * 0.4, hdy + 1.55);
    ctx.quadraticCurveTo(
      x + fx + side * 3.8,
      hdy + 1.1,
      x + fx + side * 6.2,
      hdy + 3.4,
    );
    ctx.quadraticCurveTo(
      x + fx + side * 4.6,
      hdy + 5.2,
      x + fx + side * 1.6,
      hdy + 3.6,
    );
    ctx.quadraticCurveTo(
      x + fx + side * 0.8,
      hdy + 2.6,
      x + fx + side * 0.4,
      hdy + 1.55,
    );
    ctx.fill();
    ctx.fillStyle = ELDER_BEARD;
    ctx.beginPath();
    ctx.moveTo(x + fx + side * 0.5, hdy + 1.7);
    ctx.quadraticCurveTo(
      x + fx + side * 3.4,
      hdy + 1.35,
      x + fx + side * 5.5,
      hdy + 3.2,
    );
    ctx.quadraticCurveTo(
      x + fx + side * 4.0,
      hdy + 4.5,
      x + fx + side * 1.5,
      hdy + 3.3,
    );
    ctx.quadraticCurveTo(
      x + fx + side * 0.7,
      hdy + 2.5,
      x + fx + side * 0.5,
      hdy + 1.7,
    );
    ctx.fill();
  }
}

/** Завилж суусан хөл — дээлийн доор */
function drawElderSeatedLegs(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flip: number,
): void {
  ctx.fillStyle = "#3a3a42";
  ctx.beginPath();
  ctx.ellipse(x - 7 * flip, y + 8, 8.5, 4.2, -0.25 * flip, 0, Math.PI * 2);
  ctx.ellipse(x + 7 * flip, y + 8.5, 8.5, 4.2, 0.25 * flip, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c181e";
  ctx.beginPath();
  ctx.ellipse(x - 11 * flip, y + 10.5, 4.2, 2.2, -0.15 * flip, 0, Math.PI * 2);
  ctx.ellipse(x + 10 * flip, y + 11, 4.2, 2.2, 0.2 * flip, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4e28";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x - 11 * flip, y + 10.5, 4.2, 2.2, -0.15 * flip, 0, Math.PI * 2);
  ctx.ellipse(x + 10 * flip, y + 11, 4.2, 2.2, 0.2 * flip, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStandingElder(
  ctx: CanvasRenderingContext2D,
  elder: Elder,
  x: number,
  y: number,
  time: number,
): void {
  const walking = elder.pose === "walking";
  const cycle = walking ? Math.sin(elder.walkPhase) : 0;
  const walk = cycle * 1.8;
  const bob = walking
    ? Math.abs(cycle) * 0.55
    : Math.sin(time * 1.6) * 0.35;
  const armSwing = walking ? -cycle * 2.6 : Math.sin(time * 1.4) * 0.35;
  const flip = elder.face;
  const scale = 1.14;
  const breath = Math.sin(time * 1.6) * 0.8;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);

  drawShadow(ctx, x, y + 12, 12.5, 4.5);
  drawLegsAndBoots(
    ctx,
    x,
    y - bob * 0.15,
    walk,
    flip,
    "#2a2a32",
    "#1a161c",
    "#7a4e28",
  );

  const armFlip = -flip;
  const bodyY = y - 2 - bob * 0.4;
  const shoulderY = y - 6 - bob * 0.3;
  const bodyW = 1.12;

  drawSleevedArm(
    ctx,
    x - 6.4 * armFlip * bodyW,
    shoulderY,
    x - 9.4 * armFlip * bodyW - armSwing * 0.35,
    shoulderY + 7.4 - armSwing * 0.15,
    ELDER_SLEEVE,
    ELDER_DEEL.trim,
    ELDER_FACE.skin,
  );

  drawDeelBody(ctx, x, bodyY, flip, ELDER_DEEL, bodyW);

  const hdy = y - 16 - bob;
  drawHerderHead(ctx, x, hdy, flip, ELDER_FACE, 6.5);
  drawElderBaldScalp(ctx, x, hdy, 6.5);
  drawElderWrinkles(ctx, x, hdy, flip);

  const fx = 1.6 * flip;
  const eyeY = hdy - 0.8;
  if (elder.eyeMode === "idle") {
    ctx.fillStyle = "#2a2018";
    ctx.beginPath();
    ctx.arc(x + fx - 2.2, eyeY, 0.9, 0, Math.PI * 2);
    ctx.arc(x + fx + 2.2, eyeY, 0.9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const glow =
      elder.eyeMode === "spirit"
        ? "rgba(100,180,255,0.7)"
        : "rgba(255,200,80,0.7)";
    const pupil = elder.eyeMode === "spirit" ? "#7ec8ff" : "#e8c56a";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x + fx - 2.2, eyeY, 2.4, 0, Math.PI * 2);
    ctx.arc(x + fx + 2.2, eyeY, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.arc(x + fx - 2.2, eyeY, 1.1, 0, Math.PI * 2);
    ctx.arc(x + fx + 2.2, eyeY, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  drawElderBrows(ctx, x, hdy, flip);

  drawElderLongBeard(ctx, x, hdy, flip, breath);

  const handX = x + 7.2 * armFlip * bodyW + armSwing * 0.25;
  const handY = shoulderY + 8.2 + armSwing * 0.2;
  drawSleevedArm(
    ctx,
    x + 6.2 * armFlip * bodyW,
    shoulderY,
    handX,
    handY,
    ELDER_SLEEVE,
    ELDER_DEEL.trim,
    ELDER_FACE.skin,
  );

  ctx.restore();
}

/** Өвгөн — саарал дээлтэй, халзан, урт сахалтай, завилж суусан */
export function drawElder(
  ctx: CanvasRenderingContext2D,
  elder: Elder,
  cam: Camera,
  time: number,
): void {
  const x = elder.pos.x - cam.x;
  const y = elder.pos.y - cam.y;
  const breath = Math.sin(time * 1.6) * 0.8;

  if (elder.pose === "walking" || elder.pose === "standing") {
    drawStandingElder(ctx, elder, x, y, time);
    return;
  }

  const flip = elder.face;
  const scale = 1.12;
  const armFlip = -flip;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);

  drawShadow(ctx, x, y + 11, 26, 9);
  ctx.fillStyle = "#5a3a22";
  ctx.beginPath();
  ctx.ellipse(x, y + 9, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(200,160,90,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y + 9, 20, 5.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  drawElderSeatedLegs(ctx, x, y, flip);

  const bodyY = y - 1 + breath * 0.08;
  const shoulderY = y - 5 + breath * 0.08;
  const bodyW = 1.2;

  drawSleevedArm(
    ctx,
    x - 6.8 * armFlip * bodyW,
    shoulderY,
    x - 11 * armFlip,
    y + 5.5,
    ELDER_SLEEVE,
    ELDER_DEEL.trim,
    ELDER_FACE.skin,
    x - 9.5 * armFlip,
    y + 1,
  );

  drawDeelBody(ctx, x, bodyY, flip, ELDER_DEEL, bodyW);

  const skirt = ctx.createLinearGradient(x - 16, y + 2, x + 16, y + 12);
  skirt.addColorStop(0, ELDER_DEEL.light);
  skirt.addColorStop(1, ELDER_DEEL.dark);
  ctx.fillStyle = skirt;
  ctx.beginPath();
  ctx.moveTo(x - 10 * bodyW, y + 4);
  ctx.quadraticCurveTo(x - 16, y + 8, x - 12, y + 11);
  ctx.quadraticCurveTo(x, y + 13.5, x + 12, y + 11);
  ctx.quadraticCurveTo(x + 16, y + 8, x + 10 * bodyW, y + 4);
  ctx.quadraticCurveTo(x, y + 7, x - 10 * bodyW, y + 4);
  ctx.fill();
  ctx.strokeStyle = ELDER_DEEL.trim;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 10.5);
  ctx.quadraticCurveTo(x, y + 13, x + 12, y + 10.5);
  ctx.stroke();

  const hdy = y - 14.5 + breath * 0.12;
  drawHerderHead(ctx, x, hdy, flip, ELDER_FACE, 6.55);
  drawElderBaldScalp(ctx, x, hdy, 6.55);
  drawElderWrinkles(ctx, x, hdy, flip);

  const fx = 1.6 * flip;
  const eyeY = hdy - 0.8;
  if (elder.eyeMode === "idle") {
    ctx.fillStyle = "#2a2018";
    ctx.beginPath();
    ctx.arc(x + fx - 2.2, eyeY, 0.9, 0, Math.PI * 2);
    ctx.arc(x + fx + 2.2, eyeY, 0.9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const glow =
      elder.eyeMode === "spirit"
        ? `rgba(100,180,255,${0.55 + 0.25 * Math.sin(time * 2.1)})`
        : `rgba(255,200,80,${0.55 + 0.25 * Math.sin(time * 2.1)})`;
    const pupil = elder.eyeMode === "spirit" ? "#7ec8ff" : "#e8c56a";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x + fx - 2.2, eyeY, 2.6, 0, Math.PI * 2);
    ctx.arc(x + fx + 2.2, eyeY, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.arc(x + fx - 2.2, eyeY, 1.15, 0, Math.PI * 2);
    ctx.arc(x + fx + 2.2, eyeY, 1.15, 0, Math.PI * 2);
    ctx.fill();
  }

  drawElderBrows(ctx, x, hdy, flip);

  drawElderLongBeard(ctx, x, hdy, flip, breath);

  drawSleevedArm(
    ctx,
    x + 6.4 * armFlip * bodyW,
    shoulderY,
    x + 10.5 * armFlip,
    y + 6,
    ELDER_SLEEVE,
    ELDER_DEEL.trim,
    ELDER_FACE.skin,
    x + 9 * armFlip,
    y + 1.5,
  );

  ctx.restore();
}

/** Аав / ээж — дээл, гутал, нүүр, үсний нарийвчилсан дүр */
export function drawParentNpc(
  ctx: CanvasRenderingContext2D,
  parent: ParentNpc,
  cam: Camera,
  time: number,
): void {
  const x = parent.pos.x - cam.x;
  const y = parent.pos.y - cam.y;
  const flip = parent.face;
  const walkCycle = parent.moving ? Math.sin(parent.walkPhase) : 0;
  const walk = walkCycle * 1.8;
  const bob = parent.moving
    ? Math.abs(walkCycle) * 0.55
    : Math.sin(time * 1.6 + (parent.role === "father" ? 0 : 1.3)) * 0.35;
  const working = parent.workPulse > 0;
  const isFather = parent.role === "father";
  const punching = isFather && parent.attackAnim > 0;
  const deel = isFather ? FATHER_DEEL : MOTHER_DEEL;
  const face = isFather ? FATHER_FACE : MOTHER_FACE;
  const sleeve = isFather ? FATHER_SLEEVE : MOTHER_SLEEVE;
  const bodyW = isFather ? 1.1 : 1.0;
  const headR = isFather ? 6.35 : 6.05;
  // Хүүгээс үл ялиг том
  const parentScale = isFather ? 1.16 : 1.12;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(parentScale, parentScale);
  ctx.translate(-x, -y);

  drawShadow(ctx, x, y + 12, isFather ? 12.5 : 11, 4.5);
  drawLegsAndBoots(
    ctx,
    x,
    y - bob * 0.15,
    walk,
    flip,
    isFather ? "#2a2a32" : "#353038",
    isFather ? "#1a161c" : "#221c24",
    isFather ? "#7a4e28" : "#9a6434",
  );

  const armSwing = parent.moving
    ? -walkCycle * 2.6
    : working
      ? -Math.sin(time * 10) * 3.2
      : -Math.sin(time * 1.4) * 0.5;
  const armFlip = -flip;
  const bodyY = y - 2 - bob * 0.4 - (isFather ? 0.6 : 0);
  const shoulderY = y - 6 - bob * 0.3 - (isFather ? 0.5 : 0);

  drawSleevedArm(
    ctx,
    x - 6.4 * armFlip * bodyW,
    shoulderY,
    x - 9.4 * armFlip * bodyW - armSwing * 0.35,
    shoulderY + 7.4 - armSwing * 0.15,
    sleeve,
    deel.trim,
    face.skin,
  );

  drawDeelBody(ctx, x, bodyY, flip, deel, bodyW);

  const hdy = y - 15.4 - bob - (isFather ? 0.8 : 0);
  // Орой + унжсан гэзэг — толгой/нүүрний АРД
  if (isFather) {
    drawFatherHairScalp(ctx, x, hdy);
    drawFatherBraids(ctx, x, hdy, time, parent.moving);
  } else {
    drawMotherHairScalp(ctx, x, hdy);
    drawMotherBraids(ctx, x, hdy, time, parent.moving);
  }

  drawHerderHead(ctx, x, hdy, flip, face, headR);

  // Нүд, хөмсөг — хүүгийнхтэй адил; хамар зурахгүй
  const fx = 1.6 * flip;
  ctx.fillStyle = "#2a2018";
  ctx.beginPath();
  ctx.arc(x + fx - 2.2, hdy - 0.8, 0.9, 0, Math.PI * 2);
  ctx.arc(x + fx + 2.2, hdy - 0.8, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2c1c";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x + fx - 3.4, hdy - 2.6);
  ctx.lineTo(x + fx - 1, hdy - 2.9);
  ctx.moveTo(x + fx + 1, hdy - 2.9);
  ctx.lineTo(x + fx + 3.4, hdy - 2.6);
  ctx.stroke();

  // Ам
  if (isFather) {
    ctx.strokeStyle = "#8a5838";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.beginPath();
    const mx = x + fx * 0.6;
    const my = hdy + 2.2;
    ctx.moveTo(mx - 1.4, my);
    ctx.lineTo(mx + 1.4, my);
    ctx.stroke();
  } else {
    ctx.fillStyle = face.lip ?? "#c06068";
    ctx.beginPath();
    ctx.ellipse(x + fx * 0.6, hdy + 2.4, 1.25, 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = `rgba(214,110,80,${isFather ? 0.22 : 0.35})`;
  ctx.beginPath();
  ctx.arc(x + fx - 3.6, hdy + 1.4, 1.4, 0, Math.PI * 2);
  ctx.arc(x + fx + 3.6, hdy + 1.4, 1.4, 0, Math.PI * 2);
  ctx.fill();

  if (isFather) {
    drawFatherBeard(ctx, x, hdy, flip);
    drawFatherHairFront(ctx, x, hdy, flip);
  } else {
    drawMotherHairFront(ctx, x, hdy, flip);
  }

  const handX = x + 7.2 * armFlip * bodyW + armSwing * 0.25;
  const handY = shoulderY + 8.2 + armSwing * 0.2;

  if (punching) {
    const p = 1 - parent.attackAnim / 0.28;
    const ext = Math.sin(Math.min(1, Math.max(0, p)) * Math.PI);
    const ang = Math.atan2(parent.facing.y, parent.facing.x || flip);
    const reach = 7 + ext * 14;
    const fx2 = x + 3 * flip + Math.cos(ang) * reach;
    const fy2 = shoulderY + 2 + Math.sin(ang) * reach * 0.55;
    const elbowX = x + 4 * flip + Math.cos(ang) * reach * 0.45;
    const elbowY = shoulderY + 5 - ext * 2 + Math.sin(ang) * reach * 0.35;
    drawSleevedArm(
      ctx,
      x + 4 * flip * bodyW,
      shoulderY,
      fx2,
      fy2,
      sleeve,
      deel.trim,
      face.skin,
      elbowX,
      elbowY,
    );
    ctx.fillStyle = face.skin;
    ctx.beginPath();
    ctx.arc(fx2, fy2, 2.7, 0, Math.PI * 2);
    ctx.fill();
    if (ext > 0.45) {
      ctx.strokeStyle = `rgba(255,240,200,${(ext - 0.45) * 1.5})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const off of [-3.5, 0, 3.5]) {
        const px2 = fx2 - Math.cos(ang) * 8 - Math.sin(ang) * off;
        const py2 = fy2 - Math.sin(ang) * 8 + Math.cos(ang) * off;
        ctx.moveTo(px2, py2);
        ctx.lineTo(px2 - Math.cos(ang) * 5, py2 - Math.sin(ang) * 5);
      }
      ctx.stroke();
    }
  } else {
    drawSleevedArm(
      ctx,
      x + 6.2 * armFlip * bodyW,
      shoulderY,
      handX,
      handY,
      sleeve,
      deel.trim,
      face.skin,
    );

    // Ажиллаж байхад гарны багаж
    if (working) {
      ctx.save();
      ctx.translate(handX, handY);
      ctx.rotate(armSwing * 0.08);
      if (isFather) {
        ctx.strokeStyle = "#6a4a28";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-1, 1);
        ctx.lineTo(5, -7);
        ctx.stroke();
        ctx.fillStyle = "#c8c4bc";
        ctx.beginPath();
        ctx.moveTo(4.2, -8.2);
        ctx.lineTo(7.4, -5.6);
        ctx.lineTo(5.6, -4.4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = "#8a5a30";
        ctx.beginPath();
        ctx.moveTo(-2.2, -1);
        ctx.lineTo(-2.8, 4);
        ctx.lineTo(2.8, 4);
        ctx.lineTo(2.2, -1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#e8c56a";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  ctx.textAlign = "center";
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.lineWidth = 3;
  const label = isFather ? "Аав" : "Ээж";
  ctx.strokeText(label, x, y - (isFather ? 32 : 30));
  ctx.fillStyle = isFather ? "#c8d8f0" : "#f0c8d0";
  ctx.fillText(label, x, y - (isFather ? 32 : 30));
  ctx.textAlign = "left";
  ctx.restore();
}

/**
 * Загасны уурга — байнга харагдана; эрэг дээр уургалахад шугам + дэнс.
 * casting: эрэг дээр уургалаж байгаа эсэх
 */
export function drawFishingRod(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
  casting: boolean,
  bobber: Vector2 | null,
): void {
  if (!player.gear.fishingRod) return;
  const x = player.pos.x - cam.x;
  const y = player.pos.y - cam.y + (player.riding ? -14 : 0);
  const flip = player.facing.x < 0 ? -1 : 1;

  if (!casting || !bobber) {
    // Нуруун дээр / хажууд — богино уурга
    const bx = x - 9 * flip;
    const by = y - 10;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate((-0.55 - flip * 0.15) * flip);
    ctx.strokeStyle = "#6b4420";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, -22);
    ctx.stroke();
    ctx.strokeStyle = "#8a5a28";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(6 * flip, -28, 10 * flip, -26);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Уургалаж байгаа: гар → уурга → шугам → дэнс
  const bx = bobber.x - cam.x;
  const by = bobber.y - cam.y;
  const handX = x + 8 * flip;
  const handY = y - 6;
  const tipX = handX + (bx - handX) * 0.22;
  const tipY = handY - 18 + Math.sin(time * 2.2) * 1.2;

  ctx.save();
  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // Уурганы үзүүр (гох)
  ctx.strokeStyle = "#8a6028";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX + 5 * flip, tipY - 4);
  ctx.stroke();

  // Шугам
  const sag = 10 + Math.sin(time * 3 + player.pos.x * 0.01) * 3;
  ctx.strokeStyle = "rgba(230,235,240,0.75)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(tipX + 5 * flip, tipY - 4);
  ctx.quadraticCurveTo(
    (tipX + bx) * 0.5,
    Math.max(tipY, by) + sag,
    bx,
    by,
  );
  ctx.stroke();

  // Дэнс
  const bob = Math.sin(time * 4.5) * 1.5;
  ctx.fillStyle = "#c04040";
  ctx.beginPath();
  ctx.ellipse(bx, by + bob, 3.2, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8e8e8";
  ctx.beginPath();
  ctx.ellipse(bx, by + bob - 1.5, 2.2, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Жижиг долгион
  ctx.strokeStyle = "rgba(180,220,255,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(bx, by + 3, 7 + Math.sin(time * 5) * 1.5, 2.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Зэрлэг морины уурга — шидэх / хүзүүнд ороод татах */
export function drawHorseLasso(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
  lasso: {
    phase: "throwing" | "pulling";
    throwT: number;
    from: { x: number; y: number };
    aim: { x: number; y: number };
  },
): void {
  if (!player.gear.urga) return;
  const x = player.pos.x - cam.x;
  const y = player.pos.y - cam.y + (player.riding ? -14 : 0);
  const flip = player.facing.x < 0 ? -1 : 1;
  const handX = x + 8 * flip;
  const handY = y - 6;
  const tipX = handX + 14 * flip;
  const tipY = handY - 16 + Math.sin(time * 3) * 1.2;

  // Уурганы бариул
  ctx.save();
  ctx.strokeStyle = "#5a3a18";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const t =
    lasso.phase === "throwing" ? Math.min(1, Math.max(0, lasso.throwT)) : 1;
  const endX =
    lasso.phase === "throwing"
      ? lasso.from.x + (lasso.aim.x - lasso.from.x) * t - cam.x
      : lasso.aim.x - cam.x;
  const endY =
    lasso.phase === "throwing"
      ? lasso.from.y +
        (lasso.aim.y - lasso.from.y) * t -
        cam.y -
        Math.sin(t * Math.PI) * 22
      : lasso.aim.y - cam.y;

  const sag =
    lasso.phase === "pulling"
      ? 8 + Math.sin(time * 10) * 3
      : 6 + (1 - t) * 18;
  ctx.strokeStyle = "rgba(220,200,150,0.9)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.quadraticCurveTo(
    (tipX + endX) * 0.5,
    Math.max(tipY, endY) + sag,
    endX,
    endY,
  );
  ctx.stroke();

  // Гох / хүзүүний цагираг
  const loopR = lasso.phase === "pulling" ? 7 + Math.sin(time * 14) * 1.2 : 9;
  ctx.strokeStyle = "#d8c070";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(endX, endY, loopR, loopR * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (lasso.phase === "pulling") {
    ctx.strokeStyle = "rgba(255,220,120,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(endX, endY, loopR + 2.5, loopR * 0.55 + 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
