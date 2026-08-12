// Доод тивийн мангасууд — Лалар, Бар хул, Чөтгөр, Харваач чөтгөр, Долоон толгойтой…

import type { RouteEnemy, RouteEnemyKind } from "../types";

function movingOf(enemy: RouteEnemy): boolean {
  return Math.hypot(enemy.vel.x, enemy.vel.y) > 8;
}

/** Тоглогч шиг ээлжлэн алхах хөл — hipY-ээс доош */
function drawAlternatingLegs(
  ctx: CanvasRenderingContext2D,
  hipY: number,
  walkPhase: number,
  moving: boolean,
  color: string,
  footColor: string,
  opts?: {
    hipSpan?: number;
    legLen?: number;
    lineW?: number;
    limpRight?: boolean;
  },
): void {
  const hipSpan = opts?.hipSpan ?? 5.5;
  const legLen = opts?.legLen ?? 16;
  const lineW = opts?.lineW ?? 5;
  const limpRight = opts?.limpRight ?? false;
  const cycle = moving ? Math.sin(walkPhase) : 0;
  const stride = moving ? cycle * 4.2 : 0;
  const leftLift = moving ? Math.max(0, -cycle) * 3.2 : 0;
  const rightLift = moving ? Math.max(0, cycle) * (limpRight ? 1.4 : 3.2) : 0;
  const rightStride = limpRight ? stride * 0.45 : stride;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Зүүн
  const lHip = -hipSpan;
  const lFootX = lHip + stride;
  const lFootY = hipY + legLen - leftLift;
  const lKneeX = (lHip + lFootX) * 0.5 + stride * 0.15;
  const lKneeY = hipY + legLen * 0.45 - leftLift * 0.5;
  ctx.beginPath();
  ctx.moveTo(lHip, hipY);
  ctx.lineTo(lKneeX, lKneeY);
  ctx.lineTo(lFootX, lFootY);
  ctx.stroke();

  // Баруун
  const rHip = hipSpan;
  const rFootX = rHip - rightStride + (limpRight && moving ? 2.5 : 0);
  const rFootY = hipY + legLen - rightLift + (limpRight ? 1.5 : 0);
  const rKneeX = (rHip + rFootX) * 0.5 - rightStride * 0.15;
  const rKneeY = hipY + legLen * 0.45 - rightLift * 0.5;
  ctx.beginPath();
  ctx.moveTo(rHip, hipY);
  ctx.lineTo(rKneeX, rKneeY);
  ctx.lineTo(rFootX, rFootY);
  ctx.stroke();

  ctx.fillStyle = footColor;
  ctx.beginPath();
  ctx.ellipse(lFootX, lFootY + 1.2, 4.2, 2.1, 0.05, 0, Math.PI * 2);
  ctx.ellipse(rFootX, rFootY + 1.2, 4.2, 2.1, -0.05, 0, Math.PI * 2);
  ctx.fill();
}

