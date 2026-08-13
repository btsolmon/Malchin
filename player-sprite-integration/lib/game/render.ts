// Хүн 5 — рендэр: газар нутаг, дүрүүд, гэрийн дотор, гэрэлтүүлэг

import {
  COLORS,
  PASTURE_RADIUS,
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  type BerryBush,
  type Camera,
  type Campfire,
  type Dog,
  type GameState,
  type Player,
  type Projectile,
  type Sheep,
  type Thief,
  type Tree,
  type Vector2,
  type Wolf,
  type World,
} from "./types";
import {
  clamp,
  dist,
  lerp,
  pastureCenter,
  randRange,
  roundRectPath,
} from "./utils";
import {
  SHOP_ITEMS,
  drawHud,
  drawMinimap,
  drawShop,
  drawThreatArrows,
  gerLayout,
  gerProximity,
  overButton,
} from "./ui";
import {
  BEAR_PARRY_WARNING_TIME,
  WOLF_PARRY_WARNING_TIME,
} from "./enemies";


type WolfLeapPhase =
  | "chasing"
  | "windup"
  | "leaping"
  | "grabbing"
  | "recovery"
  | "stunned";

type WolfAttackKind = "leap" | "claw" | "bearGrab" | "bearSwipe";

type WolfWithLeap = Wolf & {
  attackPhase: WolfLeapPhase;
  attackKind: WolfAttackKind;
  attackTimer: number;
  attackDirection: Vector2;
  attackHitDone: boolean;
};

function getWolfWithLeap(wolf: Wolf): WolfWithLeap {
  return wolf as WolfWithLeap;
}

