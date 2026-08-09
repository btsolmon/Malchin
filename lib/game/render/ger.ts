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
import { trFormat } from "../i18n";

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
  // Зүүн ор — толгой зүүн хана руу, баруун — баруун хана руу
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
  ctx.translate(cx, cy + 2);
  // Орны хэмжээнд тааруулна
  ctx.scale(scale * 0.55, scale * 0.55);
  ctx.rotate(headLeft ? -Math.PI / 2 : Math.PI / 2);
  drawPlayer(ctx, sleeper, { x: 0, y: 0 }, time, false, 0, true);
  ctx.restore();

  for (let i = 0; i < 3; i++) {
    const phase = (time * 0.7 + i * 0.85) % 1;
    const zx = cx + (headLeft ? -22 : 22) + Math.sin(time + i) * 3;
    const zy = cy - 12 - phase * 28;
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

/** Хаалганаас харсан хажуугийн ор — жижиг улбар шар хүрээ */
function drawGerSideBed(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  side: -1 | 1,
): void {
  const orange = "#e85828";
  const orangeDeep = "#c04018";
  const orangeLite = "#f87840";
  const cream = "#f2e6c8";
  const creamDeep = "#e0d0a8";
  const woodLine = "#8a3010";

  // Бага перспектив — хана дагуу намхан ор
  const frontY = y + h - 4;
  const backY = y + 4;
  const insetFront = 3;
  const insetBack = 10;
  const frontL = x + (side < 0 ? insetFront : insetBack);
  const frontR = x + w - (side < 0 ? insetBack : insetFront);
  const backL = x + (side < 0 ? insetBack : insetBack + 4);
  const backR = x + w - (side < 0 ? insetBack + 4 : insetBack);

  // Сүүдэр
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(
    (frontL + frontR) / 2,
    frontY + 4,
    (frontR - frontL) * 0.46,
    6,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Орны суурь
  const frameGrad = ctx.createLinearGradient(x, backY, x, frontY);
  frameGrad.addColorStop(0, orangeLite);
  frameGrad.addColorStop(0.55, orange);
  frameGrad.addColorStop(1, orangeDeep);
  ctx.fillStyle = frameGrad;
  ctx.beginPath();
  ctx.moveTo(frontL - 3, frontY);
  ctx.lineTo(frontR + 3, frontY);
  ctx.lineTo(backR + 2, backY);
  ctx.lineTo(backL - 2, backY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = woodLine;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Урд хашлага — намхан
  const faceH = 11;
  ctx.fillStyle = orangeDeep;
  ctx.beginPath();
  ctx.moveTo(frontL - 3, frontY);
  ctx.lineTo(frontR + 3, frontY);
  ctx.lineTo(frontR + 2, frontY + faceH);
  ctx.lineTo(frontL - 2, frontY + faceH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = woodLine;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,220,160,0.5)";
  ctx.lineWidth = 1;
  const midFace = frontY + faceH * 0.45;
  ctx.beginPath();
  ctx.moveTo(frontL + 6, midFace);
  ctx.quadraticCurveTo((frontL + frontR) / 2, midFace - 3, frontR - 6, midFace);
  ctx.stroke();

  // Хөл
  for (const fx of [frontL + 8, frontR - 8]) {
    ctx.fillStyle = orangeDeep;
    roundRectPath(ctx, fx - 2.5, frontY + faceH - 1, 5, 7, 1);
    ctx.fill();
  }

  // Гудас
  const matL = frontL + 3;
  const matR = frontR - 3;
  const matBackL = backL + 4;
  const matBackR = backR - 4;
  const matFront = frontY - 3;
  const matBack = backY + 8;
  const matGrad = ctx.createLinearGradient(0, matBack, 0, matFront);
  matGrad.addColorStop(0, creamDeep);
  matGrad.addColorStop(0.55, cream);
  matGrad.addColorStop(1, "#faf3dc");
  ctx.fillStyle = matGrad;
  ctx.beginPath();
  ctx.moveTo(matL, matFront);
  ctx.lineTo(matR, matFront);
  ctx.lineTo(matBackR, matBack);
  ctx.lineTo(matBackL, matBack);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(160,130,80,0.3)";
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Дэр — хоймор/хана тал
  const pillowW = (matBackR - matBackL) * 0.7;
  const pillowCx = (matBackL + matBackR) / 2;
  const pillowY = matBack + 2;
  const pillowH = 10;
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.ellipse(pillowCx, pillowY + pillowH * 0.7, pillowW * 0.45, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const pilGrad = ctx.createLinearGradient(0, pillowY, 0, pillowY + pillowH);
  pilGrad.addColorStop(0, "#fff8e8");
  pilGrad.addColorStop(1, "#e8d8b8");
  ctx.fillStyle = pilGrad;
  roundRectPath(ctx, pillowCx - pillowW / 2, pillowY, pillowW, pillowH, 4);
  ctx.fill();
  ctx.strokeStyle = "#c8b090";
  ctx.lineWidth = 0.9;
  roundRectPath(ctx, pillowCx - pillowW / 2, pillowY, pillowW, pillowH, 4);
  ctx.stroke();
}

/** Баганын цагаан өлзий хээ */
function drawBaganaUlzii(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const s = size;
  ctx.strokeStyle = "rgba(255,250,240,0.92)";
  ctx.lineWidth = Math.max(1.4, s * 0.12);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Энгийн өлзий — хоёр огтлолцсон гогцоо
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy - s * 0.15);
  ctx.bezierCurveTo(
    cx - s * 0.55,
    cy - s * 0.55,
    cx + s * 0.55,
    cy - s * 0.55,
    cx + s * 0.35,
    cy - s * 0.15,
  );
  ctx.bezierCurveTo(
    cx + s * 0.55,
    cy + s * 0.55,
    cx - s * 0.55,
    cy + s * 0.55,
    cx - s * 0.35,
    cy + s * 0.15,
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy - s * 0.35);
  ctx.bezierCurveTo(
    cx - s * 0.55,
    cy - s * 0.55,
    cx - s * 0.55,
    cy + s * 0.55,
    cx - s * 0.15,
    cy + s * 0.35,
  );
  ctx.bezierCurveTo(
    cx + s * 0.55,
    cy + s * 0.55,
    cx + s * 0.55,
    cy - s * 0.55,
    cx + s * 0.15,
    cy - s * 0.35,
  );
  ctx.stroke();
  // Төв цэг
  ctx.fillStyle = "rgba(255,250,240,0.9)";
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
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

/** Зуухны урд түлээний дөрвөлж */
function drawStoveWoodBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fuel: number,
  lit: boolean,
  hover: boolean,
): void {
  const woodDeep = "#5a3a22";
  const woodMid = "#7a5230";
  const woodLite = "#9a6a40";
  const rim = "#3a2414";
  // Дүүргэлт — түлш ихсэх тусам дөрвөлж дүүрнэ (0→1)
  const maxFuel = 54;
  const fill = Math.max(0, Math.min(1, fuel / maxFuel));
  const logCount = fill <= 0 ? 0 : Math.max(1, Math.round(fill * 10));

  // Сүүдэр
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 2, w * 0.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Дөрвөлжийн модон хана
  const body = ctx.createLinearGradient(x, y, x + w, y + h);
  body.addColorStop(0, woodLite);
  body.addColorStop(0.45, woodMid);
  body.addColorStop(1, woodDeep);
  ctx.fillStyle = body;
  roundRectPath(ctx, x, y, w, h, 2);
  ctx.fill();
  ctx.strokeStyle = hover ? "#ffe080" : rim;
  ctx.lineWidth = hover ? 2.2 : 1.6;
  roundRectPath(ctx, x, y, w, h, 2);
  ctx.stroke();

  // Дотор ёроол
  const ix = x + 5;
  const iy = y + 5;
  const iw = w - 10;
  const ih = h - 10;
  ctx.fillStyle = "#1a1008";
  roundRectPath(ctx, ix, iy, iw, ih, 1);
  ctx.fill();

  // Модон хашлага — дээд ирмэг
  ctx.fillStyle = woodLite;
  ctx.fillRect(x + 2, y, w - 4, 5);
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y, w - 4, 5);

  // Түлээ овоолол — доороос дээш дүүрнэ
  const logColors = ["#6a4428", "#5a3820", "#7a5030", "#4a2e18", "#8a5a38", "#6e4828"];
  const cols = 2;
  for (let i = 0; i < logCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rows = Math.ceil(logCount / cols);
    const lw = iw * 0.42;
    const lh = Math.min(6.5, (ih - 4) / Math.max(3, rows) - 1);
    const lx = ix + 3 + col * (lw + 4) + (row % 2) * 2;
    const ly = iy + ih - 4 - (row + 1) * (lh + 1.5);
    if (ly < iy + 2) continue;

    ctx.fillStyle = logColors[i % logColors.length]!;
    roundRectPath(ctx, lx, ly, lw, lh, 1.5);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,10,4,0.4)";
    ctx.lineWidth = 0.7;
    roundRectPath(ctx, lx, ly, lw, lh, 1.5);
    ctx.stroke();
    // Үзүүр
    ctx.fillStyle = "#d0b080";
    ctx.beginPath();
    ctx.ellipse(lx + lw, ly + lh / 2, 2.4, lh * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a6840";
    ctx.beginPath();
    ctx.ellipse(lx, ly + lh / 2, 2, lh * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Бараг дүүрэн үед дээрээс цухуйсан түлээ
  if (fill > 0.75) {
    const extra = Math.min(3, Math.floor((fill - 0.75) / 0.08) + 1);
    for (let i = 0; i < extra; i++) {
      const lw = iw * 0.36;
      const lx = ix + 6 + i * 8;
      const ly = iy + 1 + (i % 2) * 3;
      ctx.fillStyle = logColors[(i + 2) % logColors.length]!;
      roundRectPath(ctx, lx, ly, lw, 5, 1.5);
      ctx.fill();
      ctx.fillStyle = "#d0b080";
      ctx.beginPath();
      ctx.ellipse(lx + lw, ly + 2.5, 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (logCount === 0 && !lit) {
    ctx.fillStyle = "rgba(200,180,150,0.4)";
    ctx.font = "600 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("дөрвөлж", x + w / 2, y + h * 0.62);
    ctx.textAlign = "left";
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
  const floor = ctx.createRadialGradient(cx, 400, 60, cx, 400, 470);
  floor.addColorStop(0, "#8a6038");
  floor.addColorStop(0.7, "#6a4526");
  floor.addColorStop(1, "#3a2412");
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.ellipse(cx, 405, 480, 185, 0, 0, Math.PI * 2);
  ctx.fill();

  // Шалны банзны зураас — хаалгаас хоймор руу
  ctx.strokeStyle = "rgba(40,24,10,0.35)";
  ctx.lineWidth = 1.5;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 40, wallBot - 30);
    ctx.lineTo(cx + i * 88, VIEW_H);
    ctx.stroke();
  }

  // Гол хивс
  drawGerCarpet(ctx, cx, 400);

  // Хана — цайвар эсгий + тод модон сүлжээ (хана)
  const wallX = 20;
  const wallY = wallTop;
  const wallW = VIEW_W - 40;
  const wallH = wallBot - wallTop;
  const felt = ctx.createLinearGradient(wallX, wallY, wallX, wallY + wallH);
  felt.addColorStop(0, "#f2efe8");
  felt.addColorStop(0.5, "#ebe6dc");
  felt.addColorStop(1, "#ddd6ca");
  ctx.fillStyle = felt;
  ctx.fillRect(wallX, wallY, wallW, wallH);
  for (let i = 0; i < 280; i++) {
    const fx = wallX + ((i * 97) % wallW);
    const fy = wallY + ((i * 53) % wallH);
    ctx.fillStyle =
      i % 2 === 0 ? "rgba(120,110,95,0.08)" : "rgba(255,252,245,0.1)";
    ctx.fillRect(fx, fy, 2 + (i % 3), 1 + (i % 2));
  }
  // Сүлжээ хана — цайвар мод, тод харагдана
  ctx.strokeStyle = "rgba(190,160,120,0.72)";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  for (let x = -30; x < VIEW_W + 50; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, wallTop);
    ctx.lineTo(x + 78, wallBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 78, wallTop);
    ctx.lineTo(x, wallBot);
    ctx.stroke();
  }
  // Нимгэн эсгий давхарга
  ctx.fillStyle = "rgba(242,239,232,0.38)";
  ctx.fillRect(wallX, wallY, wallW, wallH);
  const wsh = ctx.createLinearGradient(0, 0, VIEW_W, 0);
  wsh.addColorStop(0, "rgba(18,9,4,0.4)");
  wsh.addColorStop(0.5, "rgba(18,9,4,0)");
  wsh.addColorStop(1, "rgba(18,9,4,0.4)");
  ctx.fillStyle = wsh;
  ctx.fillRect(wallX, wallY, wallW, wallH);

  // ===== Дээвэр: цагаан эсгий (унь хооронд) + улбар тооно/унь/багана =====
  const ty = 56;
  const toonoRx = 86;
  const toonoRy = 40;
  const orange = "#f06028";
  const orangeDeep = "#d04818";
  const orangeLite = "#ff7a3a";
  const orangeGloss = "#ff9860";
  const uniCount = 32;
  const uniEndY = wallTop;

  // Дээврийн харанхуй суурь
  ctx.fillStyle = "#1a100c";
  ctx.fillRect(0, 0, VIEW_W, wallTop);

  // Унь + эсгий — эсгийг зөвхөн унь хоорондын секторт зурна (унинаас нааш гаргахгүй)
  const uniEnds: Array<{ sx: number; sy: number; ex: number; ey: number }> = [];
  for (let i = 0; i <= uniCount; i++) {
    const t = i / uniCount;
    const ex = 14 + t * (VIEW_W - 28);
    const nearCenter = Math.abs(t - 0.5);
    const sx = cx + (ex - cx) * 0.1;
    const sy = ty + toonoRy * (0.5 + nearCenter * 0.4);
    uniEnds.push({ sx, sy, ex, ey: uniEndY });
  }

  // Цагаан эсгий — зөвхөн хоёр хөрш унь хооронд
  {
    const roofGrad = ctx.createRadialGradient(cx, ty, 20, cx, ty + 40, 380);
    roofGrad.addColorStop(0, "#ffffff");
    roofGrad.addColorStop(0.4, "#f6f2ea");
    roofGrad.addColorStop(0.85, "#e8e0d4");
    roofGrad.addColorStop(1, "#d4cbc0");
    ctx.fillStyle = roofGrad;
    for (let i = 0; i < uniEnds.length - 1; i++) {
      const a = uniEnds[i]!;
      const b = uniEnds[i + 1]!;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(a.ex, a.ey);
      ctx.lineTo(b.ex, b.ey);
      ctx.lineTo(b.sx, b.sy);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Унь — улбар шар (эсгийн дээр)
  for (const u of uniEnds) {
    ctx.strokeStyle = orangeDeep;
    ctx.lineWidth = 3.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(u.sx, u.sy);
    ctx.lineTo(u.ex, u.ey);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,200,150,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(u.sx + 1, u.sy);
    ctx.lineTo(u.ex + 1, u.ey);
    ctx.stroke();
  }

  // Багана — зузаан улбар, цагаан өлзий
  const baganaHalf = 12;
  const baganaSpan = toonoRx;
  const baganaTop = ty + 4;
  const baganaBot = 410;
  for (const side of [-1, 1] as const) {
    const px = cx + side * baganaSpan;
    const col = ctx.createLinearGradient(px - baganaHalf, baganaTop, px + baganaHalf, baganaBot);
    col.addColorStop(0, orangeGloss);
    col.addColorStop(0.25, orange);
    col.addColorStop(0.7, orangeDeep);
    col.addColorStop(1, "#a83810");
    ctx.fillStyle = col;
    roundRectPath(ctx, px - baganaHalf, baganaTop + 10, baganaHalf * 2, baganaBot - baganaTop - 10, 3);
    ctx.fill();
    // Гялбаа
    ctx.fillStyle = "rgba(255,220,180,0.28)";
    roundRectPath(ctx, px - baganaHalf + 2, baganaTop + 14, 5, baganaBot - baganaTop - 28, 2);
    ctx.fill();
    ctx.strokeStyle = "#8a2808";
    ctx.lineWidth = 1.6;
    roundRectPath(ctx, px - baganaHalf, baganaTop + 10, baganaHalf * 2, baganaBot - baganaTop - 10, 3);
    ctx.stroke();

    // Өлзий — дээд ба доод
    drawBaganaUlzii(ctx, px, baganaTop + 52, 16);
    drawBaganaUlzii(ctx, px, baganaBot - 48, 15);
    // Дунд жижиг гоёл
    ctx.strokeStyle = "rgba(255,248,240,0.55)";
    ctx.lineWidth = 1.3;
    for (const yy of [baganaTop + 110, baganaTop + 200, baganaTop + 290]) {
      if (yy > baganaBot - 70) break;
      ctx.beginPath();
      ctx.moveTo(px - baganaHalf + 3, yy);
      ctx.quadraticCurveTo(px, yy - 4, px + baganaHalf - 3, yy);
      ctx.stroke();
    }

    // Толгой — тоонод залгана
    const headW = 34;
    const headH = 22;
    const hx = px - headW / 2;
    const hy = baganaTop - 6;
    ctx.fillStyle = orange;
    roundRectPath(ctx, hx, hy, headW, headH, 4);
    ctx.fill();
    ctx.strokeStyle = "#8a2808";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    drawBaganaUlzii(ctx, px, hy + headH / 2, 10);

    ctx.fillStyle = orangeDeep;
    roundRectPath(ctx, px - baganaHalf - 4, baganaBot - 8, baganaHalf * 2 + 8, 10, 2);
    ctx.fill();
  }

  // Тооно — гялгар улбар цагираг
  ctx.fillStyle = "#4a9ad8";
  ctx.beginPath();
  ctx.ellipse(cx, ty, toonoRx - 8, toonoRy - 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const skyGlow = ctx.createRadialGradient(cx, ty - 4, 2, cx, ty, toonoRx);
  skyGlow.addColorStop(0, "rgba(220,240,255,0.6)");
  skyGlow.addColorStop(0.55, "rgba(100,170,230,0.28)");
  skyGlow.addColorStop(1, "rgba(40,100,180,0)");
  ctx.fillStyle = skyGlow;
  ctx.beginPath();
  ctx.ellipse(cx, ty, toonoRx, toonoRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Зузаан улбар цагираг
  ctx.strokeStyle = orangeDeep;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.ellipse(cx, ty, toonoRx, toonoRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = orange;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.ellipse(cx, ty, toonoRx, toonoRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = orangeGloss;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cx, ty - 2, toonoRx - 2, toonoRy - 3, 0, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Дотор цагираг + хараац
  const innerRx = toonoRx * 0.3;
  const innerRy = toonoRy * 0.3;
  ctx.strokeStyle = orangeDeep;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(cx, ty, innerRx, innerRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = orangeLite;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cx, ty, innerRx, innerRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + Math.cos(a) * (innerRx + 2);
    const y0 = ty + Math.sin(a) * (innerRy + 2);
    const x1 = cx + Math.cos(a) * (toonoRx - 10);
    const y1 = ty + Math.sin(a) * (toonoRy - 7);
    ctx.strokeStyle = orangeDeep;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = orange;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // Тооноос унжсан цэнхэр хадаг — богино
  {
    const khadagTop = ty + 4;
    const khadagLen = 36;
    const khadagBot = khadagTop + khadagLen;
    const leftG = ctx.createLinearGradient(cx - 8, khadagTop, cx - 2, khadagBot);
    leftG.addColorStop(0, "#7ec0f0");
    leftG.addColorStop(0.5, "#3a88d0");
    leftG.addColorStop(1, "#5aa8e0");
    ctx.fillStyle = leftG;
    ctx.beginPath();
    ctx.moveTo(cx - 7, khadagTop);
    ctx.quadraticCurveTo(cx - 11, khadagTop + 16, cx - 6, khadagBot);
    ctx.lineTo(cx - 1, khadagBot);
    ctx.quadraticCurveTo(cx - 4, khadagTop + 16, cx - 2, khadagTop);
    ctx.closePath();
    ctx.fill();
    const rightG = ctx.createLinearGradient(cx + 1, khadagTop, cx + 8, khadagBot);
    rightG.addColorStop(0, "#6ab0e8");
    rightG.addColorStop(0.5, "#2a78c8");
    rightG.addColorStop(1, "#4a98d8");
    ctx.fillStyle = rightG;
    ctx.beginPath();
    ctx.moveTo(cx + 1, khadagTop);
    ctx.quadraticCurveTo(cx + 6, khadagTop + 18, cx + 2, khadagBot + 2);
    ctx.lineTo(cx + 7, khadagBot + 2);
    ctx.quadraticCurveTo(cx + 10, khadagTop + 18, cx + 6, khadagTop);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2a70b8";
    ctx.beginPath();
    ctx.ellipse(cx, khadagTop + 1, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Зуух — хар төмөр тулга + урд түлээний дөрвөлж
  const stoveBox = gerLayout().stove;
  const woodBox = gerLayout().woodBox;
  const stoveHover =
    (overButton(stoveBox, state.input) || overButton(woodBox, state.input)) &&
    !state.shopOpen;
  drawGerTulga(
    ctx,
    stoveBox.x + stoveBox.w / 2,
    stoveBox.y + stoveBox.h * 0.72,
    time,
    state.gerStoveLit,
    stoveHover,
  );
  drawStoveWoodBox(
    ctx,
    woodBox.x,
    woodBox.y,
    woodBox.w,
    woodBox.h,
    state.gerStoveFuel,
    state.gerStoveLit,
    stoveHover,
  );

  // Ханын зургууд — морь (зүүн) + гэр бүл (баруун авдрын хойно)
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

  // ===== АВДАР — зүүн урлал / гол тахил / баруун авдар =====
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
    // Бурхан тахил + зул — голын авдар дээр
    if (side === 0) {
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

  // Ор — зүүн/баруун хана (хаалганаас харсан)
  drawGerSideBed(ctx, lay.bedL.x, lay.bedL.y, lay.bedL.w, lay.bedL.h, -1);
  drawGerSideBed(ctx, lay.bedR.x, lay.bedR.y, lay.bedR.w, lay.bedR.h, 1);

  // Орой гэрт орсон аав ээж — баруун ор дээр сууна
  if (state.parentsReturned && state.parents) {
    const cam0 = { x: 0, y: 0 };
    const bed = lay.bedR;
    const parentScale = 2.6;
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
    drawIndoor(
      state.parents.father,
      bed.x + bed.w * 0.32,
      bed.y + bed.h * 0.62,
      1,
    );
    drawIndoor(
      state.parents.mother,
      bed.x + bed.w * 0.68,
      bed.y + bed.h * 0.62,
      -1,
    );
  }

  // Хаалга / гарах — дэлгэцийн доод ирмэг (хаалган дээр зогсож байгаа)
  const door = lay.door;
  ctx.fillStyle = "rgba(20,10,6,0.55)";
  roundRectPath(ctx, door.x - 8, door.y - 4, door.w + 16, door.h + 10, 10);
  ctx.fill();
  ctx.fillStyle = "#7a2424";
  roundRectPath(ctx, door.x, door.y, door.w, door.h, 8);
  ctx.fill();
  ctx.strokeStyle =
    overButton(door, state.input) && !state.shopOpen ? "#ffe080" : "#d8a040";
  ctx.lineWidth = 2;
  roundRectPath(ctx, door.x, door.y, door.w, door.h, 8);
  ctx.stroke();
  ctx.fillStyle = "#ffe9a8";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textAlign = "center";
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
    drawPlayer(ctx, walker, { x: 0, y: 0 }, time);
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
        ? "E — Түлээ дөрвөлжид хийх"
        : "E / F — Дөрвөлжид түлээ хийж гал асаах (3)";
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
    ctx.fillText(trFormat("Зоос: {n}", { n: state.score }), 28, 37);
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
