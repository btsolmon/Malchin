// Шулмасын туслахууд — хүний хэлбэртэй уруул, том хамар/чих (зургийн хэв)

import type { RouteEnemy, RouteEnemyKind } from "../types";

type HeadGear = "none" | "skull" | "horns" | "both";
type Weapon = "spear" | "claws" | "bow" | "hammer" | "greatsword";
type HairStyle = "curly" | "tuft" | "topknot";
type SkinTone = "grey" | "red" | "green" | "blue";

interface OngodStyle {
  scale: number;
  headGear: HeadGear;
  weapon: Weapon;
  stocky: boolean;
  hair: HairStyle;
  skin: SkinTone;
}

const STYLE: Record<RouteEnemyKind, OngodStyle> = {
  zurgaanNar: {
    scale: 1.1,
    headGear: "none",
    weapon: "claws",
    stocky: true,
    hair: "tuft",
    skin: "red",
  },
  harMogoi: {
    scale: 1.5,
    headGear: "none",
    weapon: "claws",
    stocky: true,
    hair: "tuft",
    skin: "grey",
  },
  talynHaragch: {
    scale: 1.08,
    headGear: "horns",
    weapon: "spear",
    stocky: true,
    hair: "curly",
    skin: "red",
  },
  shulmasynHuu: {
    scale: 0.95,
    headGear: "none",
    weapon: "claws",
    stocky: true,
    hair: "tuft",
    skin: "grey",
  },
  shidetHarvaach: {
    scale: 1.08,
    headGear: "skull",
    weapon: "bow",
    stocky: true,
    hair: "topknot",
    skin: "green",
  },
  shulmasynZarts: {
    scale: 1.28,
    headGear: "skull",
    weapon: "hammer",
    stocky: true,
    hair: "topknot",
    skin: "green",
  },
  shulmasynBaatar: {
    scale: 1.42,
    headGear: "both",
    weapon: "greatsword",
    stocky: true,
    hair: "curly",
    skin: "grey",
  },
};

function movingOf(enemy: RouteEnemy): boolean {
  return Math.hypot(enemy.vel.x, enemy.vel.y) > 8;
}

function palette(
  tone: SkinTone,
  flash: boolean,
): {
  skin: string;
  skinDark: string;
  skinMid: string;
  lip: string;
  lipDark: string;
  cloth: string;
} {
  if (tone === "red") {
    return {
      skin: flash ? "#d07068" : "#8a3834",
      skinDark: flash ? "#a04840" : "#5a201c",
      skinMid: flash ? "#b85850" : "#703028",
      lip: flash ? "#f0c8c0" : "#d8a098",
      lipDark: flash ? "#d09088" : "#a06860",
      cloth: flash ? "#e8e0d8" : "#d0c4bc",
    };
  }
  if (tone === "green") {
    return {
      skin: flash ? "#78a870" : "#3a6840",
      skinDark: flash ? "#508048" : "#244828",
      skinMid: flash ? "#649058" : "#305834",
      lip: flash ? "#d8e0c8" : "#b8c8a0",
      lipDark: flash ? "#a8b888" : "#788860",
      cloth: flash ? "#e8e4d8" : "#d0ccbe",
    };
  }
  if (tone === "blue") {
    return {
      skin: flash ? "#7a9ad0" : "#3a5a98",
      skinDark: flash ? "#5a7ab0" : "#2a4070",
      skinMid: flash ? "#6a8ac0" : "#345088",
      lip: flash ? "#e07080" : "#a02838",
      lipDark: flash ? "#c05060" : "#701820",
      cloth: flash ? "#8a6848" : "#4a3020",
    };
  }
  return {
    skin: flash ? "#7a6a78" : "#3a343e",
    skinDark: flash ? "#5a4a58" : "#252028",
    skinMid: flash ? "#6a5a68" : "#322c36",
    lip: flash ? "#d8c8c0" : "#c8b0a8",
    lipDark: flash ? "#b09890" : "#8a7068",
    cloth: flash ? "#e8e0e8" : "#d0c8d0",
  };
}

