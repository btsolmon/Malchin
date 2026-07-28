import {
  BerryBush,
  Camera,
  Campfire,
  Dog,
  type Fence,
  Player,
  Projectile,
  Sheep,
  Thief,
  Tree,
  type Vector2,
  Wolf,
} from "../types";
import { clamp, lerp, roundRectPath } from "../utils";

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
): void {
  drawShadow(ctx, x, y + 26, 52, 14);

  // Их бие (цагаан эсгий)
  const bodyG = ctx.createLinearGradient(x - 46, y, x + 46, y);
  bodyG.addColorStop(0, "#cfc8b8");
  bodyG.addColorStop(0.5, "#f2ecdc");
  bodyG.addColorStop(1, "#d8d0c0");
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.moveTo(x - 46, y + 24);
  ctx.lineTo(x - 46, y - 4);
  ctx.quadraticCurveTo(x, y - 12, x + 46, y - 4);
  ctx.lineTo(x + 46, y + 24);
  ctx.closePath();
  ctx.fill();

  // Дээвэр
  const roofG = ctx.createLinearGradient(x, y - 40, x, y - 2);
  roofG.addColorStop(0, "#f8f2e2");
  roofG.addColorStop(1, "#d0c8b4");
  ctx.fillStyle = roofG;
  ctx.beginPath();
  ctx.moveTo(x - 50, y - 2);
  ctx.quadraticCurveTo(x, y - 46, x + 50, y - 2);
  ctx.closePath();
  ctx.fill();

  // Тооно
  ctx.fillStyle = "#b8845a";
  ctx.beginPath();
  ctx.arc(x, y - 32, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a5230";
  ctx.beginPath();
  ctx.arc(x, y - 32, 3, 0, Math.PI * 2);
  ctx.fill();

  // Бүслүүр оосор
  ctx.strokeStyle = "rgba(160,110,60,0.5)";
  ctx.lineWidth = 2;
  for (const oy of [4, 12]) {
    ctx.beginPath();
    ctx.moveTo(x - 46, y + oy);
    ctx.quadraticCurveTo(x, y + oy - 5, x + 46, y + oy);
    ctx.stroke();
  }

  // Хаалга
  ctx.fillStyle = "#a04820";
  ctx.fillRect(x - 9, y + 2, 18, 22);
  ctx.strokeStyle = "#5a2810";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 9, y + 2, 18, 22);
  ctx.strokeStyle = "#c86830";
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x, y + 24);
  ctx.stroke();
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

  drawShadow(ctx, x, y + 8, 11, 4);

  // Хөл
  ctx.strokeStyle = "#8a7f70";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 3);
  ctx.lineTo(x - 6 + walk * 0.4, y + 9);
  ctx.moveTo(x + 5, y + 3);
  ctx.lineTo(x + 5 - walk * 0.4, y + 9);
  ctx.stroke();

  // Ноосон бие
  const wool = ctx.createRadialGradient(x - 3, y - 4, 2, x, y, 13);
  wool.addColorStop(0, "#fbf7ee");
  wool.addColorStop(1, "#ddd4c4");
  ctx.fillStyle = wool;
  ctx.beginPath();
  ctx.ellipse(x, y, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ноосны овгор
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
  // Чих
  ctx.fillStyle = "#b5a892";
  ctx.beginPath();
  ctx.ellipse(hx - 3 * flip, hy - 3, 2.6, 1.4, -0.5 * flip, 0, Math.PI * 2);
  ctx.fill();
  // Нүд
  ctx.fillStyle = "#332a20";
  ctx.beginPath();
  ctx.arc(hx + 1.8 * flip, hy - 1, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Хазуулсны анивчилт
  if (sheep.flash > 0) {
    ctx.fillStyle = `rgba(255,90,90,${Math.min(1, sheep.flash * 4)})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Хазуулсан хонины амь
  if (sheep.hp < 3) {
    const bw = 18;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - 18, bw, 3.5, 1.5);
    ctx.fill();
    ctx.fillStyle = "#8fd08f";
    roundRectPath(ctx, x - bw / 2, y - 18, (bw * sheep.hp) / 3, 3.5, 1.5);
    ctx.fill();
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

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
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
    drawHorse(ctx, x, y + 2, flip, time, player.moving);
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

  // Толгой
  const hdy = y - 15 - bob;
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

  // Монгол малгай — шовгор оройтой, эргэсэн хүрээтэй лоовууз
  const my2 = hdy - 4;
  // Шовгор орой
  ctx.fillStyle = "#a82424";
  ctx.beginPath();
  ctx.moveTo(x - 6, my2 - 1);
  ctx.quadraticCurveTo(x - 3, my2 - 7.5, x, my2 - 10);
  ctx.quadraticCurveTo(x + 3, my2 - 7.5, x + 6, my2 - 1);
  ctx.closePath();
  ctx.fill();
  // Оройн алтан шугам (жанжин малгайн хээ)
  ctx.strokeStyle = "#e8c56a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 3.5, my2 - 3);
  ctx.quadraticCurveTo(x, my2 - 6.5, x + 3.5, my2 - 3);
  ctx.stroke();
  // Эргэсэн үслэг хүрээ
  ctx.fillStyle = "#5a3c22";
  roundRectPath(ctx, x - 7, my2 - 2, 14, 4.2, 2);
  ctx.fill();
  ctx.fillStyle = "#7a5636";
  roundRectPath(ctx, x - 7, my2 - 2, 14, 1.8, 1);
  ctx.fill();
  // Оройн улаан залаа + алтан товгор
  ctx.fillStyle = "#e8c56a";
  ctx.beginPath();
  ctx.arc(x, my2 - 10.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d03030";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, my2 - 9.5);
  ctx.quadraticCurveTo(
    x - 3 * flip,
    my2 - 7,
    x - 4 * flip,
    my2 - 3.5 + Math.sin(time * 6) * 0.6,
  );
  ctx.stroke();

  // Урд гар — зэвсэг барина эсвэл дүүжинэ
  const handX = x + 7 * armFlip + armSwing * 0.25;
  const handY = shoulderY + 8 + armSwing * 0.2;
  ctx.strokeStyle = "#d8b088";
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 6 * armFlip, shoulderY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  const ang = Math.atan2(player.facing.y, player.facing.x);
  const hasGun = player.gear.gun;
  const hasBow = player.gear.bow && !hasGun;
  const swingingStaff = player.attackMelee && player.attackAnim > 0;

  if (swingingStaff) {
    // Таяг — J цохилт (нум/буутай байсан ч харагдана)
    const p = 1 - player.attackAnim / 0.22;
    const staffAng = ang + lerp(-1.3, 1.3, p);
    const sx = x + Math.cos(staffAng + 0.5) * 8;
    const sy = y - 4 + Math.sin(staffAng + 0.5) * 6;
    ctx.strokeStyle = "#9a6a34";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(staffAng) * 26, sy + Math.sin(staffAng) * 26);
    ctx.stroke();
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.arc(
      sx + Math.cos(staffAng) * 26,
      sy + Math.sin(staffAng) * 26,
      2.6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = `rgba(255,240,180,${0.7 * (1 - p)})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - 2, 38, ang - 1.1 + p * 1.4, ang - 0.5 + p * 1.6);
    ctx.stroke();
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
  ctx.globalAlpha = 1;
}

/** Морь — уналгын үед малчны доор зурагдана */
export function drawHorse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flip: number,
  time: number,
  moving: boolean,
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

/** Нум сум / бууны сум */
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
  if (p.kind === "arrow") {
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