export function renderTerrain(winter: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext("2d")!;

  // Суурь градиент
  const base = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  if (winter) {
    base.addColorStop(0, "#c2cfc0");
    base.addColorStop(1, "#a8bba6");
  } else {
    base.addColorStop(0, "#4b7d44");
    base.addColorStop(1, "#3b6636");
  }
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Өнгөний том толбо (нуга)
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    const r = randRange(60, 220);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (winter) {
      g.addColorStop(0, "rgba(255,255,255,0.16)");
      g.addColorStop(1, "rgba(255,255,255,0)");
    } else {
      const light = Math.random() < 0.5;
      g.addColorStop(
        0,
        light ? "rgba(120,170,90,0.18)" : "rgba(40,80,40,0.15)",
      );
      g.addColorStop(1, "rgba(0,0,0,0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Өвсний ширхэг
  ctx.lineWidth = 1;
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    const h = randRange(3, 7);
    const lean = randRange(-2, 2);
    ctx.strokeStyle = winter
      ? `rgba(${200 + Math.floor(Math.random() * 40)},${210 + Math.floor(Math.random() * 30)},205,0.5)`
      : `rgba(${40 + Math.floor(Math.random() * 40)},${95 + Math.floor(Math.random() * 50)},${40 + Math.floor(Math.random() * 25)},0.6)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - h);
    ctx.stroke();
  }

  // Чулуунууд
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    const r = randRange(3, 9);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(x + 1.5, y + 1.5, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = winter ? "#9aa4a0" : "#8a8f88";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.25, r * 0.45, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Цэцэг (өвөлд байхгүй)
  if (!winter) {
    const petals = ["#f5f0e0", "#f0d060", "#e890b0", "#c8d8f8"];
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      const c = petals[Math.floor(Math.random() * petals.length)];
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

  // Гэрийн шороон талбай
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const padG = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
  padG.addColorStop(0, winter ? "#8a7a60" : "#6f5742");
  padG.addColorStop(1, winter ? "rgba(138,122,96,0)" : "rgba(111,87,66,0)");
  ctx.fillStyle = padG;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  // Шороон дээрх толбо
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 90;
    ctx.fillStyle = "rgba(60,45,32,0.25)";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, randRange(2, 5), 0, Math.PI * 2);
    ctx.fill();
  }

  // Бэлчээрийн хилийн тойрог (бүдэг)
  ctx.strokeStyle = winter
    ? "rgba(140,120,80,0.25)"
    : "rgba(232,197,106,0.18)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.arc(cx, cy, PASTURE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  return canvas;
}

// ---------------------------------------------------------------------------
// Entity rendering
// ---------------------------------------------------------------------------


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

export function drawGer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
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
    const g = ctx.createRadialGradient(x + ox - 2, y + oy - 3, 1, x + ox, y + oy, r);
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

const WOLF_WINDUP_VISUAL_DURATION = 0.45;
const WOLF_LEAP_VISUAL_DURATION = 0.22;
const WOLF_RECOVERY_VISUAL_DURATION = 0.55;
const WOLF_CLAW_WINDUP_VISUAL_DURATION = 0.32;
const WOLF_CLAW_ACTIVE_VISUAL_DURATION = 0.18;
const WOLF_CLAW_RECOVERY_VISUAL_DURATION = 0.42;
const PLAYER_RADIUS_FOR_ENEMY_REACH = 14;
const WOLF_CLAW_VISUAL_EXTRA = 34;
const WOLF_LEAP_VISUAL_EXTRA = 38;

export function drawWolf(
  ctx: CanvasRenderingContext2D,
  wolf: Wolf,
  cam: Camera,
  time: number,
): void {
  const x = wolf.pos.x - cam.x;
  const y = wolf.pos.y - cam.y;
  const flip = wolf.face;
  const s = wolf.scale;
  const leapWolf = getWolfWithLeap(wolf);

  const clawAttack = leapWolf.attackKind === "claw";
  const windupDuration = clawAttack
    ? WOLF_CLAW_WINDUP_VISUAL_DURATION
    : WOLF_WINDUP_VISUAL_DURATION;
  const activeDuration = clawAttack
    ? WOLF_CLAW_ACTIVE_VISUAL_DURATION
    : WOLF_LEAP_VISUAL_DURATION;
  const recoveryDuration = clawAttack
    ? WOLF_CLAW_RECOVERY_VISUAL_DURATION
    : WOLF_RECOVERY_VISUAL_DURATION;

  const windupProgress =
    leapWolf.attackPhase === "windup"
      ? clamp(1 - leapWolf.attackTimer / windupDuration, 0, 1)
      : 0;

  const leapProgress =
    leapWolf.attackPhase === "leaping"
      ? clamp(1 - leapWolf.attackTimer / activeDuration, 0, 1)
      : 0;

  const recoveryProgress =
    leapWolf.attackPhase === "recovery"
      ? clamp(1 - leapWolf.attackTimer / recoveryDuration, 0, 1)
      : 0;

  const parryReady =
    leapWolf.attackPhase === "leaping" ||
    (leapWolf.attackPhase === "windup" &&
      leapWolf.attackTimer <= WOLF_PARRY_WARNING_TIME);

  const stunned = leapWolf.attackPhase === "stunned";
  const running = leapWolf.attackPhase === "chasing";
  const run = running ? Math.sin(time * 14 + wolf.id) * 3 : 0;

  const leapLift =
    leapWolf.attackPhase === "leaping" && !clawAttack
      ? Math.sin(leapProgress * Math.PI) * 8 * s
      : 0;

  const crouch =
    leapWolf.attackPhase === "windup"
      ? 4 * windupProgress
      : leapWolf.attackPhase === "recovery"
        ? 3 * (1 - recoveryProgress)
        : stunned
          ? 4
          : 0;

  const shadowScale =
    leapWolf.attackPhase === "leaping" && !clawAttack
      ? 0.7 + Math.abs(leapProgress - 0.5) * 0.25
      : 1;

  drawShadow(
    ctx,
    x,
    y + 9 * s,
    15 * s * shadowScale,
    5 * s * shadowScale,
  );

  // Шар = эрт, улаан = parry хийхэд тохиромжтой.
  if (
    leapWolf.attackPhase === "windup" ||
    leapWolf.attackPhase === "leaping"
  ) {
    const pulse = 0.6 + Math.sin(time * 20) * 0.18;
    const warningColor = parryReady
      ? `rgba(255,70,60,${0.72 + pulse * 0.2})`
      : `rgba(255,205,70,${0.58 + pulse * 0.18})`;

    ctx.strokeStyle = warningColor;
    ctx.lineWidth = parryReady ? 3 : 2;
    ctx.beginPath();
    ctx.arc(
      x,
      y + 5 * s,
      (clawAttack ? 15 + windupProgress * 3 : 17 + windupProgress * 5) * s,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    const warningReach =
      wolf.radius * s +
      PLAYER_RADIUS_FOR_ENEMY_REACH +
      (clawAttack
        ? WOLF_CLAW_VISUAL_EXTRA
        : WOLF_LEAP_VISUAL_EXTRA);

    ctx.strokeStyle = warningColor;
    ctx.lineWidth = parryReady ? 2.6 : 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + leapWolf.attackDirection.x * warningReach,
      y + leapWolf.attackDirection.y * warningReach,
    );
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(x, y + crouch * s - leapLift);

  const stretchX =
    leapWolf.attackPhase === "leaping"
      ? clawAttack
        ? 1.06
        : 1.18
      : leapWolf.attackPhase === "windup"
        ? clawAttack
          ? 1.02
          : 1.06
        : stunned
          ? 1.08
          : 1;

  const stretchY =
    leapWolf.attackPhase === "windup"
      ? clawAttack
        ? 0.92
        : 0.82
      : leapWolf.attackPhase === "leaping"
        ? clawAttack
          ? 0.96
          : 0.9
        : stunned
          ? 0.82
          : 1;

  ctx.scale(s * stretchX, s * stretchY);

  ctx.strokeStyle = "#3f3f42";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();

  if (leapWolf.attackPhase === "leaping" && !clawAttack) {
    ctx.moveTo(-9, 3);
    ctx.lineTo(-15 * flip, 8);
    ctx.moveTo(-3, 4);
    ctx.lineTo(-10 * flip, 9);
    ctx.moveTo(4, 4);
    ctx.lineTo(-3 * flip, 9);
    ctx.moveTo(9, 3);
    ctx.lineTo(2 * flip, 8);
  } else if (
    leapWolf.attackPhase === "windup" ||
    leapWolf.attackPhase === "recovery" ||
    stunned
  ) {
    ctx.moveTo(-9, 4);
    ctx.lineTo(-11, 8);
    ctx.lineTo(-7, 10);
    ctx.moveTo(-3, 5);
    ctx.lineTo(-5, 9);
    ctx.lineTo(-1, 10);
    ctx.moveTo(4, 5);
    ctx.lineTo(2, 9);
    ctx.lineTo(6, 10);
    ctx.moveTo(9, 4);
    ctx.lineTo(7, 8);
    ctx.lineTo(11, 10);
  } else {
    ctx.moveTo(-9, 4);
    ctx.lineTo(-9 + run, 10);
    ctx.moveTo(-3, 5);
    ctx.lineTo(-3 - run, 10);
    ctx.moveTo(4, 5);
    ctx.lineTo(4 + run, 10);
    ctx.moveTo(9, 4);
    ctx.lineTo(9 - run, 10);
  }
  ctx.stroke();

  ctx.strokeStyle = "#4a4a4e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-13 * flip, 0);
  ctx.quadraticCurveTo(
    -19 * flip,
    leapWolf.attackPhase === "windup" || stunned
      ? 2
      : -3 + Math.sin(time * 6) * 2,
    -22 * flip,
    leapWolf.attackPhase === "windup" || stunned ? 1 : -7,
  );
  ctx.stroke();

  const body = ctx.createLinearGradient(0, -8, 0, 6);
  body.addColorStop(0, "#6a6a70");
  body.addColorStop(1, "#45454a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Oirhon attack: urd sarvuugaa orgood player ruu savchih animation.
  if (
    clawAttack &&
    (leapWolf.attackPhase === "windup" ||
      leapWolf.attackPhase === "leaping" ||
      leapWolf.attackPhase === "recovery")
  ) {
    const swingProgress =
      leapWolf.attackPhase === "windup"
        ? windupProgress * 0.35
        : leapWolf.attackPhase === "leaping"
          ? 0.35 + leapProgress * 0.5
          : 0.85 + recoveryProgress * 0.15;
    const swing = Math.sin(clamp(swingProgress, 0, 1) * Math.PI);

    const shoulderX = 7 * flip;
    const shoulderY = -1;
    const pawX = (13 + swing * 10) * flip;
    const pawY = -7 + swing * 11;

    ctx.strokeStyle = "#4b4b50";
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(pawX, pawY);
    ctx.stroke();

    ctx.fillStyle = "#3f3f44";
    ctx.beginPath();
    ctx.ellipse(pawX, pawY, 3.8, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (leapWolf.attackPhase === "leaping") {
      const slashAlpha = Math.sin(leapProgress * Math.PI);
      ctx.strokeStyle = `rgba(245,235,215,${0.75 * slashAlpha})`;
      ctx.lineWidth = 1.8;

      for (let i = 0; i < 3; i++) {
        const offset = (i - 1) * 3;
        ctx.beginPath();
        ctx.moveTo(16 * flip, -9 + offset);
        ctx.lineTo(38 * flip, 1 + offset);
        ctx.stroke();
      }
    }
  }

  const headDrop =
    leapWolf.attackPhase === "windup" || stunned ? 2.5 : 0;
  const hx = 12 * flip;

  ctx.fillStyle = "#5a5a60";
  ctx.beginPath();
  ctx.ellipse(hx, -3 + headDrop, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4a4a4e";
  ctx.beginPath();
  ctx.ellipse(
    hx + 5 * flip,
    -1.5 + headDrop,
    4,
    2.6,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.fillStyle = "#1a1a1c";
  ctx.beginPath();
  ctx.arc(
    hx + 8.5 * flip,
    -1.8 + headDrop,
    1.4,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.fillStyle = "#3f3f44";
  ctx.beginPath();
  ctx.moveTo(hx - 3 * flip, -7 + headDrop);
  ctx.lineTo(hx - 1 * flip, -13 + headDrop);
  ctx.lineTo(hx + 2 * flip, -8 + headDrop);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(hx + 1 * flip, -8 + headDrop);
  ctx.lineTo(hx + 4 * flip, -12 + headDrop);
  ctx.lineTo(hx + 6 * flip, -6 + headDrop);
  ctx.closePath();
  ctx.fill();

  if (leapWolf.attackPhase === "windup") {
    ctx.shadowColor = parryReady ? "#ff3030" : "#ffd04a";
    ctx.shadowBlur = parryReady ? 8 : 4;
  }

  ctx.fillStyle = stunned
    ? "#d8c060"
    : parryReady
      ? "#ff7060"
      : leapWolf.attackPhase === "windup"
        ? "#ffd04a"
        : "#ff3030";
  ctx.beginPath();
  ctx.arc(
    hx + 2 * flip,
    -4.5 + headDrop,
    leapWolf.attackPhase === "windup" ? 1.7 : 1.3,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.shadowBlur = 0;

  if (wolf.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${wolf.flash * 5})`;
    ctx.beginPath();
    ctx.ellipse(0, -1, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (stunned) {
    ctx.fillStyle = "#ffe08a";
    for (let i = 0; i < 3; i++) {
      const angle = time * 5 + (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * 14 * s,
        y - 17 * s + Math.sin(angle) * 4 * s,
        2.2 * s,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.fillStyle = "#ffe08a";
    ctx.font = "700 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STUN", x, y - 28 * s);
    ctx.textAlign = "left";
  }

  if (
    wolf.hp < wolf.maxHp ||
    wolf.posture < wolf.maxPosture ||
    stunned
  ) {
    const bw = 24 * s;
    const hpY = y - 24 * s;
    const postureY = hpY + 6;

    ctx.fillStyle = "rgba(0,0,0,0.58)";
    roundRectPath(ctx, x - bw / 2, hpY, bw, 4, 2);
    ctx.fill();
    ctx.fillStyle = "#e05050";
    roundRectPath(
      ctx,
      x - bw / 2,
      hpY,
      (bw * wolf.hp) / wolf.maxHp,
      4,
      2,
    );
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.62)";
    roundRectPath(ctx, x - bw / 2, postureY, bw, 3.5, 1.75);
    ctx.fill();
    ctx.fillStyle = stunned ? "#fff0a8" : "#e8c56a";
    roundRectPath(
      ctx,
      x - bw / 2,
      postureY,
      (bw * wolf.posture) / wolf.maxPosture,
      3.5,
      1.75,
    );
    ctx.fill();
  }
}

/** Баавгай — чононоос хоёр дахин том, хүчтэй араатан */
const BEAR_SWIPE_WINDUP_VISUAL_DURATION = 0.68;
const BEAR_SWIPE_ACTIVE_VISUAL_DURATION = 0.28;
const BEAR_SWIPE_RECOVERY_VISUAL_DURATION = 0.82;
const BEAR_GRAB_WINDUP_VISUAL_DURATION = 0.82;
const BEAR_GRAB_ACTIVE_VISUAL_DURATION = 0.38;
const BEAR_GRAB_HOLD_VISUAL_DURATION = 0.9;
const BEAR_GRAB_RECOVERY_VISUAL_DURATION = 1.05;
const BEAR_SWIPE_VISUAL_EXTRA = 56;
const BEAR_GRAB_DIRECTION_PREVIEW_EXTRA = 96;

/** Баавгай — grab болон урд талын swipe attack-тай. */
export function drawBear(
  ctx: CanvasRenderingContext2D,
  bear: Wolf,
  cam: Camera,
  time: number,
): void {
  const x = bear.pos.x - cam.x;
  const y = bear.pos.y - cam.y;
  const flip = bear.face;
  const s = bear.scale;
  const combatBear = getWolfWithLeap(bear);

  const grabAttack = combatBear.attackKind === "bearGrab";
  const swipeAttack = combatBear.attackKind === "bearSwipe";
  const attacking =
    combatBear.attackPhase === "windup" ||
    combatBear.attackPhase === "leaping" ||
    combatBear.attackPhase === "grabbing" ||
    combatBear.attackPhase === "recovery";
  const grabbing = combatBear.attackPhase === "grabbing";
  const stunned = combatBear.attackPhase === "stunned";
  const chasing = combatBear.attackPhase === "chasing";

  const windupDuration = grabAttack
    ? BEAR_GRAB_WINDUP_VISUAL_DURATION
    : BEAR_SWIPE_WINDUP_VISUAL_DURATION;
  const activeDuration = grabAttack
    ? BEAR_GRAB_ACTIVE_VISUAL_DURATION
    : BEAR_SWIPE_ACTIVE_VISUAL_DURATION;
  const recoveryDuration = grabAttack
    ? BEAR_GRAB_RECOVERY_VISUAL_DURATION
    : BEAR_SWIPE_RECOVERY_VISUAL_DURATION;

  const windupProgress =
    combatBear.attackPhase === "windup"
      ? clamp(
          1 - combatBear.attackTimer / windupDuration,
          0,
          1,
        )
      : 0;
  const activeProgress =
    combatBear.attackPhase === "leaping"
      ? clamp(
          1 - combatBear.attackTimer / activeDuration,
          0,
          1,
        )
      : 0;
  const recoveryProgress =
    combatBear.attackPhase === "recovery"
      ? clamp(
          1 - combatBear.attackTimer / recoveryDuration,
          0,
          1,
        )
      : 0;

  const grabHoldProgress = grabbing
    ? clamp(
        1 - combatBear.attackTimer / BEAR_GRAB_HOLD_VISUAL_DURATION,
        0,
        1,
      )
    : 0;
  const bitePulse = grabbing
    ? 0.5 + 0.5 * Math.sin(grabHoldProgress * Math.PI * 4)
    : 0;

  const swipeParryReady =
    swipeAttack &&
    (combatBear.attackPhase === "leaping" ||
      (combatBear.attackPhase === "windup" &&
        combatBear.attackTimer <= BEAR_PARRY_WARNING_TIME));

  const lumber = chasing
    ? Math.sin(time * 8 + bear.id) * 2.5
    : 0;

  const standAmount = swipeAttack
    ? combatBear.attackPhase === "windup"
      ? windupProgress
      : combatBear.attackPhase === "leaping"
        ? 1
        : combatBear.attackPhase === "recovery"
          ? 1 - recoveryProgress
          : 0
    : 0;

  const grabCrouch = grabAttack
    ? combatBear.attackPhase === "windup"
      ? windupProgress
      : combatBear.attackPhase === "recovery"
        ? 1 - recoveryProgress
        : 0
    : 0;

  const grabLift =
    grabAttack && combatBear.attackPhase === "leaping"
      ? Math.sin(activeProgress * Math.PI) * 5 * s
      : grabbing
        ? Math.sin(grabHoldProgress * Math.PI * 4) * 1.2 * s
        : 0;

  const shadowScale =
    grabAttack && combatBear.attackPhase === "leaping"
      ? 0.72 + Math.abs(activeProgress - 0.5) * 0.28
      : 1;

  drawShadow(
    ctx,
    x,
    y + 11 * s,
    18 * s * shadowScale,
    6 * s * shadowScale,
  );

  // Swipe: шар = эрт, улаан = parry timing.
  if (
    swipeAttack &&
    (combatBear.attackPhase === "windup" ||
      combatBear.attackPhase === "leaping")
  ) {
    const pulse = 0.55 + Math.sin(time * 20) * 0.18;
    const warningColor = swipeParryReady
      ? `rgba(255,65,55,${0.78 + pulse * 0.16})`
      : `rgba(255,205,65,${0.62 + pulse * 0.16})`;

    ctx.strokeStyle = warningColor;
    ctx.lineWidth = swipeParryReady ? 3.4 : 2.2;
    ctx.beginPath();
    ctx.arc(
      x,
      y + 6 * s,
      (22 + windupProgress * 5) * s,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    const swipeWarningReach =
      bear.radius * s +
      PLAYER_RADIUS_FOR_ENEMY_REACH +
      BEAR_SWIPE_VISUAL_EXTRA;

    ctx.strokeStyle = warningColor;
    ctx.lineWidth = swipeParryReady ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 2 * s);
    ctx.lineTo(
      x + combatBear.attackDirection.x * swipeWarningReach,
      y + combatBear.attackDirection.y * swipeWarningReach,
    );
    ctx.stroke();
  }

  // Grab: ягаан X = parry биш, dodge хийх attack.
  if (
    grabAttack &&
    (combatBear.attackPhase === "windup" ||
      combatBear.attackPhase === "leaping")
  ) {
    const pulse = 0.6 + Math.sin(time * 18) * 0.2;
    const warningColor = `rgba(205,70,210,${0.68 + pulse * 0.18})`;
    const warningRadius = (24 + windupProgress * 8) * s;

    ctx.strokeStyle = warningColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + 6 * s, warningRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y - 8 * s);
    ctx.lineTo(x + 8 * s, y + 8 * s);
    ctx.moveTo(x + 8 * s, y - 8 * s);
    ctx.lineTo(x - 8 * s, y + 8 * s);
    ctx.stroke();

    const grabPreviewReach =
      bear.radius * s +
      PLAYER_RADIUS_FOR_ENEMY_REACH +
      BEAR_GRAB_DIRECTION_PREVIEW_EXTRA;

    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + combatBear.attackDirection.x * grabPreviewReach,
      y + combatBear.attackDirection.y * grabPreviewReach,
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.save();
  ctx.translate(
    x,
    y +
      grabCrouch * 4 * s -
      standAmount * 10 * s -
      grabLift,
  );

  const stretchX =
    grabbing
      ? 1.12 + bitePulse * 0.05
      : grabAttack && combatBear.attackPhase === "leaping"
        ? 1.22
        : grabAttack && combatBear.attackPhase === "windup"
          ? 1.08
          : 1;
  const stretchY =
    standAmount > 0
      ? 1 + standAmount * 0.38
      : grabAttack && combatBear.attackPhase === "windup"
        ? 0.82
        : stunned
          ? 0.86
          : 1;

  ctx.scale(s * stretchX, s * stretchY);

  // Хойд хөл — swipe үед босоо байрлалд ойртдог.
  ctx.strokeStyle = "#3a2814";
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.beginPath();

  if (standAmount > 0.05) {
    ctx.moveTo(-7, 4);
    ctx.lineTo(-9, 13);
    ctx.moveTo(7, 4);
    ctx.lineTo(9, 13);
  } else if (grabbing) {
    ctx.moveTo(-10, 5);
    ctx.lineTo(-12, 12);
    ctx.moveTo(-3, 6);
    ctx.lineTo(-4, 12);
    ctx.moveTo(5, 6);
    ctx.lineTo(6, 12);
    ctx.moveTo(11, 5);
    ctx.lineTo(13, 12);
  } else if (
    grabAttack &&
    combatBear.attackPhase === "leaping"
  ) {
    ctx.moveTo(-10, 5);
    ctx.lineTo(-16 * flip, 9);
    ctx.moveTo(-3, 6);
    ctx.lineTo(-10 * flip, 10);
    ctx.moveTo(5, 6);
    ctx.lineTo(-2 * flip, 10);
    ctx.moveTo(11, 5);
    ctx.lineTo(4 * flip, 9);
  } else {
    ctx.moveTo(-10, 5);
    ctx.lineTo(-10 + lumber, 12);
    ctx.moveTo(-3, 6);
    ctx.lineTo(-3 - lumber, 12);
    ctx.moveTo(5, 6);
    ctx.lineTo(5 + lumber, 12);
    ctx.moveTo(11, 5);
    ctx.lineTo(11 - lumber, 12);
  }
  ctx.stroke();

  // Бие — swipe үед босож сунадаг.
  const body = ctx.createLinearGradient(0, -14, 0, 9);
  body.addColorStop(0, "#6a4a28");
  body.addColorStop(1, "#42301a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(
    0,
    -1 - standAmount * 3,
    16 - standAmount * 1.5,
    11 + standAmount * 4,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(
    -4 * flip,
    -8 - standAmount * 5,
    8,
    5.5 + standAmount * 1.5,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Grab үед хоёр сарвуугаа урд сунгана.
  if (
    grabAttack &&
    (combatBear.attackPhase === "windup" ||
      combatBear.attackPhase === "leaping" ||
      combatBear.attackPhase === "grabbing" ||
      combatBear.attackPhase === "recovery")
  ) {
    const extension = grabbing
      ? 1
      : combatBear.attackPhase === "windup"
        ? windupProgress * 0.35
        : combatBear.attackPhase === "leaping"
          ? 0.35 + activeProgress * 0.65
          : 1 - recoveryProgress;

    for (const side of [-1, 1]) {
      const shoulderX = 6 * flip;
      const shoulderY = -5 + side * 4;
      const squeeze = grabbing ? (1 - bitePulse) * 3 : 0;
      const pawX = (11 + extension * 13 - squeeze) * flip;
      const pawY = shoulderY + extension * 2 - side * squeeze * 0.45;

      ctx.strokeStyle = "#4b351d";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(pawX, pawY);
      ctx.stroke();

      ctx.fillStyle = "#3a2814";
      ctx.beginPath();
      ctx.ellipse(pawX, pawY, 4.2, 3.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Swipe үед нэг сарвуу толгой дээрээс урд тал руу савна.
  if (
    swipeAttack &&
    (combatBear.attackPhase === "windup" ||
      combatBear.attackPhase === "leaping" ||
      combatBear.attackPhase === "recovery")
  ) {
    const swipeProgress =
      combatBear.attackPhase === "windup"
        ? windupProgress * 0.28
        : combatBear.attackPhase === "leaping"
          ? 0.28 + activeProgress * 0.58
          : 0.86 + recoveryProgress * 0.14;
    const swing = clamp(swipeProgress, 0, 1);

    const shoulderX = 7 * flip;
    const shoulderY = -9 - standAmount * 4;
    const pawX = lerp(
      4 * flip,
      22 * flip,
      swing,
    );
    const pawY = lerp(
      -19,
      5,
      swing,
    );

    ctx.strokeStyle = "#4b351d";
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(pawX, pawY);
    ctx.stroke();

    ctx.fillStyle = "#3a2814";
    ctx.beginPath();
    ctx.ellipse(pawX, pawY, 4.6, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (combatBear.attackPhase === "leaping") {
      const slashAlpha = Math.sin(activeProgress * Math.PI);

      ctx.strokeStyle = `rgba(250,235,210,${0.82 * slashAlpha})`;
      ctx.lineWidth = 2.4;

      for (let i = 0; i < 3; i++) {
        const offset = (i - 1) * 5;
        ctx.beginPath();
        ctx.moveTo(15 * flip, -15 + offset);
        ctx.quadraticCurveTo(
          32 * flip,
          -5 + offset,
          50 * flip,
          8 + offset,
        );
        ctx.stroke();
      }
    }
  }

  // Толгой.
  const headY =
    -5 - standAmount * 6 + (stunned ? 3 : 0) +
    (grabbing ? bitePulse * 2 : 0);
  const hx = (13 + (grabbing ? bitePulse * 4 : 0)) * flip;

  ctx.fillStyle = "#5c4022";
  ctx.beginPath();
  ctx.ellipse(hx, headY, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8a6a42";
  ctx.beginPath();
  ctx.ellipse(
    hx + 5.5 * flip,
    headY + 2,
    4.5,
    3.2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (grabbing) {
    const jawOpen = 1.5 + bitePulse * 4;

    ctx.fillStyle = "#2b160e";
    ctx.beginPath();
    ctx.ellipse(
      hx + 5.5 * flip,
      headY + 3 + jawOpen,
      4.8,
      2.3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.strokeStyle = "#f0e6d4";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(hx + 4 * flip, headY + 3);
    ctx.lineTo(hx + 5 * flip, headY + 5 + jawOpen * 0.4);
    ctx.moveTo(hx + 7 * flip, headY + 3);
    ctx.lineTo(hx + 7.5 * flip, headY + 5 + jawOpen * 0.4);
    ctx.stroke();
  }

  ctx.fillStyle = "#1a120a";
  ctx.beginPath();
  ctx.ellipse(
    hx + 9 * flip,
    headY + 1.5,
    2,
    1.6,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.fillStyle = "#42301a";
  ctx.beginPath();
  ctx.arc(hx - 4 * flip, headY - 6, 3.2, 0, Math.PI * 2);
  ctx.arc(hx + 2 * flip, headY - 7, 3.2, 0, Math.PI * 2);
  ctx.fill();

  if (swipeAttack && combatBear.attackPhase === "windup") {
    ctx.shadowColor = swipeParryReady ? "#ff3030" : "#ffd04a";
    ctx.shadowBlur = swipeParryReady ? 9 : 5;
  } else if (grabAttack && attacking) {
    ctx.shadowColor = "#d050d8";
    ctx.shadowBlur = 7;
  }

  ctx.fillStyle = stunned
    ? "#ffe08a"
    : swipeParryReady
      ? "#ff604f"
      : swipeAttack && combatBear.attackPhase === "windup"
        ? "#ffd04a"
        : grabAttack && attacking
          ? "#e070e8"
          : "#ff4020";
  ctx.beginPath();
  ctx.arc(hx + 2 * flip, headY - 1, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Соёо.
  ctx.strokeStyle = "#e8e0d0";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(hx + 7 * flip, headY + 4.5);
  ctx.lineTo(hx + 7.5 * flip, headY + 7);
  ctx.stroke();

  // Сарвууны хумс.
  ctx.strokeStyle = "#d8d0c0";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(11 - lumber, 12);
  ctx.lineTo(13 - lumber + 2 * flip, 12.5);
  ctx.moveTo(-10 + lumber, 12);
  ctx.lineTo(-8 + lumber + 2 * flip, 12.5);
  ctx.stroke();

  if (bear.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${bear.flash * 5})`;
    ctx.beginPath();
    ctx.ellipse(0, -2, 19, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (grabbing) {
    const biteX = x + combatBear.attackDirection.x * 42 * s;
    const biteY = y + combatBear.attackDirection.y * 42 * s - 4 * s;
    const impactAlpha = 0.35 + bitePulse * 0.55;

    ctx.strokeStyle = `rgba(255,210,140,${impactAlpha})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + grabHoldProgress * 0.8;
      ctx.beginPath();
      ctx.moveTo(
        biteX + Math.cos(angle) * 5 * s,
        biteY + Math.sin(angle) * 5 * s,
      );
      ctx.lineTo(
        biteX + Math.cos(angle) * 11 * s,
        biteY + Math.sin(angle) * 11 * s,
      );
      ctx.stroke();
    }
  }

  if (stunned) {
    ctx.fillStyle = "#ffe08a";
    for (let i = 0; i < 4; i++) {
      const angle = time * 4.5 + (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * 20 * s,
        y - 27 * s + Math.sin(angle) * 5 * s,
        2.6 * s,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.font = "700 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("1/4 COUNTER", x, y - 40 * s);
    ctx.textAlign = "left";
  }

  if (
    bear.hp < bear.maxHp ||
    bear.posture < bear.maxPosture ||
    stunned
  ) {
    const bw = 30 * s;
    const barY = y - (standAmount > 0 ? 42 : 27) * s;
    const postureY = barY + 7;

    ctx.fillStyle = "rgba(0,0,0,0.58)";
    roundRectPath(ctx, x - bw / 2, barY, bw, 5, 2.5);
    ctx.fill();

    ctx.fillStyle = "#e05050";
    roundRectPath(
      ctx,
      x - bw / 2,
      barY,
      (bw * bear.hp) / bear.maxHp,
      5,
      2.5,
    );
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.62)";
    roundRectPath(ctx, x - bw / 2, postureY, bw, 4, 2);
    ctx.fill();

    ctx.fillStyle = stunned ? "#fff0a8" : "#e8c56a";
    roundRectPath(
      ctx,
      x - bw / 2,
      postureY,
      (bw * bear.posture) / bear.maxPosture,
      4,
      2,
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



export type PlayerSpriteName =
  | "idle"
  | "run"
  | "attack1"
  | "attack2"
  | "attack3"
  | "parry"
  | "dodge"
  | "hurt";

export type PlayerSpriteSet = Record<
  PlayerSpriteName,
  HTMLImageElement
>;

const PLAYER_SPRITE_PATHS: Record<PlayerSpriteName, string> = {
  idle: "/assets/player/player-idle.png",
  run: "/assets/player/player-run.png",
  attack1: "/assets/player/player-attack1.png",
  attack2: "/assets/player/player-attack2.png",
  attack3: "/assets/player/player-attack3.png",
  parry: "/assets/player/player-parry.png",
  dodge: "/assets/player/player-dodge.png",
  hurt: "/assets/player/player-hurt.png",
};

/**
 * Public folder-оос player sprite-уудыг browser image болгон ачаална.
 * Зураг бүрэн ачаалагдах хүртэл хуучин procedural дүр fallback болно.
 */
export function loadPlayerSprites(): PlayerSpriteSet {
  const createImage = (
    spriteName: PlayerSpriteName,
  ): HTMLImageElement => {
    const image = new Image();
    image.decoding = "async";
    image.src = PLAYER_SPRITE_PATHS[spriteName];
    return image;
  };

  return {
    idle: createImage("idle"),
    run: createImage("run"),
    attack1: createImage("attack1"),
    attack2: createImage("attack2"),
    attack3: createImage("attack3"),
    parry: createImage("parry"),
    dodge: createImage("dodge"),
    hurt: createImage("hurt"),
  };
}

const PLAYER_SPRITE_FRAME_SIZE = 128;
const PLAYER_SPRITE_FRAME_COUNT = 4;
const PLAYER_SPRITE_DRAW_SIZE = 72;

const DODGE_SPRITE_ACTIVE_SECONDS = 0.28;
const DODGE_SPRITE_RECOVERY_SECONDS = 0.12;

function isPlayerSpriteReady(image: HTMLImageElement): boolean {
  return image.complete && image.naturalWidth > 0;
}

function frameFromProgress(progress: number): number {
  return Math.min(
    PLAYER_SPRITE_FRAME_COUNT - 1,
    Math.floor(
      clamp(progress, 0, 0.9999) *
        PLAYER_SPRITE_FRAME_COUNT,
    ),
  );
}

function getParrySpriteProgress(player: Player): number {
  switch (player.parryPhase) {
    case "startup": {
      const progress =
        1 -
        player.parryTimer / PARRY_VISUAL_STARTUP_SECONDS;
      return clamp(progress * 0.2, 0, 0.2);
    }
    case "active": {
      const progress =
        1 -
        player.parryTimer / PARRY_VISUAL_ACTIVE_SECONDS;
      return clamp(0.2 + progress * 0.55, 0.2, 0.75);
    }
    case "recovery": {
      const progress =
        1 -
        player.parryTimer / PARRY_VISUAL_RECOVERY_SECONDS;
      return clamp(0.75 + progress * 0.25, 0.75, 1);
    }
    case "idle":
      return 0;
    default:
      return 0;
  }
}

function getDodgeSpriteProgress(player: Player): number {
  switch (player.dodgePhase) {
    case "dodging": {
      const progress =
        1 - player.dodgeTimer / DODGE_SPRITE_ACTIVE_SECONDS;
      return clamp(progress * 0.78, 0, 0.78);
    }
    case "recovery": {
      const progress =
        1 -
        player.dodgeTimer / DODGE_SPRITE_RECOVERY_SECONDS;
      return clamp(0.78 + progress * 0.22, 0.78, 1);
    }
    case "idle":
      return 0;
    default:
      return 0;
  }
}

function playerSpriteFacing(
  player: Player,
  spriteName: PlayerSpriteName,
): Vector2 {
  if (
    spriteName === "attack1" ||
    spriteName === "attack2" ||
    spriteName === "attack3"
  ) {
    return player.attackFacing;
  }

  if (spriteName === "dodge") {
    return player.dodgeDirection;
  }

  return player.facing;
}

function playerSpriteRow(direction: Vector2): number {
  if (Math.abs(direction.y) >= Math.abs(direction.x)) {
    return direction.y < 0 ? 2 : 0;
  }

  return 1;
}

function selectPlayerSprite(
  player: Player,
  time: number,
  hurtFlash: number,
): {
  name: PlayerSpriteName;
  frame: number;
  row: number;
  flipX: boolean;
} {
  let name: PlayerSpriteName;
  let frame: number;

  if (hurtFlash > 0.08) {
    name = "hurt";
    frame = frameFromProgress(1 - clamp(hurtFlash, 0, 1));
  } else if (player.dodgePhase !== "idle") {
    name = "dodge";
    frame = frameFromProgress(getDodgeSpriteProgress(player));
  } else if (player.parryPhase !== "idle") {
    name = "parry";
    frame = frameFromProgress(getParrySpriteProgress(player));
  } else if (player.combatPhase !== "idle") {
    name =
      player.attackVariant === 0
        ? "attack1"
        : player.attackVariant === 1
          ? "attack2"
          : "attack3";
    frame = frameFromProgress(getMeleeVisualProgress(player));
  } else if (player.moving) {
    name = "run";
    frame =
      Math.floor(time * 10) % PLAYER_SPRITE_FRAME_COUNT;
  } else {
    name = "idle";
    frame =
      Math.floor(time * 3) % PLAYER_SPRITE_FRAME_COUNT;
  }

  const direction = playerSpriteFacing(player, name);

  return {
    name,
    frame,
    row: playerSpriteRow(direction),
    flipX:
      Math.abs(direction.x) > Math.abs(direction.y) &&
      direction.x < 0,
  };
}

function getMeleeVisualProgress(player: Player): number {
  const speedMultiplier = Math.max(0.05, player.cooldownMult);

  switch (player.combatPhase) {
    case "startup": {
      const duration = 0.12 * speedMultiplier;
      const phaseProgress = 1 - player.combatTimer / duration;
      return clamp(phaseProgress * 0.28, 0, 0.28);
    }
    case "active": {
      const duration = 0.1 * speedMultiplier;
      const phaseProgress = 1 - player.combatTimer / duration;
      return clamp(0.28 + phaseProgress * 0.44, 0.28, 0.72);
    }
    case "recovery": {
      const duration = 0.28 * speedMultiplier;
      const phaseProgress = 1 - player.combatTimer / duration;
      return clamp(0.72 + phaseProgress * 0.28, 0.72, 1);
    }
    case "idle":
      return 0;
    default:
      return 0;
  }
}

function easeOutCubic(value: number): number {
  const t = clamp(value, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

const PARRY_VISUAL_STARTUP_SECONDS = 0.02;
const PARRY_VISUAL_ACTIVE_SECONDS = 0.5;
const PARRY_VISUAL_RECOVERY_SECONDS = 0.18;

function smoothStep(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function getParryGuardAmount(player: Player): number {
  switch (player.parryPhase) {
    case "startup": {
      const progress =
        1 - player.parryTimer / PARRY_VISUAL_STARTUP_SECONDS;
      return smoothStep(progress) * 0.3;
    }
    case "active": {
      const elapsed =
        PARRY_VISUAL_ACTIVE_SECONDS - player.parryTimer;
      return 0.3 + smoothStep(elapsed / 0.08) * 0.7;
    }
    case "recovery": {
      const progress =
        1 - player.parryTimer / PARRY_VISUAL_RECOVERY_SECONDS;
      return 1 - smoothStep(progress);
    }
    case "idle":
      return 0;
    default:
      return 0;
  }
}

function drawPlayerProcedural(
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
  const bob = player.moving ? Math.abs(Math.sin(time * 11)) * 1.5 : Math.sin(time * 2) * 0.6;

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

  const attackDirection =
    player.attackMelee && player.combatPhase !== "idle"
      ? player.attackFacing
      : player.facing;
  const ang = Math.atan2(attackDirection.y, attackDirection.x);
  const hasGun = player.gear.gun;
  const hasBow = player.gear.bow && !hasGun;
  const swingingStaff =
    player.attackMelee && player.combatPhase !== "idle";
  const parrying = player.parryPhase !== "idle";

  if (parrying) {
    const active = player.parryPhase === "active";
    const guardAmount = getParryGuardAmount(player);

    const facingLength = Math.max(0.001, Math.hypot(
      attackDirection.x,
      attackDirection.y,
    ));
    const forwardX = attackDirection.x / facingLength;
    const forwardY = attackDirection.y / facingLength;
    const sideX = -forwardY;
    const sideY = forwardX;

    // Таяг ташаанаас урд хамгаалалтын байрлал руу өргөгдөнө.
    const staffCenterX = lerp(
      x - sideX * 5,
      x + forwardX * 10,
      guardAmount,
    );
    const staffCenterY = lerp(
      y + 3,
      y - 5 + forwardY * 5,
      guardAmount,
    );

    const staffHalfLength = 15;
    const staffStartX = staffCenterX - sideX * staffHalfLength;
    const staffStartY = staffCenterY - sideY * staffHalfLength;
    const staffEndX = staffCenterX + sideX * staffHalfLength;
    const staffEndY = staffCenterY + sideY * staffHalfLength;

    // Хоёр гар таягийг бодитоор тулж барина.
    const leftGripX = staffCenterX - sideX * 5;
    const leftGripY = staffCenterY - sideY * 5;
    const rightGripX = staffCenterX + sideX * 5;
    const rightGripY = staffCenterY + sideY * 5;

    ctx.strokeStyle = "#d8b088";
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - sideX * 5, shoulderY + 1);
    ctx.lineTo(leftGripX, leftGripY);
    ctx.moveTo(x + sideX * 5, shoulderY + 1);
    ctx.lineTo(rightGripX, rightGripY);
    ctx.stroke();

    // Таягны бараан хүрээ + модон гол.
    ctx.strokeStyle = "#4a2f18";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(staffStartX, staffStartY);
    ctx.lineTo(staffEndX, staffEndY);
    ctx.stroke();

    ctx.strokeStyle = "#a87538";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(staffStartX, staffStartY);
    ctx.lineTo(staffEndX, staffEndY);
    ctx.stroke();

    // Хоёр үзүүрийн жижиг төмөр бөгж.
    ctx.fillStyle = "#d7b65c";
    ctx.beginPath();
    ctx.arc(staffStartX, staffStartY, 2.1, 0, Math.PI * 2);
    ctx.arc(staffEndX, staffEndY, 2.1, 0, Math.PI * 2);
    ctx.fill();

    if (active) {
      const pulse = 0.55 + Math.sin(time * 24) * 0.18;
      const impactX = staffCenterX + forwardX * 5;
      const impactY = staffCenterY + forwardY * 5;

      // Том дугуй arc-ийн оронд жижиг, цэвэрхэн хамгаалалтын оч.
      ctx.save();
      ctx.translate(impactX, impactY);
      ctx.rotate(ang);
      ctx.strokeStyle = `rgba(255,236,165,${pulse})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(15, 0);
      ctx.moveTo(10, -6);
      ctx.lineTo(14, -10);
      ctx.moveTo(10, 6);
      ctx.lineTo(14, 10);
      ctx.stroke();

      ctx.fillStyle = `rgba(255,240,185,${pulse * 0.55})`;
      ctx.beginPath();
      ctx.arc(9, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (swingingStaff) {
    const progress = getMeleeVisualProgress(player);
    const swingProgress = easeOutCubic(progress);
    const variant = player.attackVariant;
    const reachScale = clamp(player.reachMult, 0.85, 1.7);

    let staffAngle = 0;
    let gripX = 4;
    let gripY = -4;
    let trailStart = -0.9;
    let trailEnd = 0.75;

    switch (variant) {
      case 0:
        // Баруун дээд талаас зүүн доош чиглэсэн ташуу цохилт.
        staffAngle = lerp(-1.05, 0.72, swingProgress);
        gripX = lerp(-3, 8, swingProgress);
        gripY = lerp(-10, 2, swingProgress);
        trailStart = -1.05;
        trailEnd = 0.72;
        break;
      case 1:
        // Доороос дээш чиглэсэн эсрэг ташуу цохилт.
        staffAngle = lerp(0.92, -0.76, swingProgress);
        gripX = lerp(-1, 9, swingProgress);
        gripY = lerp(5, -6, swingProgress);
        trailStart = 0.92;
        trailEnd = -0.76;
        break;
      case 2:
        // Толгойн дээрээс урагш буух босоо хүчтэй цохилт.
        staffAngle = lerp(-1.62, 0.08, swingProgress);
        gripX = lerp(-7, 9, swingProgress);
        gripY = lerp(-15, -1, swingProgress);
        trailStart = -1.62;
        trailEnd = 0.08;
        break;
    }

    ctx.save();
    ctx.translate(x, y - 4);
    ctx.rotate(ang);

    // Довтолж буй гар — таягны бариултай холбогдоно.
    ctx.strokeStyle = "#d8b088";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-2, -3);
    ctx.lineTo(gripX, gripY);
    ctx.stroke();

    const staffLength =
      (variant === 2 ? 33 : 30) * reachScale;
    const tipX = gripX + Math.cos(staffAngle) * staffLength;
    const tipY = gripY + Math.sin(staffAngle) * staffLength;

    // Таяг.
    ctx.strokeStyle = "#9a6a34";
    ctx.lineWidth = variant === 2 ? 3.2 : 2.8;
    ctx.beginPath();
    ctx.moveTo(gripX, gripY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Алтан үзүүр.
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.arc(tipX, tipY, variant === 2 ? 3 : 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Зөвхөн цохилтын идэвхтэй хэсэгт урд талд богино slash trail зурна.
    if (progress >= 0.24 && progress <= 0.82) {
      const trailProgress = clamp((progress - 0.24) / 0.58, 0, 1);
      const trailAlpha =
        Math.sin(trailProgress * Math.PI) * (variant === 2 ? 0.9 : 0.75);
      const trailRadius =
        (variant === 2 ? 44 : 38) * reachScale;

      ctx.strokeStyle = `rgba(255,240,180,${trailAlpha})`;
      ctx.lineWidth = variant === 2 ? 5 : 4;
      ctx.lineCap = "round";
      ctx.beginPath();

      if (variant === 2) {
        // Толгойн дээгүүр бүтэн тойрог биш — урд тал руу буух шулуувтар мөр.
        ctx.moveTo(-5 * reachScale, -28 * reachScale);
        ctx.quadraticCurveTo(
          10 * reachScale,
          -18 * reachScale,
          44 * reachScale,
          0,
        );
      } else {
        const currentTrailEnd = lerp(
          trailStart,
          trailEnd,
          easeOutCubic(trailProgress),
        );
        const direction = trailEnd >= trailStart ? 1 : -1;
        ctx.arc(
          2,
          -2,
          trailRadius,
          currentTrailEnd - direction * 0.62,
          currentTrailEnd,
          direction < 0,
        );
      }

      ctx.stroke();
    }

    ctx.restore();
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
    const draw = player.attackAnim > 0 ? Math.min(1, (0.18 - player.attackAnim) / 0.12) : 0;
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


function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
  sprites: PlayerSpriteSet,
  hurtFlash: number,
): void {
  const x = player.pos.x - cam.x;
  const y = player.pos.y - cam.y;
  const selection = selectPlayerSprite(
    player,
    time,
    hurtFlash,
  );
  const image = sprites[selection.name];

  const riding = player.gear.horse;
  if (riding) {
    const horseFlip = player.facing.x < 0 ? -1 : 1;
    drawHorse(
      ctx,
      x,
      y + 2,
      horseFlip,
      time,
      player.moving,
    );

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
        (bw * Math.max(0, player.horseHp)) /
          player.horseMaxHp,
        4,
        2,
      );
      ctx.fill();
    }
  }

  const spriteOffsetY = riding ? -14 : 0;

  if (!riding) {
    drawShadow(ctx, x, y + 12, 15, 5.5);
  }

  const sourceX =
    selection.frame * PLAYER_SPRITE_FRAME_SIZE;
  const sourceY =
    selection.row * PLAYER_SPRITE_FRAME_SIZE;

  const destinationX = -PLAYER_SPRITE_DRAW_SIZE / 2;
  const destinationY = -PLAYER_SPRITE_DRAW_SIZE + 18;

  ctx.save();
  ctx.translate(x, y + spriteOffsetY);

  if (
    player.invuln > 0 &&
    Math.floor(time * 14) % 2 === 0
  ) {
    ctx.globalAlpha = 0.45;
  }

  ctx.imageSmoothingEnabled = false;

  if (selection.flipX) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    PLAYER_SPRITE_FRAME_SIZE,
    PLAYER_SPRITE_FRAME_SIZE,
    destinationX,
    destinationY,
    PLAYER_SPRITE_DRAW_SIZE,
    PLAYER_SPRITE_DRAW_SIZE,
  );

  ctx.restore();
}

/**
 * Player sprite бэлэн бол sprite sheet зурна.
 * Ranged attack эсвэл зураг ачаалагдаагүй үед хуучин дүр fallback болно.
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
  sprites?: PlayerSpriteSet,
  hurtFlash = 0,
): void {
  const selection = sprites
    ? selectPlayerSprite(player, time, hurtFlash)
    : null;

  const rangedAttackActive =
    player.attackAnim > 0 && !player.attackMelee;

  if (
    !sprites ||
    !selection ||
    !isPlayerSpriteReady(sprites[selection.name]) ||
    rangedAttackActive
  ) {
    drawPlayerProcedural(ctx, player, cam, time);
    return;
  }

  drawPlayerSprite(
    ctx,
    player,
    cam,
    time,
    sprites,
    hurtFlash,
  );
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

// ---------------------------------------------------------------------------
// Overlays & HUD
// ---------------------------------------------------------------------------

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

  if (a < 0.3 || !fire.lit) {
    // Энгийн тинт (гэрлийн нүх шаардлагагүй үед мөн адил, гэхдээ галтай бол нүхлэх)
    if (!fire.lit) {
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

  if (fire.lit) {
    const fx = fire.pos.x - cam.x;
    const fy = fire.pos.y - cam.y;
    const rad = 150 * (1 + Math.sin(time * 9) * 0.05);
    const fg = lc.createRadialGradient(fx, fy, 8, fx, fy, rad);
    fg.addColorStop(0, "rgba(0,0,0,0.95)");
    fg.addColorStop(0.6, "rgba(0,0,0,0.5)");
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

export function drawWeatherFx(
  ctx: CanvasRenderingContext2D,
  world: World,
  time: number,
): void {
  if (world.weather === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 90; i++) {
      const drift = Math.sin(time * 1.5 + i) * 24;
      const sx = ((i * 97 + time * 40 + drift) % (VIEW_W + 40)) - 20;
      const sy = ((i * 53 + time * 90) % (VIEW_H + 40)) - 20;
      const s = 1.2 + (i % 3);
      ctx.globalAlpha = 0.4 + (i % 5) * 0.12;
      ctx.beginPath();
      ctx.arc(sx, sy, s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (world.weather === "storm") {
    ctx.fillStyle = "rgba(20,30,50,0.16)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.strokeStyle = "rgba(180,200,230,0.5)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const sx = ((i * 137 + time * 500) % (VIEW_W + 60)) - 30;
      const sy = ((i * 71 + time * 620) % (VIEW_H + 40)) - 20;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 4, sy + 12);
    }
    ctx.stroke();
  }
}


/** Гэр дотор орон дээр хэвтэж унтаж буй малчин */
export function drawSleepingHerder(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  scale: number,
): void {
  const bed =
    state.gerSleepBed === "L" ? gerLayout().bedL : gerLayout().bedR;
  const cx = bed.x + bed.w / 2;
  // Орны дээд хэсэг рүү ойртуулж хэвтүүлнэ
  const cy = bed.y + bed.h * 0.38;
  // Зүүн ор — толгой баруун тийш, баруун ор — зүүн тийш (дэрнээс хол)
  const headLeft = state.gerSleepBed === "R";
  const breath = Math.sin(time * 2.2) * 1.2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  // Босоо дүрийг хэвтүүлэх
  ctx.rotate(headLeft ? Math.PI / 2 : -Math.PI / 2);

  // Хөл
  ctx.strokeStyle = "#2a2a30";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-3.5, 3);
  ctx.lineTo(-3.5, 11);
  ctx.moveTo(3.5, 3);
  ctx.lineTo(3.5, 11);
  ctx.stroke();

  // Дээл
  const deel = ctx.createLinearGradient(-8, -10, 8, 6);
  deel.addColorStop(0, "#3a62a0");
  deel.addColorStop(1, "#24457a");
  ctx.fillStyle = deel;
  ctx.beginPath();
  ctx.ellipse(0, -1 + breath * 0.15, 9.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e8c56a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(1, -10);
  ctx.quadraticCurveTo(7, -5, 5, 1);
  ctx.stroke();
  ctx.strokeStyle = "#d88a2a";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-9, 1);
  ctx.lineTo(9, 1);
  ctx.stroke();

  // Толгой
  const hy = -14 + breath * 0.1;
  ctx.fillStyle = "#e0b890";
  ctx.beginPath();
  ctx.arc(0, hy, 6, 0, Math.PI * 2);
  ctx.fill();

  // Нүд аниастай (унтаж байна)
  ctx.strokeStyle = "#2a2018";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-3.2, hy - 0.5);
  ctx.quadraticCurveTo(-2, hy + 0.8, -0.6, hy - 0.5);
  ctx.moveTo(0.6, hy - 0.5);
  ctx.quadraticCurveTo(2, hy + 0.8, 3.2, hy - 0.5);
  ctx.stroke();

  // Монгол малгай
  ctx.fillStyle = "#a82424";
  ctx.beginPath();
  ctx.moveTo(-6, hy - 3);
  ctx.quadraticCurveTo(-3, hy - 9, 0, hy - 11);
  ctx.quadraticCurveTo(3, hy - 9, 6, hy - 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5a3c22";
  roundRectPath(ctx, -7, hy - 4, 14, 3.8, 2);
  ctx.fill();
  ctx.fillStyle = "#e8c56a";
  ctx.beginPath();
  ctx.arc(0, hy - 11.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Zzz — толгойн тал руу хөвнө
  for (let i = 0; i < 3; i++) {
    const phase = (time * 0.7 + i * 0.85) % 1;
    const zx = cx + (headLeft ? -28 : 28) + Math.sin(time + i) * 4;
    const zy = cy - 22 - phase * 42;
    ctx.globalAlpha = (1 - phase) * 0.9;
    ctx.fillStyle = "#d8e8ff";
    ctx.font = `${11 + i * 3}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("z", zx, zy);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

export function drawGerInterior(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  playerSprites?: PlayerSpriteSet,
): void {
  const cx = VIEW_W / 2;
  const wallTop = 150;
  const wallBot = 330;

  // Дэвсгэр
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, "#241108");
  bg.addColorStop(1, "#150a05");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Шал
  const floor = ctx.createRadialGradient(cx, 410, 60, cx, 410, 470);
  floor.addColorStop(0, "#8a6038");
  floor.addColorStop(0.7, "#6a4526");
  floor.addColorStop(1, "#3a2412");
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.ellipse(cx, 415, 480, 180, 0, 0, Math.PI * 2);
  ctx.fill();

  // Шалны банзны зураас
  ctx.strokeStyle = "rgba(40,24,10,0.35)";
  ctx.lineWidth = 1.5;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 44, wallBot - 40);
    ctx.lineTo(cx + i * 82, VIEW_H);
    ctx.stroke();
  }

  // Гол хивс — дугуй хээтэй
  ctx.fillStyle = "#8a2828";
  ctx.beginPath();
  ctx.ellipse(cx, 420, 190, 66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8a040";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, 420, 172, 57, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(216,160,64,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, 420, 130, 42, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Хана — эсгий ба модон сүлжээ
  ctx.fillStyle = "#c0a070";
  ctx.fillRect(20, wallTop, VIEW_W - 40, wallBot - wallTop);
  // Сүлжээ хана (хана мод)
  ctx.strokeStyle = "rgba(150,80,36,0.65)";
  ctx.lineWidth = 3;
  for (let x = -20; x < VIEW_W + 40; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, wallTop);
    ctx.lineTo(x + 70, wallBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 70, wallTop);
    ctx.lineTo(x, wallBot);
    ctx.stroke();
  }
  // Ханын ирмэгийн сүүдэр
  const wsh = ctx.createLinearGradient(0, 0, VIEW_W, 0);
  wsh.addColorStop(0, "rgba(18,9,4,0.6)");
  wsh.addColorStop(0.5, "rgba(18,9,4,0)");
  wsh.addColorStop(1, "rgba(18,9,4,0.6)");
  ctx.fillStyle = wsh;
  ctx.fillRect(20, wallTop, VIEW_W - 40, wallBot - wallTop);

  // Дээвэр хэсэг
  ctx.fillStyle = "#1c0f07";
  ctx.fillRect(0, 0, VIEW_W, wallTop);

  // Унь — тооноос хана руу
  const ty = 62;
  ctx.strokeStyle = "#c06828";
  ctx.lineWidth = 5;
  for (let i = 0; i <= 16; i++) {
    const wx = 30 + (i / 16) * (VIEW_W - 60);
    ctx.beginPath();
    ctx.moveTo(cx, ty);
    ctx.lineTo(wx, wallTop + 3);
    ctx.stroke();
  }

  // Тооно — тэнгэр харагдана
  ctx.fillStyle = "#3a6a90";
  ctx.beginPath();
  ctx.ellipse(cx, ty, 54, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d87830";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(cx, ty, 54, 30, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 50, ty);
  ctx.lineTo(cx + 50, ty);
  ctx.moveTo(cx, ty - 27);
  ctx.lineTo(cx, ty + 27);
  ctx.stroke();

  // ===== Хоймор — бурхан тахилтай ширээ =====
  {
    const alt = gerLayout().altar;
    const ax = alt.x;
    const aw = alt.w;
    const tableTop = alt.y + 34;

    // Ширээ
    ctx.fillStyle = "#7a2020";
    roundRectPath(ctx, ax, tableTop, aw, 34, 4);
    ctx.fill();
    ctx.strokeStyle = "#d8a040";
    ctx.lineWidth = 2;
    roundRectPath(ctx, ax, tableTop, aw, 34, 4);
    ctx.stroke();
    ctx.strokeStyle = "rgba(216,160,64,0.5)";
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, ax + 8, tableTop + 6, aw - 16, 22, 3);
    ctx.stroke();
    // Хөл
    ctx.fillStyle = "#5a1818";
    ctx.fillRect(ax + 10, tableTop + 34, 12, 14);
    ctx.fillRect(ax + aw - 22, tableTop + 34, 12, 14);

    // Бурхан — алтан шүтээн, гэрэлт цагирагтай
    const bx2 = ax + aw / 2;
    ctx.strokeStyle = "rgba(255,216,112,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx2, alt.y + 8, 14, 0, Math.PI * 2);
    ctx.stroke();
    const gold = ctx.createLinearGradient(bx2, alt.y - 6, bx2, tableTop);
    gold.addColorStop(0, "#ffd870");
    gold.addColorStop(1, "#c89020");
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(bx2 - 11, tableTop);
    ctx.quadraticCurveTo(bx2 - 9, alt.y + 12, bx2 - 5, alt.y + 8);
    ctx.lineTo(bx2 + 5, alt.y + 8);
    ctx.quadraticCurveTo(bx2 + 9, alt.y + 12, bx2 + 11, tableTop);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx2, alt.y + 4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Зул — хоёр талд, дөл нь анивчина
    for (const sx of [-1, 1] as const) {
      const zx = bx2 + sx * 48;
      ctx.fillStyle = "#c8b090";
      roundRectPath(ctx, zx - 4, tableTop - 8, 8, 8, 2);
      ctx.fill();
      const f = 0.7 + 0.3 * Math.sin(time * 11 + sx * 2);
      ctx.fillStyle = `rgba(255,190,70,${0.6 * f + 0.4})`;
      ctx.beginPath();
      ctx.ellipse(zx, tableTop - 13, 2.2, 3 * f + 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Тахилын мөнгөн аяганууд
    ctx.fillStyle = "#d8d8e0";
    for (let i = 0; i < 5; i++) {
      const ox = bx2 - 28 + i * 14;
      ctx.beginPath();
      ctx.ellipse(ox, tableTop - 2.5, 4, 2.5, 0, 0, Math.PI);
      ctx.fill();
    }

    // Хадаг
    ctx.strokeStyle = "#4a8ad8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax + 6, tableTop + 4);
    ctx.quadraticCurveTo(bx2, tableTop + 16, ax + aw - 6, tableTop + 4);
    ctx.stroke();
  }

  // Зуухны яндан
  ctx.fillStyle = "#3a3a42";
  ctx.fillRect(cx - 7, ty + 20, 14, 246);

  // Зуух
  const flick = 0.75 + 0.25 * Math.sin(time * 9) + 0.08 * Math.sin(time * 23);
  const glow = ctx.createRadialGradient(cx, 348, 8, cx, 348, 120);
  glow.addColorStop(0, `rgba(255,150,50,${0.3 * flick})`);
  glow.addColorStop(1, "rgba(255,150,50,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 130, 240, 260, 220);

  const stove = ctx.createLinearGradient(cx, 316, cx, 366);
  stove.addColorStop(0, "#585862");
  stove.addColorStop(1, "#34343c");
  ctx.fillStyle = stove;
  roundRectPath(ctx, cx - 34, 316, 68, 50, 6);
  ctx.fill();
  // Галын цонх
  ctx.fillStyle = `rgba(255,${Math.round(120 + 40 * flick)},30,${0.85 + 0.15 * flick})`;
  roundRectPath(ctx, cx - 17, 334, 34, 22, 4);
  ctx.fill();
  // Хөл
  ctx.fillStyle = "#26262c";
  ctx.fillRect(cx - 30, 366, 8, 9);
  ctx.fillRect(cx + 22, 366, 8, 9);

  // Шүүгээний оронд — хурдан морины зураг (ханын хүрээтэй)
  {
    const fx = 175;
    const fy = 175;
    const fw = 150;
    const fh = 100;
    // Модон хүрээ
    ctx.fillStyle = "#5a3418";
    roundRectPath(ctx, fx - 6, fy - 6, fw + 12, fh + 12, 4);
    ctx.fill();
    ctx.strokeStyle = "#d8a040";
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, fx - 6, fy - 6, fw + 12, fh + 12, 4);
    ctx.stroke();

    ctx.save();
    roundRectPath(ctx, fx, fy, fw, fh, 2);
    ctx.clip();

    // Тэнгэр
    const sky = ctx.createLinearGradient(fx, fy, fx, fy + fh * 0.55);
    sky.addColorStop(0, "#7aa8c8");
    sky.addColorStop(0.55, "#b8c8a8");
    sky.addColorStop(1, "#c8b888");
    ctx.fillStyle = sky;
    ctx.fillRect(fx, fy, fw, fh);

    // Нар
    const sunX = fx + 28;
    const sunY = fy + 22;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 18);
    sunGlow.addColorStop(0, "rgba(255,220,120,0.85)");
    sunGlow.addColorStop(0.45, "rgba(255,190,80,0.35)");
    sunGlow.addColorStop(1, "rgba(255,180,60,0)");
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8b848";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Хол уулс
    ctx.fillStyle = "#6a7a88";
    ctx.beginPath();
    ctx.moveTo(fx, fy + 58);
    ctx.lineTo(fx + 22, fy + 34);
    ctx.lineTo(fx + 48, fy + 52);
    ctx.lineTo(fx + 72, fy + 28);
    ctx.lineTo(fx + 98, fy + 48);
    ctx.lineTo(fx + 120, fy + 30);
    ctx.lineTo(fx + fw, fy + 50);
    ctx.lineTo(fx + fw, fy + 68);
    ctx.lineTo(fx, fy + 68);
    ctx.closePath();
    ctx.fill();
    // Ойрын уулс
    ctx.fillStyle = "#5a6a58";
    ctx.beginPath();
    ctx.moveTo(fx, fy + 66);
    ctx.lineTo(fx + 30, fy + 46);
    ctx.lineTo(fx + 58, fy + 62);
    ctx.lineTo(fx + 88, fy + 42);
    ctx.lineTo(fx + 118, fy + 60);
    ctx.lineTo(fx + fw, fy + 48);
    ctx.lineTo(fx + fw, fy + 74);
    ctx.lineTo(fx, fy + 74);
    ctx.closePath();
    ctx.fill();
    // Цасан орой
    ctx.fillStyle = "rgba(230,236,240,0.55)";
    ctx.beginPath();
    ctx.moveTo(fx + 72, fy + 28);
    ctx.lineTo(fx + 66, fy + 36);
    ctx.lineTo(fx + 78, fy + 36);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx + 120, fy + 30);
    ctx.lineTo(fx + 114, fy + 38);
    ctx.lineTo(fx + 126, fy + 38);
    ctx.closePath();
    ctx.fill();

    // Эрэг / тал
    ctx.fillStyle = "#7a8a48";
    ctx.fillRect(fx, fy + 70, fw, 12);

    // Нуур / ус
    const water = ctx.createLinearGradient(fx, fy + 78, fx, fy + fh);
    water.addColorStop(0, "#5a8aa8");
    water.addColorStop(0.5, "#4a7a98");
    water.addColorStop(1, "#3a6888");
    ctx.fillStyle = water;
    ctx.fillRect(fx, fy + 78, fw, fh - 78);
    // Усны долгион
    ctx.strokeStyle = "rgba(200,230,240,0.28)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const wy = fy + 84 + i * 5;
      ctx.beginPath();
      ctx.moveTo(fx + 4, wy);
      ctx.quadraticCurveTo(fx + 40, wy - 2, fx + 75, wy);
      ctx.quadraticCurveTo(fx + 110, wy + 2, fx + fw - 4, wy);
      ctx.stroke();
    }

    // Морь — тоглоомын drawHorse силуэттэй адил, зургийн өнгөөр
    const hx = fx + 82;
    const hy = fy + 66;
    const flip = 1;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(1.15, 1.15);

    // Сүүдэр (зургийн)
    ctx.fillStyle = "rgba(30,20,10,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Хөл
    ctx.strokeStyle = "#3a2a18";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-12, 2);
    ctx.lineTo(-12, 13);
    ctx.moveTo(-6, 3);
    ctx.lineTo(-6, 13);
    ctx.moveTo(6, 3);
    ctx.lineTo(6, 13);
    ctx.moveTo(12, 2);
    ctx.lineTo(12, 13);
    ctx.stroke();

    // Сүүл
    ctx.strokeStyle = "#241808";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-16 * flip, -2);
    ctx.quadraticCurveTo(-22 * flip, 4, -20 * flip, 12);
    ctx.stroke();

    // Бие
    const body = ctx.createLinearGradient(0, -10, 0, 6);
    body.addColorStop(0, "#6b4a26");
    body.addColorStop(1, "#4a3016");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -2, 17, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Хүзүү ба толгой
    ctx.fillStyle = "#5d3f1f";
    ctx.beginPath();
    ctx.moveTo(10 * flip, -6);
    ctx.lineTo(20 * flip, -16);
    ctx.lineTo(24 * flip, -12);
    ctx.lineTo(15 * flip, -2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(23 * flip, -15, 6, 3.6, flip * -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Дэл
    ctx.strokeStyle = "#241808";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(11 * flip, -7);
    ctx.lineTo(20 * flip, -17);
    ctx.stroke();

    // Нүд
    ctx.fillStyle = "#1a1208";
    ctx.beginPath();
    ctx.arc(24 * flip, -16, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Ханын зургийн бага зэрэг бүдэгрүүлэх
    ctx.fillStyle = "rgba(90,60,30,0.08)";
    ctx.fillRect(fx, fy, fw, fh);

    ctx.restore();

    // Жижиг шошго
    ctx.fillStyle = "rgba(20,12,6,0.55)";
    roundRectPath(ctx, fx + 8, fy + fh - 18, 72, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#ffe9a8";
    ctx.font = "600 9px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Хурдан морь", fx + 14, fy + fh - 9);
  }

  // ===== АВДАР — тахилын ширээтэй нэг түвшин, орны хойно =====
  const lay = gerLayout();
  const ch = lay.chest;
  const hover = overButton(ch, state.input) && !state.shopOpen;
  const pulse = 1 + 0.02 * Math.sin(time * 5);

  ctx.save();
  ctx.translate(ch.x + ch.w / 2, ch.y + ch.h / 2);
  ctx.scale(hover ? pulse : 1, hover ? pulse : 1);
  ctx.translate(-(ch.x + ch.w / 2), -(ch.y + ch.h / 2));

  // Их бие
  const chest = ctx.createLinearGradient(ch.x, ch.y, ch.x, ch.y + ch.h);
  chest.addColorStop(0, "#e07828");
  chest.addColorStop(1, "#a04810");
  ctx.fillStyle = chest;
  roundRectPath(ctx, ch.x, ch.y, ch.w, ch.h - 12, 6);
  ctx.fill();
  // Алтан хүрээ
  ctx.strokeStyle = hover ? "#ffe080" : "#e8c060";
  ctx.lineWidth = hover ? 3 : 2;
  roundRectPath(ctx, ch.x, ch.y, ch.w, ch.h - 12, 6);
  ctx.stroke();
  ctx.strokeStyle = "#e8c060";
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, ch.x + 10, ch.y + 10, ch.w - 20, ch.h - 32, 4);
  ctx.stroke();
  // Өлзий хээ — гол дээр
  ctx.strokeStyle = "#ffd870";
  ctx.lineWidth = 2;
  const mx = ch.x + ch.w / 2;
  const my = ch.y + (ch.h - 12) / 2;
  ctx.beginPath();
  ctx.arc(mx - 16, my, 9, 0.5, Math.PI * 1.8);
  ctx.arc(mx + 16, my, 9, Math.PI - 0.5, Math.PI * 2.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(mx, my, 5, 0, Math.PI * 2);
  ctx.stroke();
  // Хөл
  ctx.fillStyle = "#6a3410";
  ctx.fillRect(ch.x + 8, ch.y + ch.h - 12, 16, 12);
  ctx.fillRect(ch.x + ch.w - 24, ch.y + ch.h - 12, 16, 12);

  ctx.restore();

  // Авдрын шошго
  ctx.textAlign = "center";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 3;
  ctx.strokeText("Авдар", ch.x + ch.w / 2, ch.y - 12);
  ctx.fillStyle = "#ffe9a8";
  ctx.fillText("Авдар", ch.x + ch.w / 2, ch.y - 12);

  // Ор — зүүн ба баруун (авдрын урд зурагдана)
  for (const side of [-1, 1] as const) {
    const bx = cx + side * 330 - 95;
    const by = 300;
    ctx.fillStyle = "#7a4c22";
    roundRectPath(ctx, bx, by, 190, 84, 8);
    ctx.fill();
    ctx.fillStyle = "#a03030";
    roundRectPath(ctx, bx + 8, by + 8, 174, 52, 6);
    ctx.fill();
    ctx.strokeStyle = "#e0b050";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 14, by + 34);
    ctx.lineTo(bx + 176, by + 34);
    ctx.stroke();
    // Дэр
    ctx.fillStyle = "#e8d8b8";
    roundRectPath(ctx, bx + (side < 0 ? 12 : 132), by + 12, 46, 24, 5);
    ctx.fill();
  }

  // Хаалга (гарах)
  const door = lay.door;
  ctx.fillStyle = "#8a2828";
  roundRectPath(ctx, door.x, door.y, door.w, door.h, 8);
  ctx.fill();
  ctx.strokeStyle = overButton(door, state.input) && !state.shopOpen
    ? "#ffe080"
    : "#d8a040";
  ctx.lineWidth = 2;
  roundRectPath(ctx, door.x, door.y, door.w, door.h, 8);
  ctx.stroke();
  ctx.fillStyle = "#ffe9a8";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText("Гарах — P", door.x + door.w / 2, door.y + door.h / 2 + 5);
  ctx.textAlign = "left";

  // ===== Малчин гэр дотор алхаж явна (тавилгатай харьцуулахад томруулсан) =====
  const gerScale = 2.85;
  if (state.gerSleepTimer > 0 && state.gerSleepBed) {
    drawSleepingHerder(ctx, state, time, gerScale);
  } else {
    const walker: Player = {
      ...state.player,
      pos: state.gerPlayer,
      gear: { ...state.player.gear, horse: false },
      invuln: 0,
      attackAnim: 0,
    };
    ctx.save();
    ctx.translate(state.gerPlayer.x, state.gerPlayer.y);
    ctx.scale(gerScale, gerScale);
    ctx.translate(-state.gerPlayer.x, -state.gerPlayer.y);
    drawPlayer(
      ctx,
      walker,
      { x: 0, y: 0 },
      time,
      playerSprites,
    );
    ctx.restore();
  }

  // Ойролцоох зүйлсийн заавар
  if (!state.shopOpen && state.gerSleepTimer <= 0) {
    const prox = gerProximity(state);
    let hint = "";
    if (prox.nearChest) hint = "E — Дэлгүүр нээх";
    else if (prox.nearBed)
      hint = state.player.sleepCooldown > 0 ? "Сая унтсан…" : "E — Унтах";
    if (hint) {
      const hintY = state.gerPlayer.y - 28 * gerScale;
      ctx.textAlign = "center";
      ctx.font = "600 13px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.lineWidth = 3;
      ctx.strokeText(hint, state.gerPlayer.x, hintY);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText(hint, state.gerPlayer.x, hintY);
      ctx.textAlign = "left";
    }
  }

  // Унтах анимэйшний прогресс
  if (state.gerSleepTimer > 0) {
    const progress = 1 - state.gerSleepTimer / 5;
    const bw = 220;
    const bx = (VIEW_W - bw) / 2;
    const by = VIEW_H - 52;
    ctx.fillStyle = "rgba(12,10,8,0.8)";
    roundRectPath(ctx, bx - 10, by - 28, bw + 20, 48, 10);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe9a8";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText("Унтаж байна… Zzz", VIEW_W / 2, by - 8);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, bx, by + 2, bw, 10, 5);
    ctx.fill();
    ctx.fillStyle = "#7ab8e8";
    roundRectPath(ctx, bx, by + 2, bw * progress, 10, 5);
    ctx.fill();
    ctx.textAlign = "left";
  }

  // Дулаан гэрлийн vignette
  const warm = ctx.createRadialGradient(cx, 340, 100, cx, 340, 560);
  warm.addColorStop(0, "rgba(255,170,80,0.08)");
  warm.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Оноо ба эзэмшил
  ctx.fillStyle = "rgba(12,10,8,0.75)";
  roundRectPath(ctx, 14, 14, 210, 36, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.hudAccent;
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText(`Оноо: ${state.score}`, 28, 37);
  const ownedIcons = SHOP_ITEMS.filter((it) => state.player.gear[it.id])
    .map((it) => it.icon)
    .join(" ");
  if (ownedIcons) {
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(ownedIcons, 130, 37);
  }

  // Удирдлагын заавар
  if (!state.shopOpen && state.gerSleepTimer <= 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(242,232,213,0.55)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(
      "WASD — алхах · E — харьцах · Хаалга руу алхаж гарна",
      VIEW_W / 2,
      VIEW_H - 8,
    );
    ctx.textAlign = "left";
  }

  if (state.shopOpen) drawShop(ctx, state);
}

/** Дэлгүүрийн цонх — авдар дээр дарахад нээгдэнэ */

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  terrain: HTMLCanvasElement;
  terrainWinter: HTMLCanvasElement;
  lightCanvas: HTMLCanvasElement;
  vignette: HTMLCanvasElement;
  playerSprites: PlayerSpriteSet;
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

export function getCamera(state: GameState): Camera {
  const shake = state.fx.shake;
  return {
    x:
      clamp(state.player.pos.x - VIEW_W / 2, 0, WORLD_W - VIEW_W) +
      (shake > 0 ? randRange(-shake, shake) : 0),
    y:
      clamp(state.player.pos.y - VIEW_H / 2, 0, WORLD_H - VIEW_H) +
      (shake > 0 ? randRange(-shake, shake) : 0),
  };
}

export function render(rc: RenderContext, state: GameState, time: number): void {
  const { ctx } = rc;

  // Гэрийн дотор — тусдаа дэлгэц
  if (state.phase === "ger") {
    drawGerInterior(
      ctx,
      state,
      time,
      rc.playerSprites,
    );
    return;
  }

  const cam = getCamera(state);
  const world = state.world;

  // Газар
  const terrain =
    world.season === "winter" ? rc.terrainWinter : rc.terrain;
  ctx.drawImage(
    terrain,
    cam.x,
    cam.y,
    VIEW_W,
    VIEW_H,
    0,
    0,
    VIEW_W,
    VIEW_H,
  );

  // Салхины хүч (модны найгалт)
  const windAmp =
    world.weather === "storm"
      ? 5
      : world.weather === "wind"
        ? 3
        : world.weather === "snow"
          ? 2
          : 1;

  // Гүнээр эрэмбэлсэн объектууд.
  // key — тогтвортой хоёрдогч эрэмбэ: ойролцоо y-тэй объектууд давхцахад
  // зурах дараалал frame бүр солигдож анивчихаас сэргийлнэ.
  type Drawable = { y: number; key: number; draw: () => void };
  const drawables: Drawable[] = [];

  const center = pastureCenter(world);
  drawables.push({
    y: center.y - 20,
    key: -2,
    draw: () => drawGer(ctx, center.x - 46 - cam.x, center.y - 26 - cam.y),
  });

  for (const tree of world.trees) {
    drawables.push({
      y: tree.pos.y,
      key: tree.id,
      draw: () => drawTree(ctx, tree, cam, time, windAmp),
    });
  }
  for (const bush of world.bushes) {
    drawables.push({
      y: bush.pos.y,
      key: 1000 + bush.id,
      draw: () => drawBerryBush(ctx, bush, cam),
    });
  }
  drawables.push({
    y: world.campfire.pos.y,
    key: -1,
    draw: () => drawCampfire(ctx, world.campfire, cam, time),
  });
  for (const sheep of world.flock.visuals) {
    drawables.push({
      y: sheep.pos.y,
      key: 2000 + sheep.id,
      draw: () => drawSheep(ctx, sheep, cam, time),
    });
  }
  for (const wolf of world.wolves) {
    drawables.push({
      y: wolf.pos.y,
      key: 2000 + wolf.id,
      draw: () =>
        wolf.kind === "bear"
          ? drawBear(ctx, wolf, cam, time)
          : drawWolf(ctx, wolf, cam, time),
    });
  }
  for (const thief of world.thieves) {
    drawables.push({
      y: thief.pos.y,
      key: 2000 + thief.id,
      draw: () => drawThief(ctx, thief, cam, time),
    });
  }
  if (world.dog) {
    const dog = world.dog;
    drawables.push({
      y: dog.pos.y,
      key: 5000,
      draw: () => drawDog(ctx, dog, cam, time),
    });
  }
  drawables.push({
    y: state.player.pos.y,
    key: Number.MAX_SAFE_INTEGER,
    draw: () =>
      drawPlayer(
        ctx,
        state.player,
        cam,
        time,
        rc.playerSprites,
        state.fx.hurtFlash,
      ),
  });

  drawables.sort(
    (a, b) => Math.round(a.y) - Math.round(b.y) || a.key - b.key,
  );
  for (const d of drawables) d.draw();

  // Сумнууд — бүх объектын дээр
  for (const p of world.projectiles) drawProjectile(ctx, p, cam);

  // Гэрт орох заавар
  if (state.phase === "playing") {
    const c = pastureCenter(world);
    const gp = { x: c.x, y: c.y - 20 };
    if (dist(state.player.pos, gp) < 70) {
      const tx = gp.x - cam.x;
      const ty = gp.y - 66 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      ctx.strokeText("E — Гэрт орох", tx, ty);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText("E — Гэрт орох", tx, ty);
      ctx.textAlign = "left";
    }
  }

  // Particles
  for (const p of state.fx.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x - cam.x, p.pos.y - cam.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Хөвөгч текст
  for (const t of state.fx.texts) {
    const a = clamp(t.life / t.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 3;
    ctx.textAlign = "center";
    ctx.strokeText(t.text, t.pos.x - cam.x, t.pos.y - cam.y - 20);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.pos.x - cam.x, t.pos.y - cam.y - 20);
    ctx.textAlign = "left";
  }
  ctx.globalAlpha = 1;

  // Гэрэлтүүлэг + цаг агаар
  drawLighting(ctx, rc.lightCanvas, state, cam, time);
  drawWeatherFx(ctx, world, time);

  // Vignette
  ctx.drawImage(rc.vignette, 0, 0, VIEW_W, VIEW_H);

  // Цохиулах улаан ирмэг
  if (state.fx.hurtFlash > 0) {
    const a = state.fx.hurtFlash * 0.35;
    const g = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.3,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.8,
    );
    g.addColorStop(0, "rgba(200,30,30,0)");
    g.addColorStop(1, `rgba(200,30,30,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  if (state.phase !== "menu") {
    drawThreatArrows(ctx, state, cam);
    drawMinimap(ctx, state, cam);
  }
  drawHud(ctx, state);
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