/** Лалар — өндөр урт гар хөл, зовхитой нүд, гараар цохино */
function drawLalar(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  flash: boolean,
  time: number,
): void {
  const s = 1.35;
  const moving = movingOf(enemy);
  if (typeof enemy.walkPhase !== "number") enemy.walkPhase = 0;
  const bob = moving
    ? Math.abs(Math.sin(enemy.walkPhase)) * 1.2
    : Math.sin(time * 1.5 + enemy.id) * 0.35;

  const punching = enemy.phase === "attacking";
  const winding = enemy.phase === "windup";
  const windMax = 0.88;
  const atkMax = 0.22;
  const punchT = winding
    ? Math.max(0, Math.min(1, 1 - enemy.phaseTimer / windMax))
    : punching
      ? Math.max(0, Math.min(1, 1 - enemy.phaseTimer / atkMax))
      : 0;
  const walkArm = moving ? -Math.sin(enemy.walkPhase) * 2.4 : Math.sin(time * 1.4) * 0.45;

  const skin = flash ? "#f0d2b4" : "#e2bc94";
  const skinMid = flash ? "#d8b090" : "#c89a72";
  const skinDark = flash ? "#b88860" : "#8a6040";
  const nipple = flash ? "#c07068" : "#9a5048";
  const nippleDark = flash ? "#8a4038" : "#6a3028";
  const shorts = flash ? "#4a4850" : "#1a181c";
  const shortsEdge = flash ? "#6a6870" : "#2a282c";
  const mouthIn = flash ? "#802030" : "#3a1018";
  const tongue = flash ? "#ff4058" : "#d01828";
  const sclera = flash ? "#fff8f0" : "#f4eee6";

  ctx.save();
  ctx.scale(s, s);

  const by = -10 - bob;

  // —— Ээлжлэн алхах хөл ——
  drawAlternatingLegs(
    ctx,
    by + 12,
    enemy.walkPhase,
    moving,
    skin,
    skinDark,
    { hipSpan: 5, legLen: 18, lineW: 5.2 },
  );

  // —— Хар урагдсан шорт ——
  ctx.fillStyle = shorts;
  ctx.beginPath();
  ctx.moveTo(-10, by + 6);
  ctx.lineTo(-11, by + 15);
  ctx.lineTo(-7, by + 14);
  ctx.lineTo(-4, by + 16);
  ctx.lineTo(0, by + 13);
  ctx.lineTo(3, by + 16);
  ctx.lineTo(7, by + 14);
  ctx.lineTo(11, by + 16);
  ctx.lineTo(11, by + 7);
  ctx.quadraticCurveTo(0, by + 9, -10, by + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shortsEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-11, by + 15);
  ctx.lineTo(-7, by + 14);
  ctx.lineTo(-4, by + 16);
  ctx.lineTo(0, by + 13);
  ctx.lineTo(3, by + 16);
  ctx.lineTo(7, by + 14);
  ctx.lineTo(11, by + 16);
  ctx.stroke();

  // —— Өндөр цээж / бие — дугуй мөртэй ——
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-8, by - 16);
  ctx.quadraticCurveTo(-14, by - 17, -16, by - 10);
  ctx.quadraticCurveTo(-17, by - 2, -15, by + 4);
  ctx.quadraticCurveTo(-14, by + 10, -10, by + 11);
  ctx.lineTo(10, by + 11);
  ctx.quadraticCurveTo(14, by + 10, 15, by + 4);
  ctx.quadraticCurveTo(17, by - 2, 16, by - 10);
  ctx.quadraticCurveTo(14, by - 17, 8, by - 16);
  ctx.quadraticCurveTo(0, by - 18.5, -8, by - 16);
  ctx.closePath();
  ctx.fill();
  // Жинхэнэ мөр — бөөрөнхий
  ctx.beginPath();
  ctx.ellipse(-13.5, by - 11, 5.2, 4.4, -0.25, 0, Math.PI * 2);
  ctx.ellipse(13.5, by - 11, 5.2, 4.4, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Мөрний товгор — нүдний суурь (биеэс ургасан)
  ctx.fillStyle = skinMid;
  ctx.beginPath();
  ctx.ellipse(0, by - 17.5, 8.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, by - 18.2, 7.2, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Хоёр мээмний толгой — зайтай, сүүдэргүй
  for (const nx of [-8.8, 8.8] as const) {
    const ny = by - 5;
    ctx.fillStyle = nipple;
    ctx.beginPath();
    ctx.arc(nx, ny, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = nippleDark;
    ctx.beginPath();
    ctx.arc(nx, ny, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // —— Гар: цохилт ——
  // Зүүн гар — тулгуур / хойш
  const leftPull = winding ? -4 - punchT * 6 : punching ? 2 : walkArm;
  ctx.strokeStyle = skin;
  ctx.lineWidth = 5.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-14, by - 10);
  ctx.quadraticCurveTo(
    -20 + leftPull * 0.3,
    by - 2,
    -22 + leftPull * 0.5,
    by + 12,
  );
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(-22.5 + leftPull * 0.5, by + 13.5, 3.3, 0, Math.PI * 2);
  ctx.fill();

  // Баруун гар — гол цохилт
  let rx: number;
  let ry: number;
  let fistScale = 1;
  if (winding) {
    // Хойш татна
    rx = 14 - punchT * 8;
    ry = by - 6 - punchT * 10;
    fistScale = 1.05;
  } else if (punching) {
    // Урагш цохино
    const ease = punchT < 0.45 ? punchT / 0.45 : 1 - (punchT - 0.45) / 0.55;
    rx = 18 + ease * 22;
    ry = by - 4 + ease * 6;
    fistScale = 1.15 + ease * 0.25;
  } else {
    rx = 18 + walkArm * 0.4;
    ry = by + 6;
  }

  ctx.strokeStyle = skin;
  ctx.lineWidth = 5.6;
  ctx.beginPath();
  ctx.moveTo(14, by - 10);
  ctx.quadraticCurveTo(
    winding ? 8 : punching ? 20 : 18,
    winding ? by - 14 : by - 2,
    rx,
    ry,
  );
  ctx.stroke();

  // Нударга
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(rx + 1.5, ry + 1, 4.2 * fistScale, 3.6 * fistScale, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skinDark;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(rx + 2, ry + 1.2, 2.4 * fistScale, 2.0 * fistScale, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Хурууны хээ
  ctx.strokeStyle = skinDark;
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(rx + 0.5 + i * 1.3, ry - 0.5, 1.6 * fistScale, -0.4, 0.9);
    ctx.stroke();
  }

  // Цохилтын шугам
  if (punching && punchT < 0.55) {
    const a = 0.45 * (1 - punchT / 0.55);
    ctx.strokeStyle = `rgba(255,220,180,${a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx - 10, ry - 2);
    ctx.lineTo(rx - 2, ry);
    ctx.stroke();
  }

  // —— Зовхитой нүд (биеэс ургасан, цагаантай) ——
  const ey = by - 18.8;
  // Доод зовхи / арьсны хонхор
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(0, ey + 1.8, 6.8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Цагаан (sclera)
  ctx.fillStyle = sclera;
  ctx.beginPath();
  ctx.ellipse(0, ey, 5.6, 4.8, 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Хар нүдний цөм / нүх
  ctx.fillStyle = flash ? "#1a1010" : "#0a0606";
  ctx.beginPath();
  ctx.ellipse(0.3, ey + 0.3, 2.6, 2.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#020101";
  ctx.beginPath();
  ctx.ellipse(0.4, ey + 0.5, 1.5, 1.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Гялбаа
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(-0.9, ey - 1.0, 0.85, 0, Math.PI * 2);
  ctx.fill();

  // Дээд зовхи — арьс
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-6.2, ey - 0.5);
  ctx.quadraticCurveTo(-4, ey - 5.2, 0, ey - 5.6);
  ctx.quadraticCurveTo(4, ey - 5.2, 6.2, ey - 0.5);
  ctx.quadraticCurveTo(3, ey - 2.2, 0, ey - 2.4);
  ctx.quadraticCurveTo(-3, ey - 2.2, -6.2, ey - 0.5);
  ctx.closePath();
  ctx.fill();
  // Зовхины атираа
  ctx.strokeStyle = skinDark;
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(-5.5, ey - 1.2);
  ctx.quadraticCurveTo(0, ey - 3.6, 5.5, ey - 1.2);
  ctx.stroke();

  // Доод зовхи
  ctx.fillStyle = skinMid;
  ctx.beginPath();
  ctx.moveTo(-5.8, ey + 1.2);
  ctx.quadraticCurveTo(0, ey + 4.8, 5.8, ey + 1.2);
  ctx.quadraticCurveTo(0, ey + 2.6, -5.8, ey + 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = skinDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5.2, ey + 1.5);
  ctx.quadraticCurveTo(0, ey + 3.8, 5.2, ey + 1.5);
  ctx.stroke();

  // Нүдний булангийн арьс (наалдсан харагдуулахгүй)
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(-5.8, ey, 2.2, 2.8, -0.3, 0, Math.PI * 2);
  ctx.ellipse(5.8, ey, 2.2, 2.8, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // —— Гэдсний том ам ——
  const mouthOpen =
    punching ||
    winding ||
    Math.sin(time * 2.5 + enemy.id) > 0.25;
  const my = by + 1;
  const openH = mouthOpen ? 5.8 : 3.2;

  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(0, my, 9.5, openH + 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mouthIn;
  ctx.beginPath();
  ctx.ellipse(0, my, 8.2, openH, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = flash ? "#fff8f0" : "#f2ebe4";
  ctx.beginPath();
  ctx.moveTo(-3.8, my - openH * 0.75);
  ctx.lineTo(-2.2, my + openH * 0.15);
  ctx.lineTo(-0.8, my - openH * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.8, my - openH * 0.7);
  ctx.lineTo(2.2, my + openH * 0.15);
  ctx.lineTo(3.8, my - openH * 0.75);
  ctx.closePath();
  ctx.fill();
  for (const tx of [-6, 6] as const) {
    ctx.beginPath();
    ctx.moveTo(tx - 0.9, my - openH * 0.55);
    ctx.lineTo(tx, my - openH * 0.05);
    ctx.lineTo(tx + 0.9, my - openH * 0.55);
    ctx.closePath();
    ctx.fill();
  }

  const flick = Math.sin(time * 8 + enemy.id) * 2.5;
  ctx.strokeStyle = tongue;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, my + openH * 0.2);
  ctx.bezierCurveTo(
    4 + flick * 0.3,
    my + openH + 4,
    10 + flick,
    my + openH + 8,
    14 + flick * 0.5,
    my + openH + 3,
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14 + flick * 0.5, my + openH + 3);
  ctx.lineTo(17 + flick * 0.5, my + openH + 1);
  ctx.moveTo(14 + flick * 0.5, my + openH + 3);
  ctx.lineTo(17 + flick * 0.5, my + openH + 5.5);
  ctx.stroke();

  ctx.restore();
}

/** Бар хул — ирвэс шиг урт бие, толбот үс, бөөрөнхий чих */
function drawBarHul(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  flash: boolean,
  time: number,
): void {
  const s = 1.28;
  const moving = movingOf(enemy);
  if (typeof enemy.walkPhase !== "number") enemy.walkPhase = 0;
  const walk = moving ? Math.sin(enemy.walkPhase) : 0;
  const bob = moving
    ? Math.abs(Math.sin(enemy.walkPhase)) * 1.1
    : Math.sin(time * 1.3 + enemy.id) * 0.22;
  const winding = enemy.phase === "windup";
  const striking = enemy.phase === "attacking";
  const animT = winding
    ? Math.max(0, Math.min(1, 1 - enemy.phaseTimer / 0.56))
    : striking
      ? Math.max(0, Math.min(1, 1 - enemy.phaseTimer / 0.16))
      : 0;
  const crouch = winding ? animT * 3.5 : striking ? Math.max(0, 1 - animT * 2) * 1.5 : 0;
  const lunge = winding
    ? -animT * 4
    : striking
      ? Math.min(1, animT * 2.5) * 14
      : 0;
  const snarl = winding || striking || Math.sin(time * 2.4 + enemy.id) > 0.2;

  const fur = flash ? "#e8c070" : "#c99848";
  const furMid = flash ? "#d0a050" : "#a87838";
  const furDark = flash ? "#8a6028" : "#5a3c18";
  const belly = flash ? "#f0e0c0" : "#d8c8a0";
  const spot = flash ? "#3a2818" : "#1a1008";
  const paw = flash ? "#4a3020" : "#201408";

  ctx.save();
  ctx.scale(s, s);

  const by = 0 - bob + crouch;
  const fl = walk * 2.4 + (striking ? animT * 3 : winding ? -animT * 1.5 : 0);
  const tw = Math.sin(time * 2.2) * 2.2;

  // —— Сүүл: урт, бөөрөнхий үзүүртэй ——
  ctx.strokeStyle = furMid;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, by + 2);
  ctx.bezierCurveTo(-28, by + 4 + tw * 0.3, -34, by - 10 + tw, -26, by - 18 + tw);
  ctx.bezierCurveTo(-20, by - 24, -10 + tw * 0.2, by - 20, -8, by - 12);
  ctx.stroke();
  // Сүүлийн толбо
  ctx.fillStyle = spot;
  ctx.globalAlpha = 0.85;
  for (const [sx, sy] of [
    [-24, by - 8 + tw * 0.4],
    [-28, by - 14 + tw],
    [-20, by - 18 + tw * 0.6],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 1.6, 1.1, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.ellipse(-8, by - 11, 3.2, 2.6, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // —— Хойд хөл (булчинтай) ——
  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.moveTo(-14, by + 1);
  ctx.quadraticCurveTo(-18 + fl * 0.2, by + 8, -16 + fl * 0.3, by + 17);
  ctx.lineTo(-10 + fl * 0.3, by + 17);
  ctx.quadraticCurveTo(-8, by + 9, -6, by + 1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, by + 2);
  ctx.quadraticCurveTo(-4 - fl * 0.15, by + 10, -2 - fl * 0.2, by + 17);
  ctx.lineTo(3 - fl * 0.2, by + 16.5);
  ctx.quadraticCurveTo(2, by + 8, 0, by + 1);
  ctx.closePath();
  ctx.fill();

  // —— Урд хөл — дайралт ——
  const frontReach = lunge;
  const pawLift = winding ? -animT * 6 : striking ? -8 : 0;
  ctx.fillStyle = furMid;
  ctx.beginPath();
  ctx.moveTo(6, by);
  ctx.quadraticCurveTo(
    10 + fl * 0.4 + frontReach * 0.4,
    by + 7 + pawLift * 0.4,
    12 + fl * 0.7 + frontReach,
    by + 16 + pawLift,
  );
  ctx.lineTo(17 + fl * 0.7 + frontReach, by + 15.5 + pawLift);
  ctx.quadraticCurveTo(14 + frontReach * 0.3, by + 6, 10, by - 1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, by - 1);
  ctx.quadraticCurveTo(
    14 + fl * 0.5 + frontReach * 0.5,
    by + 5 + pawLift * 0.5,
    18 + fl + frontReach * 1.1,
    by + 14 + pawLift,
  );
  ctx.lineTo(23 + fl + frontReach * 1.1, by + 13.5 + pawLift);
  ctx.quadraticCurveTo(16 + frontReach * 0.4, by + 3, 12, by - 3);
  ctx.closePath();
  ctx.fill();

  // Самнуур
  ctx.fillStyle = paw;
  ctx.beginPath();
  ctx.ellipse(-14 + fl * 0.3, by + 18, 3.8, 2.2, 0.05, 0, Math.PI * 2);
  ctx.ellipse(-1 - fl * 0.2, by + 17.5, 3.6, 2.1, 0, 0, Math.PI * 2);
  ctx.ellipse(14 + fl * 0.7 + frontReach, by + 16.5 + pawLift, 3.8, 2.2, 0.08, 0, Math.PI * 2);
  ctx.ellipse(20 + fl + frontReach * 1.1, by + 14.5 + pawLift, 3.6, 2.1, 0.05, 0, Math.PI * 2);
  ctx.fill();
  if (winding || striking) {
    ctx.fillStyle = flash ? "#f0e8e0" : "#e8e0d8";
    for (const px of [
      14 + fl * 0.7 + frontReach,
      20 + fl + frontReach * 1.1,
    ] as const) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(px + i * 1.8, by + 14 + pawLift);
        ctx.lineTo(px + i * 1.8, by + 9 + pawLift - (striking ? 2 : 0));
        ctx.lineTo(px + i * 1.8 + 1.1, by + 14.5 + pawLift);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // —— Бие: урт, намхан ирвэс ——
  const bodyG = ctx.createLinearGradient(-18, by - 12, 14 + lunge * 0.3, by + 8);
  bodyG.addColorStop(0, fur);
  bodyG.addColorStop(0.5, furMid);
  bodyG.addColorStop(1, furDark);
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.ellipse(lunge * 0.25, by - 1, 18, 8.2, -0.12 - (striking ? 0.08 : 0), 0, Math.PI * 2);
  ctx.fill();
  // Гэдэс цайвар
  ctx.fillStyle = belly;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(2 + lunge * 0.2, by + 3, 12, 4.2, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Биеийн толбо (ирвэс)
  ctx.fillStyle = spot;
  const spots: Array<[number, number, number, number]> = [
    [-10, by - 5, 2.2, 1.5],
    [-4, by - 7, 2.0, 1.4],
    [2, by - 6, 2.4, 1.6],
    [8, by - 4, 1.8, 1.3],
    [-8, by - 1, 1.6, 1.2],
    [-1, by - 2, 2.0, 1.3],
    [6, by - 1, 1.7, 1.2],
    [-12, by + 1, 1.5, 1.1],
    [3, by + 1, 1.8, 1.2],
  ];
  for (const [sx, sy, rx, ry] of spots) {
    ctx.beginPath();
    ctx.ellipse(sx + lunge * 0.2, sy, rx, ry, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // —— Толгой: ирвэс (бөөрөнхий чих, урт хошуу) ——
  const hx = 16 + lunge * 0.85;
  const hy = by - 7 - (winding ? animT * 2 : 0);
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 7.2, 6.4, 0.08, 0, Math.PI * 2);
  ctx.fill();
  // Хошуу
  ctx.fillStyle = furMid;
  ctx.beginPath();
  ctx.ellipse(hx + 5.5, hy + 1.5, 5.0, 3.8, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.ellipse(hx + 5, hy + 3, 3.5, 2.2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Бөөрөнхий чих (каракал биш)
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(hx - 3.5, hy - 6.5, 3.0, 3.4, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + 3.2, hy - 6.8, 2.8, 3.2, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c88870";
  ctx.beginPath();
  ctx.ellipse(hx - 3.5, hy - 6.2, 1.5, 1.8, -0.25, 0, Math.PI * 2);
  ctx.ellipse(hx + 3.2, hy - 6.5, 1.4, 1.7, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Толгойн толбо
  ctx.fillStyle = spot;
  ctx.beginPath();
  ctx.ellipse(hx - 1, hy - 2, 1.3, 1.0, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + 2.5, hy - 3, 1.1, 0.9, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + 1, hy + 0.5, 1.0, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Нүд
  ctx.fillStyle = flash ? "#f0d860" : "#d8b030";
  ctx.beginPath();
  ctx.ellipse(hx - 0.5, hy - 1.2, 1.9, 1.7, -0.1, 0, Math.PI * 2);
  ctx.ellipse(hx + 4.2, hy - 1.4, 1.9, 1.7, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#100808";
  ctx.beginPath();
  ctx.ellipse(hx - 0.2, hy - 1.0, 0.65, 1.0, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + 4.5, hy - 1.2, 0.65, 1.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // Хамар
  ctx.fillStyle = paw;
  ctx.beginPath();
  ctx.moveTo(hx + 8.5, hy + 1.2);
  ctx.lineTo(hx + 7.2, hy + 2.8);
  ctx.lineTo(hx + 9.8, hy + 2.8);
  ctx.closePath();
  ctx.fill();

  // Ам / соёо
  const open = snarl ? (striking ? 4.2 : 3.2) : 1.2;
  ctx.fillStyle = flash ? "#902030" : "#501018";
  ctx.beginPath();
  ctx.ellipse(hx + 6.5, hy + 4.5, 4.2, open, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2ebe4";
  for (const tx of [4.2, 6.5, 8.8] as const) {
    ctx.beginPath();
    ctx.moveTo(hx + tx - 0.9, hy + 3.2);
    ctx.lineTo(hx + tx, hy + 3.2 + open * 0.85);
    ctx.lineTo(hx + tx + 0.9, hy + 3.2);
    ctx.closePath();
    ctx.fill();
  }
  if (snarl) {
    ctx.fillStyle = flash ? "#e04858" : "#b03040";
    ctx.beginPath();
    ctx.ellipse(hx + 6.5, hy + 5.0, 2.0, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Долоон толгойтой доголон хар мангас — номын зургийн загвар */
function drawSevenHeadMonster(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  flash: boolean,
  time: number,
): void {
  const moving = movingOf(enemy);
  if (typeof enemy.walkPhase !== "number") enemy.walkPhase = 0;
  const limpPhase = enemy.walkPhase * 0.85;
  const bob = moving
    ? Math.abs(Math.sin(limpPhase)) * 1.4
    : Math.sin(time * 1.2 + enemy.id) * 0.3;

  const skin = flash ? "#3a383c" : "#121014";
  const skinMid = flash ? "#2e2c30" : "#0e0c10";
  const skinDark = flash ? "#222024" : "#08060a";
  const cloth = flash ? "#2a2428" : "#0a080c";
  const face = skin;
  const faceDark = skinMid;
  const hair = skinMid;
  const hairDark = skinDark;
  const claw = flash ? "#1a181c" : "#050408";
  const tongue = flash ? "#ff5068" : "#d01830";

  const winding = enemy.phase === "windup";
  const punching = enemy.phase === "attacking";
  const windMax =
    enemy.attackKind === "bossCharge"
      ? 0.52
      : enemy.attackKind === "bossOverhead"
        ? 0.86
        : 0.68;
  const atkMax =
    enemy.attackKind === "bossCharge"
      ? 0.58
      : enemy.attackKind === "bossOverhead"
        ? 0.24
        : 0.3;
  const punchT = winding
    ? Math.max(0, Math.min(1, 1 - enemy.phaseTimer / windMax))
    : punching
      ? Math.max(0, Math.min(1, 1 - enemy.phaseTimer / atkMax))
      : 0;
  const walkArm = moving
    ? -Math.sin(limpPhase) * 2.2
    : Math.sin(time * 1.3) * 0.5;

  ctx.save();
  ctx.scale(1.68, 1.68);

  const by = -4 - bob;

  // —— Хүний хөл (доголон: баруун богино алхаа) ——
  drawAlternatingLegs(
    ctx,
    by + 14,
    limpPhase,
    moving,
    skin,
    skinDark,
    { hipSpan: 5, legLen: 17, lineW: 5.4, limpRight: true },
  );

  // —— Өмсгөл ——
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(-11, by + 8);
  ctx.lineTo(-12, by + 16);
  ctx.lineTo(-6, by + 15);
  ctx.lineTo(0, by + 17);
  ctx.lineTo(6, by + 15);
  ctx.lineTo(12, by + 16);
  ctx.lineTo(11, by + 8);
  ctx.quadraticCurveTo(0, by + 10, -11, by + 8);
  ctx.closePath();
  ctx.fill();

  // —— Хүний цээж / бие ——
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-9, by - 18);
  ctx.quadraticCurveTo(-15, by - 19, -17, by - 12);
  ctx.quadraticCurveTo(-18, by - 2, -15, by + 6);
  ctx.quadraticCurveTo(-13, by + 11, -9, by + 12);
  ctx.lineTo(9, by + 12);
  ctx.quadraticCurveTo(13, by + 11, 15, by + 6);
  ctx.quadraticCurveTo(18, by - 2, 17, by - 12);
  ctx.quadraticCurveTo(15, by - 19, 9, by - 18);
  ctx.quadraticCurveTo(0, by - 20.5, -9, by - 18);
  ctx.closePath();
  ctx.fill();
  // Өргөн мөр
  ctx.beginPath();
  ctx.ellipse(-14, by - 13, 5.5, 4.6, -0.2, 0, Math.PI * 2);
  ctx.ellipse(14, by - 13, 5.5, 4.6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Цээжний сүүдэр
  ctx.fillStyle = skinDark;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(0, by - 2, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // —— Гар: цохилтын анимэйшн ——
  const drawFist = (fx: number, fy: number, scale = 1, ang = 0.15) => {
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 4.4 * scale, 3.8 * scale, ang, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skinDark;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(fx + 0.6, fy + 0.4, 2.4 * scale, 2 * scale, ang, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = claw;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(fx - 1.5 + i * 1.6, fy - 1.5);
      ctx.lineTo(fx - 2.2 + i * 1.6, fy + 3.5 * scale);
      ctx.lineTo(fx - 0.4 + i * 1.6, fy + 2.8 * scale);
      ctx.closePath();
      ctx.fill();
    }
  };

  // Зүүн гар
  let lx: number;
  let ly: number;
  if (winding && enemy.attackKind === "bossOverhead") {
    lx = -10 - punchT * 4;
    ly = by - 8 - punchT * 16;
  } else if (punching && enemy.attackKind === "bossOverhead") {
    const ease = punchT < 0.4 ? punchT / 0.4 : 1;
    lx = -8 + ease * 6;
    ly = by - 22 + ease * 28;
  } else if (winding && enemy.attackKind === "bossSweep") {
    lx = -18 - punchT * 10;
    ly = by - 4 - punchT * 4;
  } else if (punching && enemy.attackKind === "bossSweep") {
    const ease = punchT < 0.5 ? punchT / 0.5 : 1;
    lx = -28 + ease * 40;
    ly = by - 2 + ease * 4;
  } else if (winding || punching) {
    lx = -16 - (winding ? punchT * 6 : 2);
    ly = by + 4 + (punching ? punchT * 4 : 0);
  } else {
    lx = -18 + walkArm * 0.5;
    ly = by + 10;
  }
  ctx.strokeStyle = skin;
  ctx.lineWidth = 5.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-14, by - 12);
  ctx.quadraticCurveTo(
    winding ? -20 : punching ? -10 : -18,
    winding ? by - 16 : by - 2,
    lx,
    ly,
  );
  ctx.stroke();
  drawFist(lx, ly, winding || punching ? 1.1 : 1, -0.2);

  // Баруун гар — гол цохилт
  let rx: number;
  let ry: number;
  let fistScale = 1;
  if (winding && enemy.attackKind === "bossOverhead") {
    rx = 12 - punchT * 2;
    ry = by - 10 - punchT * 18;
    fistScale = 1.1;
  } else if (punching && enemy.attackKind === "bossOverhead") {
    const ease = punchT < 0.35 ? punchT / 0.35 : 1;
    rx = 14 + ease * 8;
    ry = by - 24 + ease * 32;
    fistScale = 1.15 + ease * 0.2;
  } else if (winding && enemy.attackKind === "bossSweep") {
    rx = 8 - punchT * 6;
    ry = by - 6 - punchT * 8;
    fistScale = 1.08;
  } else if (punching && enemy.attackKind === "bossSweep") {
    const ease = punchT < 0.45 ? punchT / 0.45 : 1;
    rx = 10 + ease * 28;
    ry = by - 4 + ease * 6;
    fistScale = 1.2 + ease * 0.15;
  } else if (winding && enemy.attackKind === "bossCharge") {
    rx = 10 - punchT * 4;
    ry = by - 2 - punchT * 4;
    fistScale = 1.05;
  } else if (punching && enemy.attackKind === "bossCharge") {
    const ease = Math.min(1, punchT * 1.4);
    rx = 16 + ease * 18;
    ry = by + 2 + ease * 4;
    fistScale = 1.15 + ease * 0.2;
  } else {
    rx = 18 + walkArm * 0.35;
    ry = by + 8;
  }
  ctx.strokeStyle = skin;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(14, by - 12);
  ctx.quadraticCurveTo(
    winding ? 10 : punching ? 22 : 18,
    winding ? by - 18 : by - 2,
    rx,
    ry,
  );
  ctx.stroke();
  drawFist(rx + 1, ry + 1, fistScale, 0.25);

  // —— Хүзүүний суурь ——
  ctx.fillStyle = hairDark;
  ctx.beginPath();
  ctx.ellipse(0, by - 18, 12, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(0, by - 19.5, 10, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const heads: Array<{
    ox: number;
    oy: number;
    sc: number;
    delay: number;
    ang: number;
    z: number;
  }> = [
    { ox: -13, oy: -30, sc: 0.82, delay: 0.1, ang: -0.35, z: 0 },
    { ox: -8, oy: -36, sc: 0.9, delay: 0.4, ang: -0.2, z: 1 },
    { ox: -3, oy: -40, sc: 0.98, delay: 0.7, ang: -0.05, z: 2 },
    { ox: 2, oy: -42, sc: 1.08, delay: 0, ang: 0.05, z: 10 },
    { ox: 7, oy: -39, sc: 0.95, delay: 1.0, ang: 0.18, z: 3 },
    { ox: 12, oy: -34, sc: 0.88, delay: 1.3, ang: 0.32, z: 1 },
    { ox: 15, oy: -27, sc: 0.8, delay: 1.6, ang: 0.45, z: 0 },
  ];

  const drawHead = (h: (typeof heads)[number]) => {
    const sway = Math.sin(time * 2.2 + h.delay + enemy.id) * 1.3;
    const hx = h.ox + sway * 0.35;
    const hy = by + h.oy + Math.sin(time * 1.7 + h.delay) * 1.0;
    const neckBaseX = h.ox * 0.35;
    const neckBaseY = by - 17;
    const open =
      enemy.phase === "attacking" ||
      enemy.phase === "windup" ||
      Math.sin(time * 2.8 + h.delay) > 0.35;

    ctx.strokeStyle = hairDark;
    ctx.lineWidth = 5.2 * h.sc;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(neckBaseX, neckBaseY);
    ctx.quadraticCurveTo(
      (neckBaseX + hx) * 0.5 + sway * 0.2,
      (neckBaseY + hy) * 0.55,
      hx,
      hy + 5 * h.sc,
    );
    ctx.stroke();
    ctx.strokeStyle = hair;
    ctx.lineWidth = 3.4 * h.sc;
    ctx.beginPath();
    ctx.moveTo(neckBaseX, neckBaseY);
    ctx.quadraticCurveTo(
      (neckBaseX + hx) * 0.5 + sway * 0.2,
      (neckBaseY + hy) * 0.55,
      hx,
      hy + 5 * h.sc,
    );
    ctx.stroke();

    ctx.fillStyle = hairDark;
    ctx.beginPath();
    ctx.ellipse(hx - 1, hy - 2, 7 * h.sc, 6 * h.sc, h.ang, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(hx, hy - 3, 5.5 * h.sc, 5 * h.sc, h.ang, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(h.ang + sway * 0.04);
    ctx.scale(h.sc, h.sc);

    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.2, 6.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = faceDark;
    ctx.beginPath();
    ctx.ellipse(0, 2.2, 4.5, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a1018";
    ctx.beginPath();
    ctx.ellipse(-2.2, -1.6, 1.3, 1.1, -0.2, 0, Math.PI * 2);
    ctx.ellipse(2.4, -1.6, 1.3, 1.1, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? "#ffd060" : "#e8c040";
    ctx.beginPath();
    ctx.arc(-2.1, -1.5, 0.45, 0, Math.PI * 2);
    ctx.arc(2.5, -1.5, 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2a0810";
    ctx.beginPath();
    ctx.ellipse(0, 2.8, 4.2, open ? 2.8 : 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f4f0e8";
    ctx.beginPath();
    ctx.moveTo(-2.6, 1.6);
    ctx.lineTo(-1.6, 4.2);
    ctx.lineTo(-0.8, 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.8, 1.8);
    ctx.lineTo(1.6, 4.2);
    ctx.lineTo(2.6, 1.6);
    ctx.closePath();
    ctx.fill();

    if (open) {
      const flick = Math.sin(time * 9 + h.delay) * 2.5;
      ctx.strokeStyle = tongue;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 3.2);
      ctx.quadraticCurveTo(flick * 0.4, 7, flick, 11);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(flick, 11);
      ctx.lineTo(flick - 2.5, 13.5);
      ctx.moveTo(flick, 11);
      ctx.lineTo(flick + 2.5, 13.5);
      ctx.stroke();
    }

    ctx.restore();
  };

  [...heads].sort((a, b) => a.z - b.z).forEach(drawHead);

  ctx.restore();
}

/**
 * Мангасын зураг — төрлөөр салгах.
 */

type HeadGear = "none" | "skull" | "horns" | "both";
type Weapon = "spear" | "claws" | "bow" | "hammer" | "greatsword";
type HairStyle = "curly" | "tuft" | "topknot";
type SkinTone = "grey" | "red" | "green" | "blue";

interface DemonStyle {
  scale: number;
  headGear: HeadGear;
  weapon: Weapon;
  stocky: boolean;
  hair: HairStyle;
  skin: SkinTone;
}

const STYLE: Record<RouteEnemyKind, DemonStyle> = {
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
    skin: "green",
  },
  shidetHarvaach: {
    scale: 1.08,
    headGear: "none",
    weapon: "bow",
    stocky: true,
    hair: "tuft",
    skin: "blue",
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

function drawDemonWeapon(
  ctx: CanvasRenderingContext2D,
  weapon: Weapon,
  flash: boolean,
  phase: RouteEnemy["phase"],
  attackKind: RouteEnemy["attackKind"],
  animT = 0,
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
    const reach =
      phase === "windup"
        ? -2 - animT * 4
        : phase === "attacking"
          ? 4 + Math.min(1, animT * 2.2) * 10
          : 0;
    const lift =
      phase === "windup" ? -animT * 6 : phase === "attacking" ? animT * 2 : 0;
    ctx.fillStyle = bright;
    for (const [ox, oy] of [
      [11 + reach, 4 + lift],
      [14 + reach * 1.05, 2 + lift],
      [17 + reach * 1.1, 5 + lift],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + 6 + (phase === "attacking" ? 3 : 0), oy + 5);
      ctx.lineTo(ox + 1, oy + 4);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }

  if (weapon === "bow") {
    const draw =
      phase === "windup"
        ? animT
        : phase === "attacking"
          ? Math.max(0, 1 - animT * 3)
          : 0;
    ctx.save();
    ctx.translate(14, -4);
    ctx.rotate(phase === "windup" ? -0.15 - draw * 0.1 : phase === "attacking" ? 0.05 : 0);
    ctx.strokeStyle = flash ? "#a0c8ff" : "#3a5088";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 12, -1.05, 1.05);
    ctx.stroke();
    // Хөвч — татна
    const stringX = -2 - draw * 8;
    ctx.strokeStyle = flash ? "rgba(255,255,255,0.7)" : "rgba(200,220,255,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(stringX, 0);
    ctx.lineTo(0, 11);
    ctx.stroke();
    // Сум
    if (phase === "windup" || (phase === "attacking" && animT < 0.35)) {
      ctx.strokeStyle = flash ? "#e8f0ff" : "#c8d0e0";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(stringX, 0);
      ctx.lineTo(stringX + 16 + (phase === "attacking" ? animT * 40 : 0), 0);
      ctx.stroke();
      ctx.fillStyle = flash ? "#fff" : "#d0d8e8";
      ctx.beginPath();
      ctx.moveTo(stringX + 16 + (phase === "attacking" ? animT * 40 : 0), 0);
      ctx.lineTo(stringX + 12 + (phase === "attacking" ? animT * 40 : 0), -2.2);
      ctx.lineTo(stringX + 12 + (phase === "attacking" ? animT * 40 : 0), 2.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
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
function drawDemonHumanoid(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  flash: boolean,
  time: number,
): void {
  const style = STYLE[enemy.kind];
  const moving = movingOf(enemy);
  if (typeof enemy.walkPhase !== "number") enemy.walkPhase = 0;
  const walkCycle = moving ? Math.sin(enemy.walkPhase) : 0;
  const bob = moving
    ? Math.abs(Math.sin(enemy.walkPhase)) * 1.4
    : Math.sin(time * 1.6 + enemy.id) * 0.35;

  const c = palette(style.skin, flash);
  const scale = style.scale;
  const bodyW = style.stocky ? 1.2 : 1.05;

  const winding = enemy.phase === "windup";
  const punching = enemy.phase === "attacking";
  const isBow = style.weapon === "bow";
  const isClaws = style.weapon === "claws";
  const windMax = isBow ? 0.82 : enemy.kind === "shulmasynHuu" ? 0.34 : 0.56;
  const atkMax = isBow ? 0.2 : enemy.kind === "shulmasynHuu" ? 0.24 : 0.16;
  const animT = winding
    ? Math.max(0, Math.min(1, 1 - enemy.phaseTimer / windMax))
    : punching
      ? Math.max(0, Math.min(1, 1 - enemy.phaseTimer / atkMax))
      : 0;

  const walkArm = moving
    ? -walkCycle * 2.8
    : Math.sin(time * 1.4) * 0.5;

  ctx.save();
  ctx.scale(scale, scale);

  // —— Ээлжлэн алхах хөл ——
  drawAlternatingLegs(
    ctx,
    3 - bob * 0.2,
    enemy.walkPhase,
    moving,
    c.skinDark,
    c.skinDark,
    { hipSpan: 5.5 * bodyW, legLen: 14, lineW: 5 },
  );

  // —— Бие ——
  const bodyY = -1 - bob * 0.4;
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.ellipse(0, bodyY - 2, 12 * bodyW, style.stocky ? 13.5 : 11.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.skinMid;
  ctx.beginPath();
  ctx.ellipse(0, bodyY + 3, 9 * bodyW, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.skinDark;
  ctx.beginPath();
  ctx.arc(1, bodyY + 5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c.cloth;
  ctx.beginPath();
  ctx.moveTo(-11 * bodyW, bodyY + 5);
  ctx.quadraticCurveTo(-12 * bodyW, bodyY + 16, -4 * bodyW, bodyY + 15);
  ctx.lineTo(4 * bodyW, bodyY + 15);
  ctx.quadraticCurveTo(12 * bodyW, bodyY + 16, 11 * bodyW, bodyY + 5);
  ctx.quadraticCurveTo(0, bodyY + 9, -11 * bodyW, bodyY + 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = flash ? "#6a5860" : "#3a3038";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-10 * bodyW, bodyY + 6);
  ctx.quadraticCurveTo(0, bodyY + 4, 10 * bodyW, bodyY + 6);
  ctx.stroke();

  // —— Гар ——
  const shoulderY = bodyY - 9;
  let leftArmX: number;
  let leftArmY: number;
  let rightArmX: number;
  let rightArmY: number;
  if (isBow && (winding || punching)) {
    leftArmX = -8 - animT * 2;
    leftArmY = shoulderY + 4;
    rightArmX = winding
      ? 8 - animT * 10
      : 6 + Math.min(1, animT * 2) * 4;
    rightArmY = shoulderY + (winding ? 2 - animT * 2 : 4);
  } else if (isClaws && (winding || punching)) {
    leftArmX = -14 - (winding ? animT * 4 : 2);
    leftArmY = shoulderY + 10 + (winding ? animT * 2 : 0);
    if (winding) {
      rightArmX = 8 - animT * 6;
      rightArmY = shoulderY - 2 - animT * 8;
    } else {
      const ease = animT < 0.4 ? animT / 0.4 : 1;
      rightArmX = 12 + ease * 16;
      rightArmY = shoulderY + 4 + ease * 6;
    }
  } else {
    leftArmX = -13 * bodyW - walkArm * 0.3;
    leftArmY = shoulderY + 11 - walkArm * 0.15;
    rightArmX = 13 * bodyW + walkArm * 0.25;
    rightArmY = shoulderY + 11 + walkArm * 0.1;
  }

  ctx.strokeStyle = c.skin;
  ctx.lineWidth = 5.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10 * bodyW, shoulderY);
  ctx.quadraticCurveTo(
    (-10 * bodyW + leftArmX) * 0.5,
    shoulderY + 4,
    leftArmX,
    leftArmY,
  );
  ctx.moveTo(10 * bodyW, shoulderY);
  ctx.quadraticCurveTo(
    (10 * bodyW + rightArmX) * 0.5,
    winding && isClaws ? shoulderY - 4 : shoulderY + 4,
    rightArmX,
    rightArmY,
  );
  ctx.stroke();

  if (style.stocky && style.scale >= 1.2) {
    ctx.fillStyle = flash ? "#f0ece8" : "#e8e4dc";
    ctx.beginPath();
    ctx.ellipse(leftArmX * 0.7, shoulderY + 3.5, 3.4, 2.6, -0.2, 0, Math.PI * 2);
    ctx.ellipse(rightArmX * 0.7, shoulderY + 3.5, 3.4, 2.6, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(leftArmX, leftArmY + 1.5, 3.4, 0, Math.PI * 2);
  ctx.arc(
    rightArmX,
    rightArmY + 1.5,
    3.4 * (punching && isClaws ? 1.15 : 1),
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

  drawDemonWeapon(ctx, style.weapon, flash, enemy.phase, enemy.attackKind, animT);

  ctx.restore();
}

export function drawDemon(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  flash: boolean,
  time: number,
): void {
  if (enemy.kind === "shulmasynBaatar") {
    drawSevenHeadMonster(ctx, enemy, flash, time);
    return;
  }
  if (enemy.kind === "shulmasynZarts") {
    drawLalar(ctx, enemy, flash, time);
    return;
  }
  if (enemy.kind === "talynHaragch") {
    drawBarHul(ctx, enemy, flash, time);
    return;
  }
  if (enemy.kind === "shulmasynHuu" || enemy.kind === "shidetHarvaach") {
    drawDemonHumanoid(ctx, enemy, flash, time);
    return;
  }
  // Хуучин save / бусад
  ctx.fillStyle = flash ? "#6a6068" : "#2a2428";
  ctx.beginPath();
  ctx.ellipse(0, -4, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();
}