function drawOngodWeapon(
  ctx: CanvasRenderingContext2D,
  weapon: Weapon,
  flash: boolean,
  phase: RouteEnemy["phase"],
  attackKind: RouteEnemy["attackKind"],
): void {
  const bright = flash ? "#ffffff" : "#c8c4bc";
  const dark = flash ? "#a8a098" : "#2a2830";

  if (weapon === "spear") {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(20, 14);
    ctx.stroke();
    ctx.fillStyle = flash ? "#fff" : "#c84838";
    ctx.beginPath();
    ctx.moveTo(18, 8);
    ctx.lineTo(26, 18);
    ctx.lineTo(16, 16);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (weapon === "claws") {
    ctx.fillStyle = bright;
    for (const [ox, oy] of [
      [11, 4],
      [14, 2],
      [17, 5],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + 6, oy + 5);
      ctx.lineTo(ox + 1, oy + 4);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }

  if (weapon === "bow") {
    ctx.strokeStyle = flash ? "#d8b0ff" : "#6a4a88";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(15, -4, 12, -1.05, 1.05);
    ctx.stroke();
    ctx.strokeStyle = flash ? "rgba(255,255,255,0.55)" : "rgba(160,120,200,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, -15);
    ctx.lineTo(15, 7);
    ctx.stroke();
    ctx.fillStyle = flash ? "#e8d0ff" : "#a070d0";
    ctx.beginPath();
    ctx.arc(17, 3, 3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (weapon === "hammer") {
    ctx.save();
    ctx.translate(13, -6);
    ctx.rotate(phase === "windup" ? -0.5 : 0.28);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(4, 20);
    ctx.stroke();
    ctx.fillStyle = bright;
    ctx.beginPath();
    ctx.moveTo(-2, 16);
    ctx.lineTo(18, 12);
    ctx.lineTo(20, 28);
    ctx.lineTo(0, 30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(14, -12);
  let ang = 0.2;
  if (phase === "windup") {
    ang =
      attackKind === "bossOverhead"
        ? -1.0
        : attackKind === "bossSweep"
          ? -0.4
          : 0.05;
  } else if (phase === "attacking") {
    ang =
      attackKind === "bossOverhead"
        ? 0.7
        : attackKind === "bossSweep"
          ? 1.0
          : 0.15;
  }
  ctx.rotate(ang);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(6, 38);
  ctx.stroke();
  ctx.strokeStyle = bright;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(1, -4);
  ctx.lineTo(5, 34);
  ctx.stroke();
  ctx.fillStyle = flash ? "#fff" : "#5a4858";
  ctx.beginPath();
  ctx.moveTo(-6, 30);
  ctx.lineTo(18, 26);
  ctx.lineTo(20, 36);
  ctx.lineTo(-4, 38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  hy: number,
  style: HairStyle,
  flash: boolean,
): void {
  const hair = flash ? "#3a3040" : "#141018";
  ctx.fillStyle = hair;

  if (style === "topknot") {
    // Толгойн орой — бөөн үс + гэзэг
    ctx.beginPath();
    ctx.ellipse(0, hy - 7, 11, 6.5, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, hy - 15, 6.5, 6.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Хажуугийн долгион
    ctx.beginPath();
    ctx.ellipse(-9, hy - 2, 3.5, 5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(9, hy - 2, 3.5, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (style === "tuft") {
    // Богино буржгар + чихний дэргэд сэвсгэр
    ctx.beginPath();
    ctx.ellipse(0, hy - 8, 10.5, 7, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    for (const [ox, oy, rx, ry] of [
      [-6, hy - 12, 4, 3.5],
      [0, hy - 14, 4.5, 3.8],
      [6, hy - 12, 4, 3.5],
      [-9, hy - 6, 3.2, 3.8],
      [9, hy - 5, 3.5, 4.2],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // curly — бөөнөөр буржгар
  ctx.beginPath();
  ctx.ellipse(0, hy - 7, 11.5, 7.5, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.fill();
  for (const [ox, oy, r] of [
    [-8, hy - 11, 4.2],
    [-3, hy - 14, 4.5],
    [3, hy - 14, 4.5],
    [8, hy - 11, 4.2],
    [-10, hy - 5, 3.5],
    [10, hy - 5, 3.5],
    [0, hy - 10, 3.8],
  ] as const) {
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Мангас — том хамар, ярвайсан уруул, том чих, буржгар үс.
 * Алхалт аав ээж шиг walkPhase-аар.
 */
export function drawOngodDemon(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  flash: boolean,
  time: number,
): void {
  const style = STYLE[enemy.kind];
  const moving = movingOf(enemy);
  if (typeof enemy.walkPhase !== "number") enemy.walkPhase = 0;
  const walkCycle = moving ? Math.sin(enemy.walkPhase) : 0;
  const walk = walkCycle * 3.2;
  const bob = moving
    ? Math.abs(Math.sin(enemy.walkPhase)) * 1.4
    : Math.sin(time * 1.6 + enemy.id) * 0.35;
  const armSwing = moving
    ? -walkCycle * 2.8
    : enemy.phase === "attacking" || enemy.phase === "windup"
      ? -Math.sin(time * 10) * 3.5
      : -Math.sin(time * 1.4) * 0.5;

  const c = palette(style.skin, flash);
  const scale = style.scale;
  const bodyW = style.stocky ? 1.2 : 1.05;

  ctx.save();
  ctx.scale(scale, scale);

  // —— Хөл ——
  ctx.strokeStyle = c.skinDark;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5.5 * bodyW, 3 - bob * 0.2);
  ctx.lineTo(-7 * bodyW + walk * 0.7, 16);
  ctx.moveTo(5.5 * bodyW, 3 - bob * 0.2);
  ctx.lineTo(8 * bodyW - walk * 0.7, 16);
  ctx.stroke();
  ctx.fillStyle = c.skinDark;
  ctx.beginPath();
  ctx.ellipse(-8 * bodyW + walk * 0.7, 17, 5, 2.2, 0, 0, Math.PI * 2);
  ctx.ellipse(9 * bodyW - walk * 0.7, 17, 5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // —— Бие (бөөрөнхий, гэдэстэй) ——
  const bodyY = -1 - bob * 0.4;
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.ellipse(0, bodyY - 2, 12 * bodyW, style.stocky ? 13.5 : 11.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Гэдэс
  ctx.fillStyle = c.skinMid;
  ctx.beginPath();
  ctx.ellipse(0, bodyY + 3, 9 * bodyW, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.skinDark;
  ctx.beginPath();
  ctx.arc(1, bodyY + 5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Цагаан / цайвар нөмрөг
  ctx.fillStyle = c.cloth;
  ctx.beginPath();
  ctx.moveTo(-11 * bodyW, bodyY + 5);
  ctx.quadraticCurveTo(-12 * bodyW, bodyY + 16, -4 * bodyW, bodyY + 15);
  ctx.lineTo(4 * bodyW, bodyY + 15);
  ctx.quadraticCurveTo(12 * bodyW, bodyY + 16, 11 * bodyW, bodyY + 5);
  ctx.quadraticCurveTo(0, bodyY + 9, -11 * bodyW, bodyY + 5);
  ctx.closePath();
  ctx.fill();
  // Оосор
  ctx.strokeStyle = flash ? "#6a5860" : "#3a3038";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-10 * bodyW, bodyY + 6);
  ctx.quadraticCurveTo(0, bodyY + 4, 10 * bodyW, bodyY + 6);
  ctx.stroke();

  // —— Гар ——
  const shoulderY = bodyY - 9;
  ctx.strokeStyle = c.skin;
  ctx.lineWidth = 5.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10 * bodyW, shoulderY);
  ctx.lineTo(-13 * bodyW - armSwing * 0.3, shoulderY + 11 - armSwing * 0.15);
  ctx.moveTo(10 * bodyW, shoulderY);
  ctx.lineTo(13 * bodyW + armSwing * 0.25, shoulderY + 11 + armSwing * 0.1);
  ctx.stroke();
  // Бугуйвч (том дүрсэнд)
  if (style.stocky && style.scale >= 1.2) {
    ctx.fillStyle = flash ? "#f0ece8" : "#e8e4dc";
    ctx.beginPath();
    ctx.ellipse(
      -12 * bodyW - armSwing * 0.2,
      shoulderY + 3.5,
      3.4,
      2.6,
      -0.2,
      0,
      Math.PI * 2,
    );
    ctx.ellipse(
      12 * bodyW + armSwing * 0.15,
      shoulderY + 3.5,
      3.4,
      2.6,
      0.2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(
    -13.5 * bodyW - armSwing * 0.3,
    shoulderY + 13 - armSwing * 0.15,
    3.4,
    0,
    Math.PI * 2,
  );
  ctx.arc(
    13.5 * bodyW + armSwing * 0.25,
    shoulderY + 13 + armSwing * 0.1,
    3.4,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // —— Толгой ——
  const hy = bodyY - 20;
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.ellipse(0, hy, 11, 11.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Том чих
  ctx.fillStyle = c.skinMid;
  ctx.beginPath();
  ctx.ellipse(-11.5, hy - 1, 4.2, 5.5, -0.25, 0, Math.PI * 2);
  ctx.ellipse(11.5, hy - 1, 4.2, 5.5, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.skinDark;
  ctx.beginPath();
  ctx.ellipse(-11.5, hy - 1, 2.2, 3.2, -0.25, 0, Math.PI * 2);
  ctx.ellipse(11.5, hy - 1, 2.2, 3.2, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Үс
  drawHair(ctx, hy, style.hair, flash);

  // Эвэр / гавал
  if (style.headGear === "horns" || style.headGear === "both") {
    ctx.fillStyle = c.skinDark;
    ctx.beginPath();
    ctx.moveTo(-7, hy - 10);
    ctx.lineTo(-13, hy - 26);
    ctx.lineTo(-2, hy - 14);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7, hy - 10);
    ctx.lineTo(13, hy - 26);
    ctx.lineTo(2, hy - 14);
    ctx.closePath();
    ctx.fill();
  }
  if (style.headGear === "skull" || style.headGear === "both") {
    const sy = hy - (style.headGear === "both" ? 22 : 19);
    ctx.fillStyle = flash ? "#ffffff" : "#f2eee6";
    ctx.beginPath();
    ctx.ellipse(0, sy, 5.2, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1818";
    ctx.beginPath();
    ctx.ellipse(-2, sy - 0.4, 1.3, 1.5, 0, 0, Math.PI * 2);
    ctx.ellipse(2.1, sy - 0.4, 1.3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-1.4, sy + 2.2);
    ctx.lineTo(-0.4, sy + 4.2);
    ctx.lineTo(0.3, sy + 2.2);
    ctx.moveTo(0.7, sy + 2.2);
    ctx.lineTo(1.7, sy + 4.2);
    ctx.lineTo(2.3, sy + 2.2);
    ctx.fill();
  }

  // —— НҮҮР: жижиг цагаан нүд (зураг шиг) ——
  ctx.fillStyle = "#f8f4ec";
  ctx.beginPath();
  ctx.arc(-4.2, hy - 2.5, 2.15, 0, Math.PI * 2);
  ctx.arc(4.6, hy - 2.5, 2.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0c0a10";
  ctx.beginPath();
  ctx.arc(-4.1, hy - 2.3, 0.7, 0, Math.PI * 2);
  ctx.arc(4.7, hy - 2.3, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // —— ХАМАР (жижиг, ирмэг зөөлөн) ——
  const nx = 0.4;
  const ny = hy + 3.2;
  const noseG = ctx.createRadialGradient(nx - 1, ny - 1.2, 0.5, nx, ny, 5.2);
  noseG.addColorStop(0, c.skinMid);
  noseG.addColorStop(0.62, c.skinMid);
  noseG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = noseG;
  ctx.beginPath();
  ctx.ellipse(nx, ny, 4.6, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Хамрын нүх — зөөлөн
  const nostrilG = ctx.createRadialGradient(nx, ny + 0.6, 0, nx, ny + 0.6, 3.4);
  nostrilG.addColorStop(0, c.skinDark);
  nostrilG.addColorStop(0.55, c.skinDark);
  nostrilG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = nostrilG;
  ctx.beginPath();
  ctx.ellipse(nx - 1.7, ny + 0.9, 1.15, 0.8, -0.35, 0, Math.PI * 2);
  ctx.ellipse(nx + 2.1, ny + 0.9, 1.15, 0.8, 0.35, 0, Math.PI * 2);
  ctx.fill();

  // —— ХҮНИЙ ХЭЛБЭРТЭЙ УРУУЛ (жижиг, ирмэг бүрсийтэй) ——
  const mouthOpen =
    enemy.phase === "attacking" ||
    enemy.phase === "windup" ||
    Math.sin(time * 2.2 + enemy.id) > 0.55;
  const mx = 0.4;
  const my = hy + 9.2;
  const openY = mouthOpen ? 1.7 : 0.4;
  const lipW = 5.8;
  const lipH = 3.6;

  // Арьс→уруулын уусгалт (гадна зөөлөн толбо)
  const lipBlend = ctx.createRadialGradient(mx, my + 1.2, 1, mx, my + 1.5, lipW + 2.2);
  lipBlend.addColorStop(0, c.lip);
  lipBlend.addColorStop(0.45, c.lip);
  lipBlend.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = lipBlend;
  ctx.beginPath();
  ctx.ellipse(mx, my + 1.4, lipW + 1.8, lipH + 1.2 + openY * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Доод уруул
  ctx.fillStyle = c.lip;
  ctx.beginPath();
  ctx.moveTo(mx - lipW, my);
  ctx.bezierCurveTo(
    mx - lipW + 0.4,
    my + lipH * 0.85 + openY,
    mx - 2.2,
    my + lipH + openY,
    mx,
    my + lipH * 0.95 + openY,
  );
  ctx.bezierCurveTo(
    mx + 2.2,
    my + lipH + openY,
    mx + lipW - 0.4,
    my + lipH * 0.85 + openY,
    mx + lipW,
    my,
  );
  ctx.bezierCurveTo(mx + 4.0, my + 1.0, mx + 1.6, my + 1.1, mx, my + 1.05);
  ctx.bezierCurveTo(mx - 1.6, my + 1.1, mx - 4.0, my + 1.0, mx - lipW, my);
  ctx.closePath();
  ctx.fill();

  // Дээд уруул — cupid's bow
  ctx.fillStyle = c.lipDark;
  ctx.beginPath();
  ctx.moveTo(mx - lipW + 0.15, my);
  ctx.bezierCurveTo(mx - 4.0, my - 0.15, mx - 2.8, my - 1.9, mx - 1.45, my - 2.05);
  ctx.quadraticCurveTo(mx - 0.65, my - 1.15, mx, my - 1.45);
  ctx.quadraticCurveTo(mx + 0.65, my - 1.15, mx + 1.45, my - 2.05);
  ctx.bezierCurveTo(mx + 2.8, my - 1.9, mx + 4.0, my - 0.15, mx + lipW - 0.15, my);
  ctx.bezierCurveTo(mx + 3.5, my + 0.65, mx + 1.45, my + 0.72, mx, my + 0.7);
  ctx.bezierCurveTo(mx - 1.45, my + 0.72, mx - 3.5, my + 0.65, mx - lipW + 0.15, my);
  ctx.closePath();
  ctx.fill();

  // Уруулын ирмэгийн зөөлөн зураас
  ctx.strokeStyle = flash ? "rgba(255,230,220,0.22)" : "rgba(40,20,18,0.22)";
  ctx.lineWidth = 1.0;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(mx - lipW + 0.4, my + 0.05);
  ctx.quadraticCurveTo(mx, my + 0.85 + openY * 0.3, mx + lipW - 0.4, my + 0.05);
  ctx.stroke();

  if (mouthOpen) {
    ctx.fillStyle = flash ? "#803040" : "#4a1820";
    ctx.beginPath();
    ctx.moveTo(mx - 4.0, my + 0.15);
    ctx.quadraticCurveTo(mx, my + openY + 0.55, mx + 4.0, my + 0.15);
    ctx.quadraticCurveTo(mx, my + openY + 1.9, mx - 4.0, my + 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f0e8e0";
    for (const tx of [-2.2, -0.7, 0.7, 2.2] as const) {
      ctx.fillRect(mx + tx - 0.5, my - 0.05, 1.0, 1.35);
    }
  } else {
    ctx.strokeStyle = flash ? "rgba(40,20,20,0.4)" : "rgba(30,12,12,0.48)";
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.moveTo(mx - 4.5, my + 0.12);
    ctx.quadraticCurveTo(mx, my + 0.85, mx + 4.5, my + 0.12);
    ctx.stroke();
  }

  drawOngodWeapon(ctx, style.weapon, flash, enemy.phase, enemy.attackKind);

  if (enemy.phase === "windup" && style.weapon !== "bow") {
    ctx.save();
    ctx.shadowColor = "#ffd35a";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `rgba(242,196,90,${0.45 + Math.sin(time * 12) * 0.15})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, bodyY - 4, 38 + scale * 4, -0.7, 0.7);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
