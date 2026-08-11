// Бэлэн SVG icon-ууд (`public/icons/`) — зураасан дүрс биш
// Эх сурвалж: Game-icons.net (CC BY 3.0), Lucide (ISC), Material Design Icons (Apache 2.0)
// Iconify API-аар татаж, алтан өнгөөр (#e8c56a) хадгалсан.

export type GameIconId =
  | "dog"
  | "horse"
  | "horseRide"
  | "bow"
  | "axe"
  | "basket"
  | "urga"
  | "fishingRod"
  | "sheep"
  | "goat"
  | "cattle"
  | "horseHerd"
  | "camel"
  | "wool"
  | "cashmere"
  | "milk"
  | "felt"
  | "aaruul"
  | "fish"
  | "wood"
  | "stone"
  | "berry"
  | "hay"
  | "arrow"
  | "punch"
  | "dodge"
  | "shield"
  | "hand"
  | "fire"
  | "log"
  | "fence"
  | "spiritWater"
  | "steak"
  | "empty";

/** public/icons доторх файлтай 1:1 */
export const GAME_ICON_SRC: Record<GameIconId, string> = {
  dog: "/icons/dog.svg",
  horse: "/icons/horse.svg",
  horseRide: "/icons/horseRide.svg",
  bow: "/icons/bow.svg",
  axe: "/icons/axe.svg",
  basket: "/icons/basket.svg",
  urga: "/icons/urga.svg",
  fishingRod: "/icons/fishingRod.svg",
  sheep: "/icons/sheep.svg",
  goat: "/icons/goat.svg",
  cattle: "/icons/cattle.svg",
  horseHerd: "/icons/horseHerd.svg",
  camel: "/icons/camel.svg",
  wool: "/icons/wool.svg",
  cashmere: "/icons/cashmere.svg",
  milk: "/icons/milk.svg",
  felt: "/icons/felt.svg",
  aaruul: "/icons/aaruul.svg",
  fish: "/icons/fish.svg",
  wood: "/icons/wood.svg",
  stone: "/icons/stone.svg",
  berry: "/icons/berry.svg",
  hay: "/icons/hay.svg",
  arrow: "/icons/arrow.svg",
  punch: "/icons/punch.svg",
  dodge: "/icons/dodge.svg",
  shield: "/icons/shield.svg",
  hand: "/icons/hand.svg",
  fire: "/icons/fire.svg",
  log: "/icons/log.svg",
  fence: "/icons/fence.svg",
  spiritWater: "/icons/spiritWater.svg",
  steak: "/icons/steak.svg",
  empty: "/icons/empty.svg",
};

const imageCache = new Map<GameIconId, HTMLImageElement>();
let preloadStarted = false;

function loadIcon(id: GameIconId): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const cached = imageCache.get(id);
  if (cached) return cached;

  const img = new Image();
  img.decoding = "async";
  img.src = GAME_ICON_SRC[id];
  imageCache.set(id, img);
  return img;
}

/** Тоглоом эхлэхэд бүх icon-ыг урьдчилан ачаална */
export function preloadGameIcons(): void {
  if (preloadStarted || typeof Image === "undefined") return;
  preloadStarted = true;
  for (const id of Object.keys(GAME_ICON_SRC) as GameIconId[]) {
    loadIcon(id);
  }
}

export function gameIconUrl(id: GameIconId): string {
  return GAME_ICON_SRC[id];
}

/** Төвдөө size×size дүрс зурна (x,y = төв) */
export function drawGameIcon(
  ctx: CanvasRenderingContext2D,
  id: GameIconId,
  x: number,
  y: number,
  size: number,
): void {
  const img = loadIcon(id);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    ctx.restore();
    return;
  }

  // Ачаалагдах хүртэл жижиг placeholder
  ctx.save();
  ctx.strokeStyle = "rgba(232,197,106,0.35)";
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

/** React img src — бэлэн SVG зам */
export function gameIconDataUrl(id: GameIconId, _size = 32): string {
  return GAME_ICON_SRC[id];
}
