import { COLORS, GameState, Player, VIEW_H, VIEW_W, type ParentNpc } from "../types";
import {
  drawChest,
  drawCraft,
  gerLayout,
  gerProximity,
  overButton,
  SHOP_ITEMS,
} from "../ui";
import { drawGameIcon } from "../icons";
import { roundRectPath } from "../utils";
import { drawParentNpc, drawPlayer } from "./entities";
import {
  drawPlayerWithSprites,
  type PlayerSpriteSet,
} from "./playerSprites";

const GER_SLEEP_DURATION = 5;

const GER_ART_SRC = {
  horse: "/assets/ger/horse-painting.png",
  tara: "/assets/ger/white-tara.png",
  family: "/assets/ger/family-portrait.png",
} as const;

type GerArtKind = keyof typeof GER_ART_SRC;

const GER_ART: Partial<Record<GerArtKind, HTMLImageElement>> = {};

function gerArt(kind: GerArtKind): HTMLImageElement | null {
  const existing = GER_ART[kind];
  if (existing) return existing.complete && existing.naturalWidth > 0 ? existing : null;
  if (typeof Image === "undefined") return null;
  const img = new Image();
  img.src = GER_ART_SRC[kind];
  GER_ART[kind] = img;
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function drawSleepingHerder(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  scale: number,
): void {
  const left = state.gerSleepBed === "L";
  const bed = left ? gerLayout().bedL : gerLayout().bedR;
  const cx = bed.x + bed.w / 2;
  const cy = bed.y + bed.h * 0.52;
  // Зүүн ор — толгой зүүн (дэр), баруун ор — толгой баруун
  const headLeft = left;
  const breath = Math.sin(time * 2.2) * 0.6;

  const sleeper: Player = {
    ...state.player,
    pos: { x: 0, y: breath * 0.15 },
    facing: { x: 1, y: 0 },
    moving: false,
    riding: false,
    invuln: 0,
    attackAnim: 0,
    attackMelee: false,
  };

  ctx.save();
  ctx.translate(cx, cy + 4);
  ctx.scale(scale * 0.92, scale * 0.92);
  ctx.rotate(headLeft ? -Math.PI / 2 : Math.PI / 2);
  drawPlayer(ctx, sleeper, { x: 0, y: 0 }, time, false, 0, true);
  ctx.restore();

  for (let i = 0; i < 3; i++) {
    const phase = (time * 0.7 + i * 0.85) % 1;
    const zx = cx + (headLeft ? -36 : 36) + Math.sin(time + i) * 4;
    const zy = cy - 18 - phase * 36;
    ctx.globalAlpha = (1 - phase) * 0.9;
    ctx.fillStyle = "#d8e8ff";
    ctx.font = `${11 + i * 3}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("z", zx, zy);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

/** Унтах үед нүдний хэлбэрээр аажмаар хаагдаж харанхуй болно */
function drawSleepEyelids(ctx: CanvasRenderingContext2D, progress: number): void {
  // 0–0.32 хаагдана · 0.32–0.72 харанхуй · 0.72–1 нээгдэнэ
  let close = 0;
  if (progress < 0.32) close = progress / 0.32;
  else if (progress < 0.72) close = 1;
  else close = Math.max(0, 1 - (progress - 0.72) / 0.28);

  // Зөөлөн ease
  close = close * close * (3 - 2 * close);
  if (close <= 0.005) return;

  const mid = VIEW_H * 0.5;
  const cover = mid * close;
  const curve = 22 * close;
  const lid = "#0a070c";

  // Дээд зовхи
  ctx.fillStyle = lid;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(VIEW_W, 0);
  ctx.lineTo(VIEW_W, cover);
  ctx.quadraticCurveTo(VIEW_W * 0.5, cover + curve, 0, cover);
  ctx.closePath();
  ctx.fill();

  // Доод зовхи
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.lineTo(VIEW_W, VIEW_H - cover);
  ctx.quadraticCurveTo(VIEW_W * 0.5, VIEW_H - cover - curve, 0, VIEW_H - cover);
  ctx.closePath();
  ctx.fill();

  // Бараг хаагдсан үед төв завсрыг бүрэн бүрхэнэ
  if (close > 0.88) {
    const a = Math.min(1, (close - 0.88) / 0.12);
    ctx.globalAlpha = a;
    ctx.fillStyle = lid;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
  }

  // Зовхины ирмэг — нүдний хэлбэр
  if (close > 0.08 && close < 0.95) {
    ctx.strokeStyle = `rgba(40,28,36,${0.55 * Math.min(1, close * 1.4)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, cover);
    ctx.quadraticCurveTo(VIEW_W * 0.5, cover + curve * 0.85, VIEW_W, cover);
    ctx.moveTo(0, VIEW_H - cover);
    ctx.quadraticCurveTo(
      VIEW_W * 0.5,
      VIEW_H - cover - curve * 0.85,
      VIEW_W,
      VIEW_H - cover,
    );
    ctx.stroke();
  }
}

/** Уламжлалт будсан авдар — улаан бие, булангийн хээ, төв медальон, түгжээ */
function drawPaintedAvdar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hover: boolean,
  /** -1 зүүн · 0 эгц урд · 1 баруун */
  side: -1 | 0 | 1 = 1,
): void {
  const bodyH = h - 11;
  const lidH = 10;
  const depth = 10;
  const red = "#b34d34";
  const redDeep = "#8a3424";
  const wood = "#5a3a28";
  const woodSide = "#4a3020";
  const gold = hover ? "#ffe080" : "#d4a84a";
  const green = "#2a5a32";
  const blue = "#1a3a48";
  const cream = "#e8d8b0";

  // Хөл
  ctx.fillStyle = "#3a2418";
  ctx.fillRect(x + 6, y + h - 11, 14, 11);
  ctx.fillRect(x + w - 20, y + h - 11, 14, 11);

  // Гүн ба таг
  const lidBackY = y - lidH + 2;
  const faceTopY = y;
  ctx.fillStyle = woodSide;
  if (side === 0) {
    // Эгц урд — хоёр хажуу нимгэн, таг шууд хойш
    ctx.beginPath();
    ctx.moveTo(x, faceTopY);
    ctx.lineTo(x - depth * 0.35, lidBackY);
    ctx.lineTo(x - depth * 0.35, y + bodyH - 4);
    ctx.lineTo(x, y + bodyH);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w, faceTopY);
    ctx.lineTo(x + w + depth * 0.35, lidBackY);
    ctx.lineTo(x + w + depth * 0.35, y + bodyH - 4);
    ctx.lineTo(x + w, y + bodyH);
    ctx.closePath();
    ctx.fill();
  } else if (side > 0) {
    // Баруун хажуу
    ctx.beginPath();
    ctx.moveTo(x + w, faceTopY);
    ctx.lineTo(x + w + depth, lidBackY);
    ctx.lineTo(x + w + depth, y + bodyH - 4);
    ctx.lineTo(x + w, y + bodyH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a1a10";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    // Зүүн хажуу
    ctx.beginPath();
    ctx.moveTo(x, faceTopY);
    ctx.lineTo(x - depth, lidBackY);
    ctx.lineTo(x - depth, y + bodyH - 4);
    ctx.lineTo(x, y + bodyH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a1a10";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Таг / дээд
  ctx.fillStyle = wood;
  ctx.beginPath();
  if (side === 0) {
    ctx.moveTo(x, faceTopY);
    ctx.lineTo(x - depth * 0.35, lidBackY);
    ctx.lineTo(x + w + depth * 0.35, lidBackY);
    ctx.lineTo(x + w, faceTopY);
  } else if (side > 0) {
    ctx.moveTo(x, faceTopY);
    ctx.lineTo(x + depth * 0.7, lidBackY);
    ctx.lineTo(x + w + depth, lidBackY);
    ctx.lineTo(x + w, faceTopY);
  } else {
    ctx.moveTo(x + w, faceTopY);
    ctx.lineTo(x + w - depth * 0.7, lidBackY);
    ctx.lineTo(x - depth, lidBackY);
    ctx.lineTo(x, faceTopY);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a1a10";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Урд самбар
  const face = ctx.createLinearGradient(x, y, x, y + bodyH);
  face.addColorStop(0, "#c4583c");
  face.addColorStop(0.55, red);
  face.addColorStop(1, redDeep);
  ctx.fillStyle = face;
  ctx.beginPath();
  const br = 3;
  if (side === 0) {
    roundRectPath(ctx, x, y, w, bodyH, br);
  } else if (side > 0) {
    // Дээд баруун шоо, бусад дугуй
    ctx.moveTo(x + br, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + bodyH - br);
    ctx.quadraticCurveTo(x + w, y + bodyH, x + w - br, y + bodyH);
    ctx.lineTo(x + br, y + bodyH);
    ctx.quadraticCurveTo(x, y + bodyH, x, y + bodyH - br);
    ctx.lineTo(x, y + br);
    ctx.quadraticCurveTo(x, y, x + br, y);
    ctx.closePath();
  } else {
    // Дээд зүүн шоо
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - br, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + br);
    ctx.lineTo(x + w, y + bodyH - br);
    ctx.quadraticCurveTo(x + w, y + bodyH, x + w - br, y + bodyH);
    ctx.lineTo(x + br, y + bodyH);
    ctx.quadraticCurveTo(x, y + bodyH, x, y + bodyH - br);
    ctx.lineTo(x, y);
    ctx.closePath();
  }
  if (side !== 0) {
    // path already closed above
  }
  ctx.fill();

  // Гадна хүрээ
  ctx.strokeStyle = hover ? "#ffe080" : "#2a1a10";
  ctx.lineWidth = hover ? 2.5 : 1.5;
  ctx.stroke();

  // Давхар хүрээ: ногоон → алтан
  const inset = 7;
  ctx.strokeStyle = green;
  ctx.lineWidth = 2.2;
  roundRectPath(ctx, x + inset, y + inset, w - inset * 2, bodyH - inset * 2, 2);
  ctx.stroke();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.2;
  roundRectPath(
    ctx,
    x + inset + 3,
    y + inset + 3,
    w - (inset + 3) * 2,
    bodyH - (inset + 3) * 2,
    1.5,
  );
  ctx.stroke();

  // Булангийн цэцэг / үүлэн хээ
  const corners: Array<[number, number, number]> = [
    [x + inset + 14, y + inset + 14, -Math.PI / 4],
    [x + w - inset - 14, y + inset + 14, Math.PI / 4],
    [x + inset + 14, y + bodyH - inset - 14, (-3 * Math.PI) / 4],
    [x + w - inset - 14, y + bodyH - inset - 14, (3 * Math.PI) / 4],
  ];
  for (const [cx, cy, rot] of corners) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    // Дэлбээ
    ctx.fillStyle = blue;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 5, -2, 5.5, 7, i * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = cream;
    ctx.beginPath();
    ctx.ellipse(0, -1, 3.2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    // Ногоон навчис
    ctx.strokeStyle = green;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.quadraticCurveTo(-2, 10, 4, 6);
    ctx.moveTo(8, 4);
    ctx.quadraticCurveTo(2, 10, -4, 6);
    ctx.stroke();
    ctx.restore();
  }

  // Төв медальон — олон дэлбээт
  const mx = x + w / 2;
  const my = y + bodyH / 2 + 2;
  const mRx = w * 0.28;
  const mRy = bodyH * 0.28;

  // Медальон сүүдэр / дэвсгэр
  ctx.fillStyle = "#9a4030";
  lobedMedallionPath(ctx, mx, my, mRx + 3, mRy + 3, 8);
  ctx.fill();

  ctx.fillStyle = "#1a3840";
  lobedMedallionPath(ctx, mx, my, mRx + 1.5, mRy + 1.5, 8);
  ctx.fill();

  ctx.fillStyle = "#c86848";
  lobedMedallionPath(ctx, mx, my, mRx - 1, mRy - 1, 8);
  ctx.fill();

  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.4;
  lobedMedallionPath(ctx, mx, my, mRx - 1, mRy - 1, 8);
  ctx.stroke();

  ctx.strokeStyle = green;
  ctx.lineWidth = 1.1;
  lobedMedallionPath(ctx, mx, my, mRx - 4, mRy - 4, 8);
  ctx.stroke();

  // Доторх өлзий / эргэлт хээ (тэгш хэм)
  ctx.strokeStyle = blue;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (const s of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(mx, my - mRy * 0.35);
    ctx.bezierCurveTo(
      mx + s * mRx * 0.55,
      my - mRy * 0.55,
      mx + s * mRx * 0.65,
      my + mRy * 0.15,
      mx + s * mRx * 0.15,
      my + mRy * 0.4,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx + s * mRx * 0.1, my - mRy * 0.1);
    ctx.bezierCurveTo(
      mx + s * mRx * 0.4,
      my - mRy * 0.05,
      mx + s * mRx * 0.35,
      my + mRy * 0.35,
      mx + s * 4,
      my + mRy * 0.15,
    );
    ctx.stroke();
  }
  ctx.strokeStyle = green;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(mx, my, Math.min(mRx, mRy) * 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(mx, my, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Төмөр түгжээ — дээд төв
  const lx = mx - 5;
  const ly = y + 2;
  ctx.fillStyle = "#3a3834";
  roundRectPath(ctx, lx, ly, 10, 16, 1.5);
  ctx.fill();
  ctx.strokeStyle = "#1a1814";
  ctx.lineWidth = 1;
  roundRectPath(ctx, lx, ly, 10, 16, 1.5);
  ctx.stroke();
  // Цоож
  ctx.fillStyle = "#2a2824";
  ctx.beginPath();
  ctx.arc(mx, ly + 18, 4.5, Math.PI, 0);
  ctx.lineTo(mx + 4.5, ly + 26);
  ctx.lineTo(mx - 4.5, ly + 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a5850";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#1a1814";
  ctx.beginPath();
  ctx.arc(mx, ly + 22, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Бага зэрэг элэгдсэн эффект
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(x + 2, y + bodyH - 8, w - 4, 6);
}

function lobedMedallionPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  lobes: number,
): void {
  ctx.beginPath();
  for (let i = 0; i <= lobes; i++) {
    const a0 = (i / lobes) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 0.5) / lobes) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + Math.cos(a0) * rx;
    const y0 = cy + Math.sin(a0) * ry;
    const x1 = cx + Math.cos(a1) * rx * 1.18;
    const y1 = cy + Math.sin(a1) * ry * 1.18;
    if (i === 0) ctx.moveTo(x0, y0);
    else ctx.lineTo(x0, y0);
    if (i < lobes) {
      const x2 = cx + Math.cos(((i + 1) / lobes) * Math.PI * 2 - Math.PI / 2) * rx;
      const y2 = cy + Math.sin(((i + 1) / lobes) * Math.PI * 2 - Math.PI / 2) * ry;
      ctx.quadraticCurveTo(x1, y1, x2, y2);
    }
  }
  ctx.closePath();
}

/**
 * Монгол сийлбэртэй ор — цайвар мод, өнгөт угалз,
 * 3 нуман нуруу, хайрцаг хашлага, торгон дэвсгэр.
 */
function drawMongolBed(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  _side: -1 | 1,
): void {
  const wood = "#e8d8c0";
  const woodMid = "#d4c4a8";
  const woodDeep = "#b8a888";
  const woodDark = "#8a7858";
  const panelBg = "#f7f0e4";
  const red = "#c83828";
  const blue = "#2a78c0";
  const green = "#3a9840";
  const gold = "#d4a838";
  const orange = "#e07030";
  const mattress = "#f0e4c8";
  const mattressDeep = "#e0d0a8";

  const depth = Math.min(36, h * 0.28);
  const faceH = Math.min(36, h * 0.28);
  const backH = Math.min(56, h * 0.46);
  const sideW = Math.max(32, Math.round(w * 0.14));
  const topFrontY = y + h - faceH - 4;
  const topBackY = topFrontY - depth;
  const floorY = y + h;

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, floorY + 2, w * 0.46, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  const baseGrad = ctx.createLinearGradient(x, topFrontY, x, floorY);
  baseGrad.addColorStop(0, wood);
  baseGrad.addColorStop(1, woodDeep);
  ctx.fillStyle = baseGrad;
  roundRectPath(ctx, x + 2, topFrontY, w - 4, faceH + 4, 3);
  ctx.fill();
  ctx.strokeStyle = woodDark;
  ctx.lineWidth = 1.4;
  roundRectPath(ctx, x + 2, topFrontY, w - 4, faceH + 4, 3);
  ctx.stroke();

  const innerL = x + sideW + 2;
  const innerR = x + w - sideW - 2;
  const innerW = innerR - innerL;
  const row1H = faceH * 0.42;
  for (let i = 0; i < 4; i++) {
    const pw = innerW / 4;
    const px = innerL + i * pw + 2;
    drawOrnatePanel(ctx, px, topFrontY + 3, pw - 4, row1H - 2, panelBg, red, blue, green, gold);
  }
  const row2Y = topFrontY + row1H + 2;
  const row2H = faceH - row1H - 2;
  for (let i = 0; i < 4; i++) {
    const pw = innerW / 4;
    const px = innerL + i * pw + 2;
    drawOrnatePanel(ctx, px, row2Y, pw - 4, row2H - 3, panelBg, blue, red, gold, green);
  }

  for (const left of [true, false]) {
    const sx = left ? x + 2 : x + w - sideW - 2;
    const sxB = left ? x + 8 : x + w - sideW - 8;
    ctx.fillStyle = woodMid;
    roundRectPath(ctx, sx, topFrontY - 18, sideW, faceH + 22, 3);
    ctx.fill();
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = 1.3;
    roundRectPath(ctx, sx, topFrontY - 18, sideW, faceH + 22, 3);
    ctx.stroke();
    drawOrnatePanel(
      ctx,
      sx + 4,
      topFrontY - 12,
      sideW - 8,
      faceH + 10,
      panelBg,
      red,
      green,
      blue,
      gold,
    );
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.moveTo(sx - 1, topFrontY - 18);
    ctx.lineTo(sx + sideW + 1, topFrontY - 18);
    ctx.lineTo(sxB + sideW - 2, topBackY - 10);
    ctx.lineTo(sxB - 1, topBackY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = woodDeep;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = woodDeep;
    ctx.beginPath();
    ctx.moveTo(left ? sx + sideW : sx, topFrontY - 18);
    ctx.lineTo(left ? sxB + sideW - 2 : sxB - 1, topBackY - 10);
    ctx.lineTo(left ? sxB + sideW - 2 : sxB - 1, topBackY + faceH);
    ctx.lineTo(left ? sx + sideW : sx, topFrontY + faceH + 4);
    ctx.closePath();
    ctx.fill();
  }

  const deckL = x + sideW + 4;
  const deckR = x + w - sideW - 4;
  const deckBackL = x + sideW + 10;
  const deckBackR = x + w - sideW - 10;
  const matGrad = ctx.createLinearGradient(x, topBackY, x, topFrontY);
  matGrad.addColorStop(0, mattressDeep);
  matGrad.addColorStop(0.5, mattress);
  matGrad.addColorStop(1, "#f8f0d8");
  ctx.fillStyle = matGrad;
  ctx.beginPath();
  ctx.moveTo(deckL, topFrontY - 2);
  ctx.lineTo(deckR, topFrontY - 2);
  ctx.lineTo(deckBackR, topBackY + 2);
  ctx.lineTo(deckBackL, topBackY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(180,150,90,0.2)";
  ctx.lineWidth = 0.8;
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    const y0 = topFrontY - 2 + (topBackY + 2 - (topFrontY - 2)) * t;
    const inset = 4 + t * 6;
    ctx.beginPath();
    ctx.moveTo(deckL + inset, y0);
    ctx.lineTo(deckR - inset, y0);
    ctx.stroke();
  }
  ctx.strokeStyle = woodDeep;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(deckL, topFrontY - 2);
  ctx.lineTo(deckR, topFrontY - 2);
  ctx.lineTo(deckBackR, topBackY + 2);
  ctx.lineTo(deckBackL, topBackY + 2);
  ctx.closePath();
  ctx.stroke();

  const pillowW = Math.min(78, (deckR - deckL) * 0.48);
  const pillowD = depth * 0.48;
  const pFront = topFrontY - 6;
  const pBack = pFront - pillowD;
  const midX = (deckL + deckR) / 2;
  const midBackX = (deckBackL + deckBackR) / 2;
  const pX = midX - pillowW / 2;
  const pBackX = midBackX - pillowW / 2;
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.moveTo(pX + 2, pFront + 3);
  ctx.lineTo(pX + pillowW + 2, pFront + 3);
  ctx.lineTo(pBackX + pillowW, pBack + 5);
  ctx.lineTo(pBackX, pBack + 5);
  ctx.closePath();
  ctx.fill();
  const pilGrad = ctx.createLinearGradient(pX, pBack, pX, pFront);
  pilGrad.addColorStop(0, "#fff8e8");
  pilGrad.addColorStop(1, "#e8dcc0");
  ctx.fillStyle = pilGrad;
  ctx.beginPath();
  ctx.moveTo(pX, pFront);
  ctx.lineTo(pX + pillowW, pFront);
  ctx.lineTo(pBackX + pillowW, pBack);
  ctx.lineTo(pBackX, pBack);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c8b890";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#d0c4a0";
  ctx.beginPath();
  ctx.moveTo(pX, pFront);
  ctx.lineTo(pX + pillowW, pFront);
  ctx.lineTo(pX + pillowW - 2, pFront + 7);
  ctx.lineTo(pX + 2, pFront + 7);
  ctx.closePath();
  ctx.fill();

  const bx0 = deckBackL - 4;
  const bx1 = deckBackR + 4;
  const by0 = topBackY + 4;
  const byTop = by0 - backH;
  const spans = [0.27, 0.46, 0.27];
  const heights = [0.88, 1, 0.88];

  ctx.fillStyle = woodMid;
  ctx.fillRect(bx0 - 2, byTop + 8, bx1 - bx0 + 4, by0 - byTop);
  ctx.strokeStyle = woodDark;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(bx0 - 2, byTop + 8, bx1 - bx0 + 4, by0 - byTop);

  let acc = 0;
  for (let i = 0; i < 3; i++) {
    const a0 = acc;
    const a1 = acc + spans[i]!;
    const px = bx0 + a0 * (bx1 - bx0) + 3;
    const pw = (a1 - a0) * (bx1 - bx0) - 6;
    const ph = (by0 - byTop - 10) * heights[i]!;
    const py = by0 - ph;
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.moveTo(px, by0);
    ctx.lineTo(px, py + 10);
    ctx.quadraticCurveTo(px + pw / 2, py - 2, px + pw, py + 10);
    ctx.lineTo(px + pw, by0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawOrnatePanel(
      ctx,
      px + 4,
      py + 12,
      pw - 8,
      ph - 18,
      panelBg,
      i === 1 ? red : blue,
      i === 1 ? gold : green,
      orange,
      i === 1 ? green : red,
    );
    acc = a1;
  }
}

/** Цайвар самбар дээрх өнгөт медальон / угалз */
function drawOrnatePanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bg: string,
  c1: string,
  c2: string,
  c3: string,
  c4: string,
): void {
  if (w < 6 || h < 6) return;
  ctx.fillStyle = bg;
  roundRectPath(ctx, x, y, w, h, 2);
  ctx.fill();
  ctx.strokeStyle = c2;
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, x, y, w, h, 2);
  ctx.stroke();
  ctx.strokeStyle = c4;
  ctx.lineWidth = 0.7;
  roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, 1);
  ctx.stroke();

  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.32;

  ctx.strokeStyle = c1;
  ctx.lineWidth = Math.max(1, r * 0.2);
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.9, r * 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = c2;
  ctx.lineWidth = Math.max(0.8, r * 0.14);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.bezierCurveTo(cx - r * 0.3, cy - r, cx + r * 0.3, cy - r, cx + r, cy);
  ctx.stroke();
  ctx.strokeStyle = c3;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.85, cy + r * 0.2);
  ctx.bezierCurveTo(cx - r * 0.2, cy + r * 0.85, cx + r * 0.2, cy + r * 0.85, cx + r * 0.85, cy + r * 0.2);
  ctx.stroke();
  ctx.fillStyle = c4;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  for (const [ox, oy] of [
    [-0.7, -0.55],
    [0.7, -0.55],
    [-0.7, 0.55],
    [0.7, 0.55],
  ] as const) {
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.ellipse(cx + ox * r, cy + oy * r, r * 0.2, r * 0.14, ox * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Гэрийн хар төмөр тулга — хас тэмдэг, гоёл, дотор гал */
function drawGerTulga(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  lit: boolean,
  hover: boolean,
): void {
  const metal = "#1a1a1e";
  const metalLite = "#2e2e34";
  const metalHi = "#4a4a52";
  const rx = 42;
  const ry = 16;
  const h = 48;
  const bands = 4;
  const flick = 0.7 + 0.3 * Math.sin(time * 10) + 0.08 * Math.sin(time * 23);

  // Сүүдэр
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, rx + 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Суурь таваг
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, rx + 8, ry + 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = metalHi;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, rx + 8, ry + 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = metalLite;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, rx + 2, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Дотор гал (торны ард харагдана — эхлээд зурна)
  if (lit) {
    const glow = ctx.createRadialGradient(cx, cy - h * 0.35, 4, cx, cy - h * 0.2, 70);
    glow.addColorStop(0, `rgba(255,160,40,${0.45 * flick})`);
    glow.addColorStop(0.5, `rgba(255,100,20,${0.2 * flick})`);
    glow.addColorStop(1, "rgba(255,80,10,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy - h * 0.25, 55, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // Дөл
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * 7;
      const ph = 14 + 8 * Math.sin(time * 12 + i * 1.7) * flick;
      const flame = ctx.createLinearGradient(cx + ox, cy - 4, cx + ox, cy - 4 - ph);
      flame.addColorStop(0, `rgba(255,220,80,${0.9 * flick})`);
      flame.addColorStop(0.45, `rgba(255,120,20,${0.75 * flick})`);
      flame.addColorStop(1, "rgba(255,40,0,0)");
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(cx + ox - 5, cy - 2);
      ctx.quadraticCurveTo(cx + ox - 2, cy - 4 - ph * 0.5, cx + ox, cy - 4 - ph);
      ctx.quadraticCurveTo(cx + ox + 2, cy - 4 - ph * 0.5, cx + ox + 5, cy - 2);
      ctx.closePath();
      ctx.fill();
    }
    // Учрын утаа — тооно руу
    for (let i = 0; i < 4; i++) {
      const t = ((time * 0.35 + i * 0.22) % 1);
      const sy = cy - h - t * 90;
      ctx.globalAlpha = (1 - t) * 0.35;
      ctx.fillStyle = "#888890";
      ctx.beginPath();
      ctx.ellipse(cx + Math.sin(time + i) * 6, sy, 5 + t * 8, 3 + t * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Хэвтээ бүсүүд
  for (let b = 0; b < bands; b++) {
    const t = b / (bands - 1);
    const by = cy - t * h;
    const brx = rx * (0.92 + t * 0.08);
    const bry = ry * (0.92 + t * 0.08);
    ctx.strokeStyle = metalLite;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx, by, brx, bry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = metal;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(cx, by, brx, bry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Тав / товч
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const px = cx + Math.cos(a) * brx;
      const py = by + Math.sin(a) * bry;
      ctx.fillStyle = metalHi;
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // Хас тэмдэг (жижиг)
      if (i % 2 === 0) {
        ctx.strokeStyle = "#0c0c10";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px - 2.5, py);
        ctx.lineTo(px + 2.5, py);
        ctx.moveTo(px, py - 2.5);
        ctx.lineTo(px, py + 2.5);
        ctx.stroke();
      }
    }
  }

  // Босоо тулгуур
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + Math.cos(a) * rx * 0.92;
    const y0 = cy;
    const x1 = cx + Math.cos(a) * rx;
    const y1 = cy - h;
    ctx.strokeStyle = metalLite;
    ctx.lineWidth = i === 0 || i === 3 ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // Урд бариул — цагираг
  ctx.strokeStyle = metalHi;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.35, 9, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.strokeStyle = metal;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.35, 9, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Дээд гоёл — эргэлт / титэм
  const topY = cy - h - 2;
  ctx.strokeStyle = metalHi;
  ctx.lineWidth = 2;
  for (const s of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 8, topY + 4);
    ctx.quadraticCurveTo(cx + s * 22, topY - 10, cx + s * 14, topY - 16);
    ctx.quadraticCurveTo(cx + s * 6, topY - 8, cx + s * 4, topY);
    ctx.stroke();
  }
  // Төв гоёл
  ctx.beginPath();
  ctx.moveTo(cx - 6, topY);
  ctx.quadraticCurveTo(cx, topY - 14, cx + 6, topY);
  ctx.stroke();
  ctx.fillStyle = metalLite;
  ctx.beginPath();
  ctx.arc(cx, topY - 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Hover хүрээ
  if (hover) {
    ctx.strokeStyle = "rgba(232,197,106,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - h * 0.35, rx + 10, h * 0.55 + 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}


/** Ханын морины зураг — лавлагаа зураг */
function drawGerHorsePainting(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  hover = false,
): void {
  ctx.fillStyle = "#5a3418";
  roundRectPath(ctx, fx - 4, fy - 4, fw + 8, fh + 8, 3);
  ctx.fill();
  ctx.strokeStyle = hover ? "#ffe080" : "#d8a040";
  ctx.lineWidth = hover ? 3 : 2;
  roundRectPath(ctx, fx - 4, fy - 4, fw + 8, fh + 8, 3);
  ctx.stroke();

  ctx.save();
  roundRectPath(ctx, fx, fy, fw, fh, 2);
  ctx.clip();

  const img = gerArt("horse");
  if (img) {
    // cover
    const ir = img.naturalWidth / img.naturalHeight;
    const fr = fw / fh;
    let dw = fw;
    let dh = fh;
    let dx = fx;
    let dy = fy;
    if (ir > fr) {
      dw = fh * ir;
      dx = fx + (fw - dw) / 2;
    } else {
      dh = fw / ir;
      dy = fy + (fh - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    const bg = ctx.createLinearGradient(fx, fy, fx, fy + fh);
    bg.addColorStop(0, "#efe6d4");
    bg.addColorStop(1, "#d8ccb4");
    ctx.fillStyle = bg;
    ctx.fillRect(fx, fy, fw, fh);
  }
  ctx.restore();
}

/** Хойморын хана — гэр бүлийн зураг */
function drawFamilyPortrait(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  hover = false,
): void {
  ctx.fillStyle = "#4a2a10";
  roundRectPath(ctx, fx - 5, fy - 5, fw + 10, fh + 10, 3);
  ctx.fill();
  ctx.strokeStyle = hover ? "#ffe080" : "#e8c56a";
  ctx.lineWidth = hover ? 3.2 : 2.2;
  roundRectPath(ctx, fx - 5, fy - 5, fw + 10, fh + 10, 3);
  ctx.stroke();

  ctx.save();
  roundRectPath(ctx, fx, fy, fw, fh, 2);
  ctx.clip();

  const img = gerArt("family");
  if (img) {
    const ir = img.naturalWidth / img.naturalHeight;
    const fr = fw / fh;
    let dw = fw;
    let dh = fh;
    let dx = fx;
    let dy = fy;
    if (ir > fr) {
      dw = fh * ir;
      dx = fx + (fw - dw) / 2;
    } else {
      dh = fw / ir;
      dy = fy + (fh - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    const bg = ctx.createLinearGradient(fx, fy, fx, fy + fh);
    bg.addColorStop(0, "#6a8aa0");
    bg.addColorStop(0.55, "#c8b898");
    bg.addColorStop(1, "#a89070");
    ctx.fillStyle = bg;
    ctx.fillRect(fx, fy, fw, fh);
  }
  ctx.restore();
}

/** Зураг томруулж харах — дэлгэцийн ихэнхийг эзэлнэ */
function drawGerArtZoom(
  ctx: CanvasRenderingContext2D,
  kind: "horse" | "family" | "tara",
): void {
  ctx.fillStyle = "rgba(8,6,4,0.82)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const margin = 28;
  const maxW = VIEW_W - margin * 2;
  const maxH = VIEW_H - margin * 2 - 36;
  const img = gerArt(kind);

  let dw = maxW;
  let dh = maxH;
  if (img) {
    const ir = img.naturalWidth / Math.max(1, img.naturalHeight);
    if (maxW / maxH > ir) {
      dh = maxH;
      dw = dh * ir;
    } else {
      dw = maxW;
      dh = dw / ir;
    }
  }

  const dx = (VIEW_W - dw) / 2;
  const dy = (VIEW_H - dh) / 2 - 8;

  ctx.fillStyle = "#3a2410";
  roundRectPath(ctx, dx - 10, dy - 10, dw + 20, dh + 20, 6);
  ctx.fill();
  ctx.strokeStyle = "#e8c56a";
  ctx.lineWidth = 3;
  roundRectPath(ctx, dx - 10, dy - 10, dw + 20, dh + 20, 6);
  ctx.stroke();

  ctx.save();
  roundRectPath(ctx, dx, dy, dw, dh, 3);
  ctx.clip();
  if (img) {
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = "#2a1c12";
    ctx.fillRect(dx, dy, dw, dh);
  }
  ctx.restore();

  const title =
    kind === "family" ? "Гэр бүл" : kind === "horse" ? "Морины зураг" : "Цагаан дарь эх";
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2e8d5";
  ctx.font = "600 16px system-ui, sans-serif";
  ctx.fillText(title, VIEW_W / 2, dy + dh + 28);
  ctx.fillStyle = "rgba(242,232,213,0.55)";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("Дараад хаах · Esc", VIEW_W / 2, VIEW_H - 14);
  ctx.textAlign = "left";
}

/** Гэрийн гол хивс — улаан талбай, цэнхэр хүрээ, цайвар алмаазан медальон */
function drawGerCarpet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  const rx = 198;
  const ry = 72;
  ctx.save();
  ctx.translate(cx, cy);

  // Сүүдэр
  ctx.fillStyle = "rgba(20,10,4,0.28)";
  ctx.beginPath();
  ctx.ellipse(4, 6, rx + 6, ry + 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Гадна улаан ирмэг
  ctx.fillStyle = "#7a2018";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Өргөн хар-цэнхэр хүрээ
  ctx.fillStyle = "#1a2038";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.92, ry * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Хүрээний цэцэг маягийн цэгүүд
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const px = Math.cos(a) * rx * 0.84;
    const py = Math.sin(a) * ry * 0.82;
    ctx.fillStyle = i % 2 === 0 ? "#c8a878" : "#a83828";
    ctx.beginPath();
    ctx.ellipse(px, py, 3.2, 1.6, a, 0, Math.PI * 2);
    ctx.fill();
  }

  // Цайвар нимгэн хүрээ
  ctx.strokeStyle = "#e8dcc8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.74, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#8a2820";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.7, ry * 0.66, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Гол улаан талбай
  ctx.fillStyle = "#9a2820";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.68, ry * 0.64, 0, 0, Math.PI * 2);
  ctx.fill();

  // Талбайн угалз — цайвар навчис
  ctx.strokeStyle = "rgba(232,220,200,0.55)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const x0 = Math.cos(a) * rx * 0.22;
    const y0 = Math.sin(a) * ry * 0.2;
    const x1 = Math.cos(a) * rx * 0.58;
    const y1 = Math.sin(a) * ry * 0.54;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(
      Math.cos(a + 0.35) * rx * 0.4,
      Math.sin(a + 0.35) * ry * 0.38,
      x1,
      y1,
    );
    ctx.stroke();
    ctx.fillStyle = "rgba(232,220,200,0.4)";
    ctx.beginPath();
    ctx.ellipse(x1, y1, 4, 2.2, a, 0, Math.PI * 2);
    ctx.fill();
  }

  // Төв алмаазан медальон (цайвар)
  ctx.fillStyle = "#ebe2d2";
  ctx.beginPath();
  ctx.moveTo(0, -ry * 0.48);
  ctx.quadraticCurveTo(rx * 0.38, -ry * 0.12, rx * 0.42, 0);
  ctx.quadraticCurveTo(rx * 0.38, ry * 0.12, 0, ry * 0.48);
  ctx.quadraticCurveTo(-rx * 0.38, ry * 0.12, -rx * 0.42, 0);
  ctx.quadraticCurveTo(-rx * 0.38, -ry * 0.12, 0, -ry * 0.48);
  ctx.closePath();
  ctx.fill();

  // Медальоны улаан/цэнхэр дотор хээ
  ctx.strokeStyle = "#8a2820";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -ry * 0.38);
  ctx.lineTo(rx * 0.28, 0);
  ctx.lineTo(0, ry * 0.38);
  ctx.lineTo(-rx * 0.28, 0);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "#1a2038";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.12, ry * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a83828";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.055, ry * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  // Медальоны эргэн тойронх жижиг цэцэг
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.fillStyle = "#1a2038";
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(a) * rx * 0.2,
      Math.sin(a) * ry * 0.22,
      5,
      3,
      a,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
}

/** Зүүн авдар дээрх цагаан дарь эх + зул */
function drawAvdarOfferings(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  time: number,
  lampLit: boolean,
  taraHover = false,
): void {
  const topY = y - 2;
  const cx = x + w / 2;

  // Тханка хүрээ — цагаан дарь эх
  const bw = 36;
  const bh = 52;
  const bx = cx - bw / 2 - 10;
  const by = topY - bh - 4;
  ctx.fillStyle = "#3a2410";
  roundRectPath(ctx, bx - 3, by - 3, bw + 6, bh + 6, 2);
  ctx.fill();
  ctx.strokeStyle = taraHover ? "#ffe080" : "#e8c060";
  ctx.lineWidth = taraHover ? 2.6 : 1.8;
  roundRectPath(ctx, bx - 3, by - 3, bw + 6, bh + 6, 2);
  ctx.stroke();

  ctx.save();
  roundRectPath(ctx, bx, by, bw, bh, 1);
  ctx.clip();
  const tara = gerArt("tara");
  if (tara) {
    const ir = tara.naturalWidth / tara.naturalHeight;
    const fr = bw / bh;
    let dw = bw;
    let dh = bh;
    let dx = bx;
    let dy = by;
    if (ir > fr) {
      dw = bh * ir;
      dx = bx + (bw - dw) / 2;
    } else {
      dh = bw / ir;
      dy = by + (bh - dh) / 2;
    }
    ctx.drawImage(tara, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = "#2a4a70";
    ctx.fillRect(bx, by, bw, bh);
  }
  ctx.restore();

  // Зул — зөвхөн зуух ассан үед асна (гал шиг харагдахгүй)
  const zx = bx + bw + 14;
  const zy = topY - 10;
  ctx.fillStyle = "#c8b090";
  roundRectPath(ctx, zx - 5, zy, 10, 8, 1);
  ctx.fill();
  ctx.fillStyle = "#a89070";
  roundRectPath(ctx, zx - 3.5, zy - 2, 7, 3, 1);
  ctx.fill();
  if (lampLit) {
    const f = 0.75 + 0.25 * Math.sin(time * 8);
    ctx.fillStyle = `rgba(255,190,60,${0.45 * f + 0.35})`;
    ctx.beginPath();
    ctx.ellipse(zx, zy - 7, 2.4, 3.2 * f + 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,240,160,${0.7 * f})`;
    ctx.beginPath();
    ctx.ellipse(zx, zy - 8, 1.1, 1.6 * f + 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Унтарсан фитиль
    ctx.fillStyle = "#5a5048";
    ctx.fillRect(zx - 0.7, zy - 5, 1.4, 4);
  }

  // Жижиг тахилын аяга
  ctx.fillStyle = "#d0d0d8";
  ctx.beginPath();
  ctx.ellipse(cx + 4, topY + 2, 5, 2.5, 0, 0, Math.PI);
  ctx.fill();
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

  // Гол хивс
  drawGerCarpet(ctx, cx, 420);

  // Хана — эсгий (байгалийн саарал) + модон сүлжээ
  const wallX = 20;
  const wallY = wallTop;
  const wallW = VIEW_W - 40;
  const wallH = wallBot - wallTop;
  // Эсгийн суурь — цайвар бор/саарал, жигд бус
  const felt = ctx.createLinearGradient(wallX, wallY, wallX, wallY + wallH);
  felt.addColorStop(0, "#d0ccc4");
  felt.addColorStop(0.45, "#c4c0b8");
  felt.addColorStop(1, "#b4b0a8");
  ctx.fillStyle = felt;
  ctx.fillRect(wallX, wallY, wallW, wallH);
  // Эсгийн ширхэг / бүдүүн бүтэц
  for (let i = 0; i < 420; i++) {
    const fx = wallX + ((i * 97) % wallW);
    const fy = wallY + ((i * 53) % wallH);
    const shade = (i * 17) % 3;
    ctx.fillStyle =
      shade === 0
        ? "rgba(90,85,78,0.14)"
        : shade === 1
          ? "rgba(255,255,250,0.1)"
          : "rgba(120,110,95,0.12)";
    ctx.fillRect(fx, fy, 2 + (i % 3), 1 + (i % 2));
  }
  for (let i = 0; i < 80; i++) {
    const fx = wallX + ((i * 131) % wallW);
    const fy = wallY + ((i * 79) % wallH);
    ctx.strokeStyle = "rgba(100,95,88,0.18)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + 6 + (i % 5), fy + ((i % 3) - 1) * 2);
    ctx.stroke();
  }
  // Сүлжээ хана (хана мод) — эсгийн доор/дундуур бага зэрэг харагдана
  ctx.strokeStyle = "rgba(120,75,40,0.28)";
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
  // Эсгийн нимгэн давхарга — сүлжээг бүрхэнэ
  ctx.fillStyle = "rgba(196,192,184,0.55)";
  ctx.fillRect(wallX, wallY, wallW, wallH);
  for (let i = 0; i < 180; i++) {
    const fx = wallX + ((i * 67) % wallW);
    const fy = wallY + ((i * 41) % wallH);
    ctx.fillStyle = i % 2 === 0 ? "rgba(80,76,70,0.08)" : "rgba(255,252,245,0.07)";
    ctx.fillRect(fx, fy, 3, 2);
  }
  // Ханын ирмэгийн сүүдэр
  const wsh = ctx.createLinearGradient(0, 0, VIEW_W, 0);
  wsh.addColorStop(0, "rgba(18,9,4,0.55)");
  wsh.addColorStop(0.5, "rgba(18,9,4,0)");
  wsh.addColorStop(1, "rgba(18,9,4,0.55)");
  ctx.fillStyle = wsh;
  ctx.fillRect(wallX, wallY, wallW, wallH);

  // Дээвэр хэсэг
  ctx.fillStyle = "#1c0f07";
  ctx.fillRect(0, 0, VIEW_W, wallTop);

  // ===== Тооно + унь + багана (эгц урдаас — доороос харсан зурагт үндэслэнэ) =====
  const ty = 56;
  const toonoRx = 88;
  const toonoRy = 42;
  const orange = "#e85820";
  const orangeDeep = "#c04014";
  const orangeLite = "#f87838";
  const patBlue = "#4ab0d8";
  const patYellow = "#f0d050";
  const patGreen = "#5caa40";
  const patCream = "#f2e8d0";

  // Унь — тооноос хана руу (олон, улбар шар, үзүүрт хээ)
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    const wx = 18 + t * (VIEW_W - 36);
    const nearCenter = Math.abs(t - 0.5);
    // Перспектив: голд ойрхон унь тооны доод ирмэгээс, зах руу илүү нам
    const startX = cx + (wx - cx) * 0.12;
    const startY = ty + toonoRy * (0.55 + nearCenter * 0.35);
    ctx.strokeStyle = i % 3 === 0 ? orangeDeep : orange;
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(wx, wallTop + 2);
    ctx.stroke();
    // Тооны ойр үзүүрийн гоёл
    ctx.strokeStyle = patBlue;
    ctx.lineWidth = 1.4;
    const ux = startX + (wx - startX) * 0.08;
    const uy = startY + (wallTop + 2 - startY) * 0.08;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(ux, uy);
    ctx.stroke();
    if (i % 4 === 0) {
      ctx.fillStyle = patYellow;
      ctx.beginPath();
      ctx.arc(startX, startY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Багана — тооны хамгийн урт диаметрийн 2 үзүүрээс шал хүртэл
  const baganaHalf = 11;
  const baganaSpan = toonoRx; // эллипсийн хамгийн өргөн цэг (cx ± toonoRx)
  const baganaTop = ty + 2; // тооны хэвтээ диаметрийн түвшинд залгана
  const baganaBot = 410; // шал
  for (const side of [-1, 1] as const) {
    const px = cx + side * baganaSpan;

    // Их бие — азагаас шал хүртэл
    const col = ctx.createLinearGradient(px - baganaHalf, baganaTop, px + baganaHalf, baganaBot);
    col.addColorStop(0, orangeLite);
    col.addColorStop(0.4, orange);
    col.addColorStop(1, orangeDeep);
    ctx.fillStyle = col;
    roundRectPath(ctx, px - baganaHalf, baganaTop + 16, baganaHalf * 2, baganaBot - baganaTop - 16, 4);
    ctx.fill();
    ctx.strokeStyle = "#8a2808";
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, px - baganaHalf, baganaTop + 16, baganaHalf * 2, baganaBot - baganaTop - 16, 4);
    ctx.stroke();

    // Гоёл бүсүүд — угалз мөр
    for (let i = 0; i < 8; i++) {
      const yy = baganaTop + 40 + i * 44;
      if (yy > baganaBot - 24) break;
      ctx.strokeStyle = i % 2 === 0 ? patBlue : patYellow;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - baganaHalf + 3, yy);
      ctx.quadraticCurveTo(px, yy - 5, px + baganaHalf - 3, yy);
      ctx.quadraticCurveTo(px, yy + 5, px - baganaHalf + 3, yy);
      ctx.stroke();
      ctx.fillStyle = patGreen;
      ctx.beginPath();
      ctx.arc(px, yy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Аза / толгой — тооны цагираг доор залгана
    const headW = 36;
    const headH = 26;
    const hx = px - headW / 2;
    const hy = baganaTop - 8;
    ctx.fillStyle = orange;
    ctx.beginPath();
    ctx.moveTo(hx + 4, hy + headH);
    ctx.lineTo(hx, hy + 14);
    ctx.lineTo(hx + 3, hy + 8);
    ctx.lineTo(hx + 8, hy + 4);
    ctx.lineTo(hx + 10, hy);
    ctx.lineTo(hx + headW - 10, hy);
    ctx.lineTo(hx + headW - 8, hy + 4);
    ctx.lineTo(hx + headW - 3, hy + 8);
    ctx.lineTo(hx + headW, hy + 14);
    ctx.lineTo(hx + headW - 4, hy + headH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8a2808";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = patBlue;
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, hx + 7, hy + 8, headW - 14, 12, 2);
    ctx.stroke();
    ctx.fillStyle = patYellow;
    ctx.beginPath();
    ctx.arc(px, hy + 14, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = patCream;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx + 8, hy + 6);
    ctx.lineTo(hx + headW - 8, hy + 6);
    ctx.stroke();

    // Шалны суурь
    ctx.fillStyle = orangeDeep;
    roundRectPath(ctx, px - baganaHalf - 4, baganaBot - 8, baganaHalf * 2 + 8, 10, 2);
    ctx.fill();
  }

  // Тооно — тэнгэр + давхар цагираг + 8 хараац (урдаас эллипс)
  // Тэнгэр
  ctx.fillStyle = "#3a8ad0";
  ctx.beginPath();
  ctx.ellipse(cx, ty, toonoRx - 6, toonoRy - 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const skyGlow = ctx.createRadialGradient(cx, ty - 4, 2, cx, ty, toonoRx);
  skyGlow.addColorStop(0, "rgba(200,230,255,0.55)");
  skyGlow.addColorStop(0.55, "rgba(80,160,220,0.25)");
  skyGlow.addColorStop(1, "rgba(40,100,180,0)");
  ctx.fillStyle = skyGlow;
  ctx.beginPath();
  ctx.ellipse(cx, ty, toonoRx, toonoRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Гадна цагираг (зузаан улбар)
  ctx.strokeStyle = orangeDeep;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.ellipse(cx, ty, toonoRx, toonoRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = orange;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.ellipse(cx, ty, toonoRx, toonoRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Гадна цагиргийн угалз
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const px = cx + Math.cos(a) * toonoRx;
    const py = ty + Math.sin(a) * toonoRy;
    ctx.fillStyle = i % 2 === 0 ? patBlue : patYellow;
    ctx.beginPath();
    ctx.arc(px, py, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = patCream;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, ty, toonoRx + 7, toonoRy + 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = patBlue;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, ty, toonoRx - 7, toonoRy - 5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Дотор цагираг
  const innerRx = toonoRx * 0.32;
  const innerRy = toonoRy * 0.32;
  ctx.strokeStyle = orangeDeep;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(cx, ty, innerRx, innerRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = orangeLite;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(cx, ty, innerRx, innerRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = patBlue;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, ty, innerRx - 3, innerRy - 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 8 хараац — дотор ↔ гадна
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + Math.cos(a) * (innerRx + 2);
    const y0 = ty + Math.sin(a) * (innerRy + 2);
    const x1 = cx + Math.cos(a) * (toonoRx - 8);
    const y1 = ty + Math.sin(a) * (toonoRy - 6);
    ctx.strokeStyle = orangeDeep;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = orange;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    // Хээ
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    ctx.fillStyle = i % 2 === 0 ? patYellow : patGreen;
    ctx.beginPath();
    ctx.arc(mx, my, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Тооноос унжсан цэнхэр хадаг — богино, хоёрдоолон унжсан
  {
    const khadagTop = ty + 4;
    const khadagLen = 42;
    const khadagBot = khadagTop + khadagLen;
    // Зүүн тууз
    const leftG = ctx.createLinearGradient(cx - 8, khadagTop, cx - 2, khadagBot);
    leftG.addColorStop(0, "#7ec0f0");
    leftG.addColorStop(0.5, "#3a88d0");
    leftG.addColorStop(1, "#5aa8e0");
    ctx.fillStyle = leftG;
    ctx.beginPath();
    ctx.moveTo(cx - 7, khadagTop);
    ctx.quadraticCurveTo(cx - 11, khadagTop + 18, cx - 6, khadagBot);
    ctx.lineTo(cx - 1, khadagBot);
    ctx.quadraticCurveTo(cx - 4, khadagTop + 18, cx - 2, khadagTop);
    ctx.closePath();
    ctx.fill();
    // Баруун тууз
    const rightG = ctx.createLinearGradient(cx + 1, khadagTop, cx + 8, khadagBot);
    rightG.addColorStop(0, "#6ab0e8");
    rightG.addColorStop(0.5, "#2a78c8");
    rightG.addColorStop(1, "#4a98d8");
    ctx.fillStyle = rightG;
    ctx.beginPath();
    ctx.moveTo(cx + 1, khadagTop);
    ctx.quadraticCurveTo(cx + 6, khadagTop + 20, cx + 2, khadagBot + 2);
    ctx.lineTo(cx + 7, khadagBot + 2);
    ctx.quadraticCurveTo(cx + 10, khadagTop + 20, cx + 6, khadagTop);
    ctx.closePath();
    ctx.fill();
    // Гэрэл
    ctx.strokeStyle = "rgba(220,240,255,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 4, khadagTop + 4);
    ctx.lineTo(cx - 3.5, khadagBot - 4);
    ctx.moveTo(cx + 3.5, khadagTop + 4);
    ctx.lineTo(cx + 4, khadagBot - 2);
    ctx.stroke();
    // Тоонод дэвсэж уясан
    ctx.fillStyle = "#2a70b8";
    ctx.beginPath();
    ctx.ellipse(cx, khadagTop + 1, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Захны утас
    ctx.strokeStyle = "#6ab0e8";
    ctx.lineWidth = 0.9;
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const baseX = i < 0 ? cx - 4 + i : cx + 4 + i;
      ctx.beginPath();
      ctx.moveTo(baseX, i < 0 ? khadagBot : khadagBot + 2);
      ctx.lineTo(baseX + i * 0.4, (i < 0 ? khadagBot : khadagBot + 2) + 5);
      ctx.stroke();
    }
  }

  // Зуух — хар төмөр тулга (хивсний яг төв)
  const stoveBox = gerLayout().stove;
  drawGerTulga(
    ctx,
    stoveBox.x + stoveBox.w / 2,
    stoveBox.y + stoveBox.h * 0.72,
    time,
    state.gerStoveLit,
    overButton(stoveBox, state.input) && !state.shopOpen,
  );

  // Ханын зургууд — морь (жижиг) + гэр бүл (төв)
  const artLay = gerLayout();
  const canClickArt =
    !state.shopOpen && !state.craftOpen && !state.gerArtZoom && state.gerSleepTimer <= 0;
  drawGerHorsePainting(
    ctx,
    artLay.artHorse.x,
    artLay.artHorse.y,
    artLay.artHorse.w,
    artLay.artHorse.h,
    canClickArt && overButton(artLay.artHorse, state.input),
  );
  drawFamilyPortrait(
    ctx,
    artLay.artFamily.x,
    artLay.artFamily.y,
    artLay.artFamily.w,
    artLay.artFamily.h,
    canClickArt && overButton(artLay.artFamily, state.input),
  );

  // ===== АВДАР — хоёр талд + гэр бүлийн доор эгц урд =====
  const lay = gerLayout();
  const chests: Array<{ ch: typeof lay.chestL; side: -1 | 0 | 1; label: string }> =
    [
      { ch: lay.chestL, side: -1, label: "Урлал" },
      { ch: lay.chestC, side: 0, label: "" },
      { ch: lay.chestR, side: 1, label: "Авдар" },
    ];
  for (const { ch, side, label } of chests) {
    const hover =
      overButton(ch, state.input) && !state.shopOpen && !state.craftOpen;
    const pulse = 1 + 0.02 * Math.sin(time * 5);
    ctx.save();
    ctx.translate(ch.x + ch.w / 2, ch.y + ch.h / 2);
    ctx.scale(hover ? pulse : 1, hover ? pulse : 1);
    ctx.translate(-(ch.x + ch.w / 2), -(ch.y + ch.h / 2));
    drawPaintedAvdar(ctx, ch.x, ch.y, ch.w, ch.h, hover, side);
    ctx.restore();
    if (side < 0) {
      drawAvdarOfferings(
        ctx,
        ch.x,
        ch.y,
        ch.w,
        time,
        state.gerStoveLit,
        canClickArt && overButton(artLay.artTara, state.input),
      );
    }
    if (!label) continue;
    ctx.textAlign = "center";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 3;
    const labelY = ch.y + ch.h + 14;
    ctx.strokeText(label, ch.x + ch.w / 2, labelY);
    ctx.fillStyle = "#ffe9a8";
    ctx.fillText(label, ch.x + ch.w / 2, labelY);
  }

  // Ор — зүүн/баруун хана дагуу босоо монгол ор
  drawMongolBed(ctx, lay.bedL.x, lay.bedL.y, lay.bedL.w, lay.bedL.h, -1);
  drawMongolBed(ctx, lay.bedR.x, lay.bedR.y, lay.bedR.w, lay.bedR.h, 1);

  // Орой гэрт орсон аав ээж — баруун ор дээр цуг сууна
  if (state.parentsReturned && state.parents) {
    const cam0 = { x: 0, y: 0 };
    const bed = lay.bedR;
    // Тоглогч (gerScale 2.85) -оос том — ор дээр багтахаар
    const parentScale = 3.45;
    const drawIndoor = (
      src: ParentNpc,
      x: number,
      y: number,
      face: 1 | -1,
    ) => {
      if (!src.insideGer) return;
      const p: ParentNpc = {
        ...src,
        pos: { x, y },
        face,
        facing: { x: face, y: 0 },
        moving: false,
        workPulse: 0,
      };
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(parentScale, parentScale);
      ctx.translate(-x, -y);
      drawParentNpc(ctx, p, cam0, time);
      ctx.restore();
    };
    // Баруун ор — аав зүүн талд, ээж баруун талд, хоёулаа дотогш харсан
    drawIndoor(
      state.parents.father,
      bed.x + bed.w * 0.34,
      bed.y + bed.h * 0.58,
      1,
    );
    drawIndoor(
      state.parents.mother,
      bed.x + bed.w * 0.66,
      bed.y + bed.h * 0.58,
      -1,
    );
  }

  // Хаалга (гарах)
  const door = lay.door;
  ctx.fillStyle = "#8a2828";
  roundRectPath(ctx, door.x, door.y, door.w, door.h, 8);
  ctx.fill();
  ctx.strokeStyle =
    overButton(door, state.input) && !state.shopOpen ? "#ffe080" : "#d8a040";
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
      riding: false,
      invuln: 0,
      attackAnim: 0,
    };
    ctx.save();
    ctx.translate(state.gerPlayer.x, state.gerPlayer.y);
    ctx.scale(gerScale, gerScale);
    ctx.translate(-state.gerPlayer.x, -state.gerPlayer.y);
    drawPlayerWithSprites(
      ctx,
      walker,
      { x: 0, y: 0 },
      time,
      playerSprites,
      0,
    );
    ctx.restore();
  }

  // Ойролцоох зүйлсийн заавар
  if (!state.shopOpen && !state.craftOpen && state.gerSleepTimer <= 0) {
    const prox = gerProximity(state);
    let hint = "";
    if (prox.nearChestL) hint = "E — Урлал";
    else if (prox.nearChestC || prox.nearChestR) hint = "E — Авдар";
    else if (prox.nearStove)
      hint = state.gerStoveLit
        ? "E — Түлээ нэмэх"
        : "E / F — Гал асаах (3 түлээ)";
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
    const progress = 1 - state.gerSleepTimer / GER_SLEEP_DURATION;
    const lidClose =
      progress < 0.32
        ? progress / 0.32
        : progress < 0.72
          ? 1
          : Math.max(0, 1 - (progress - 0.72) / 0.28);
    if (lidClose < 0.85) {
      const bw = 220;
      const bx = (VIEW_W - bw) / 2;
      const by = VIEW_H - 52;
      ctx.globalAlpha = 1 - lidClose;
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
      ctx.globalAlpha = 1;
    }
  }

  // Дулаан гэрлийн vignette — зөвхөн зуух ассан үед улбар шар
  if (state.gerStoveLit) {
    const warm = ctx.createRadialGradient(cx, 340, 100, cx, 340, 560);
    warm.addColorStop(0, "rgba(255,170,80,0.16)");
    warm.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else {
    const cool = ctx.createRadialGradient(cx, 340, 120, cx, 340, 560);
    cool.addColorStop(0, "rgba(0,0,0,0)");
    cool.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // Зоос ба эзэмшил
  if (state.gerSleepTimer <= 0) {
    ctx.fillStyle = "rgba(12,10,8,0.75)";
    roundRectPath(ctx, 14, 14, 210, 36, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.hudAccent;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(`Зоос: ${state.score}`, 28, 37);
    const owned = SHOP_ITEMS.filter(
      (it): it is Extract<typeof it, { type: "gear" }> =>
        it.type === "gear" && state.player.gear[it.id],
    );
    let gx = 130;
    for (const it of owned) {
      drawGameIcon(ctx, it.icon, gx + 8, 28, 16);
      gx += 18;
    }
  }

  // Удирдлагын заавар
  if (!state.shopOpen && state.gerSleepTimer <= 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(242,232,213,0.55)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(
      state.gerArtZoom
        ? "Дараад / Esc — хаах"
        : "WASD — алхах · E — харьцах · Зураг дээр дарж томруул · Хаалга руу алхаж гарна",
      VIEW_W / 2,
      VIEW_H - 8,
    );
    ctx.textAlign = "left";
  }

  if (state.shopOpen) drawChest(ctx, state);
  if (state.craftOpen) drawCraft(ctx, state);
  if (state.gerArtZoom) drawGerArtZoom(ctx, state.gerArtZoom);

  // Унтах — нүд аниж харанхуй (хамгийн дээр)
  if (state.gerSleepTimer > 0) {
    const progress = 1 - state.gerSleepTimer / GER_SLEEP_DURATION;
    drawSleepEyelids(ctx, progress);
  }
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
