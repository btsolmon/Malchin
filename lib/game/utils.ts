// Хүн 1 (дундын суурь) — математик болон туслах функцүүд

import {
  FENCE_GRID,
  FENCE_MAX_HP_BY_TIER,
  FENCE_RADIUS,
  GATE_ANIM_SEC,
  GATE_CLOSE_DELAY,
  GATE_PASS_OPEN,
  MAX_PASTURE_GRASS,
  PASTURE_RADIUS,
  SEASON_DAYS,
  SEASON_ORDER,
  type Fence,
  type FenceTier,
  type GameState,
  type Season,
  type Vector2,
  type WeatherKind,
  type World,
} from "../game/types";

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(v: Vector2): Vector2 {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function pastureCenter(world: World): Vector2 {
  return { x: world.campPos.x, y: world.campPos.y };
}

/** Гэрийн хаалганы байрлал */
export function gerDoorPos(world: World): Vector2 {
  const c = pastureCenter(world);
  return { x: c.x, y: c.y - 20 };
}

/** Эхлэлийн хашааны тал бүрийн сегментийн тоо (5×5) */
export const STARTER_PEN_SIZE = 5;

/** Мал гаргах/оруулах цэг — хашааны хаалга (байхгүй бол баруун хана) */
export function flockGatePos(world: World): Vector2 {
  const gate = world.fences.find((f) => f.isGate);
  if (gate) return { x: gate.pos.x, y: gate.pos.y };
  const pen = starterPenCenter(world.campPos);
  const halfSide = (STARTER_PEN_SIZE * FENCE_GRID) / 2;
  return { x: pen.x + halfSide, y: pen.y };
}

export const FLOCK_GATE_RADIUS = 36;

/** Эхний бууцын хашааны төв — гэрийн зүүн талд, зайтай */
export function starterPenCenter(camp: Vector2): Vector2 {
  const halfSide = (STARTER_PEN_SIZE * FENCE_GRID) / 2;
  return snapFencePos(
    camp.x - halfSide - 7 * FENCE_GRID,
    camp.y + FENCE_GRID,
    FENCE_GRID,
  );
}

/** Хашаан доторх малын бөөгнөрөх радиус */
export const PEN_RADIUS = (STARTER_PEN_SIZE * FENCE_GRID) / 2 - 10;

export function penCenter(world: World): Vector2 {
  return starterPenCenter(world.campPos);
}

/**
 * Эхлэлийн хашаа — тал бүрт STARTER_PEN_SIZE сегмент (5×5).
 * Үзүүр буланд нийлж тасралтгүй дөрвөлжин.
 */
export function createStarterPen(
  camp: Vector2,
  nextId: () => number,
): Fence[] {
  const g = FENCE_GRID;
  const n = STARTER_PEN_SIZE;
  const c = starterPenCenter(camp);
  // n=5 → хананы урт 5 тор; сегментийн төвүүд: -2,-1,0,1,2
  const wall = (n * g) / 2;
  const left = c.x - wall;
  const right = c.x + wall;
  const top = c.y - wall;
  const bottom = c.y + wall;
  const gateIndex = Math.floor(n / 2); // гол = хаалга

  const make = (x: number, y: number, orient: 0 | 1, isGate = false): Fence => ({
    id: nextId(),
    pos: { x, y },
    radius: FENCE_RADIUS,
    orient,
    tier: 1,
    hp: FENCE_MAX_HP_BY_TIER[1],
    maxHp: FENCE_MAX_HP_BY_TIER[1],
    isGate,
    gateOpen: 0,
    gateCloseIn: 0,
  });

  const fences: Fence[] = [];

  for (let i = 0; i < n; i++) {
    // Сегмент төв: хананы дагуу хагас тороор эхэлж алхамна
    const along = -wall + g / 2 + i * g;
    fences.push(make(c.x + along, top, 0, false));
    fences.push(make(c.x + along, bottom, 0, false));
    fences.push(make(left, c.y + along, 1, false));
    fences.push(make(right, c.y + along, 1, i === gateIndex));
  }

  return fences;
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function weatherLabel(w: WeatherKind, season: Season): string {
  const seasonMn: Record<Season, string> = {
    summer: "Зун",
    autumn: "Намар",
    winter: "Өвөл",
    spring: "Хавар",
  };
  const weatherMn: Record<WeatherKind, string> = {
    clear: "Цэлмэг",
    wind: "Салхитай",
    storm: "Бороотой",
    snow: "Цастай",
  };
  return `${seasonMn[season]} · ${weatherMn[w]}`;
}

export function formatClock(timeOfDay: number): string {
  const h = Math.floor(timeOfDay) % 24;
  const m = Math.floor((timeOfDay % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function setMessage(
  state: GameState,
  text: string,
  seconds = 2.5,
): void {
  state.message = text;
  state.messageTimer = seconds;
}

export function allocId(state: GameState): number {
  state.nextEntityId += 1;
  return state.nextEntityId;
}

export function seasonForDay(day: number): Season {
  return SEASON_ORDER[
    Math.floor((day - 1) / SEASON_DAYS) % SEASON_ORDER.length
  ];
}

/** Өвс хадаж болох улирал (бэлчээрт өвс үлдсэн үед) */
export function canHarvestHay(season: Season): boolean {
  return season === "summer" || season === "autumn" || season === "spring";
}

/** Улирал солигдоход бэлчээр дүүрэн ургана */
export function pastureRefillForSeason(season: Season): number {
  if (season === "winter") return 0;
  if (season === "summer") return MAX_PASTURE_GRASS;
  if (season === "autumn") return Math.floor(MAX_PASTURE_GRASS * 0.75);
  return Math.floor(MAX_PASTURE_GRASS * 0.55); // spring
}

/** Улирлын доторх өдөр (1…SEASON_DAYS) */
export function dayInSeason(day: number): number {
  return ((day - 1) % SEASON_DAYS) + 1;
}

export function isNight(world: World): boolean {
  if (world.dayPhase) return world.dayPhase === "night";
  return world.timeOfDay < 6 || world.timeOfDay > 19;
}

/** Хаалга нээлттэй үед мөргөлдөөн алгасна */
export function fenceBlocksMovement(fence: Fence): boolean {
  if (fence.isGate && fence.gateOpen >= GATE_PASS_OPEN) return false;
  return true;
}

/** Цэгээс шулуун хэрчим дээрх хамгийн ойр цэг */
function closestPointOnSegment(
  p: Vector2,
  a: Vector2,
  b: Vector2,
): Vector2 {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-8) return { x: a.x, y: a.y };
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2),
  );
  return { x: a.x + abx * t, y: a.y + aby * t };
}

/** Хашааны мөргөлдөөний зузаан (сегментээс хажуу тийш) */
const FENCE_COLLIDE_HALF = 5;
/** Үзүүрээс богиносгоно — нэг сегментийн завсраар багтана */
const FENCE_COLLIDE_INSET = 9;
/** Хэвтээ хашааны дээд төмөр рүү мөргөлдөөнийг татна (визуал y−7…−14) */
const FENCE_COLLIDE_EW_Y = -8;

/** Мөргөлдөөний сегмент — зурагдах үзүүрээс богино, EW дээшээ шилжинэ */
function fenceCollideSegment(
  pos: Vector2,
  orient: 0 | 1,
): [Vector2, Vector2] {
  const h = FENCE_GRID / 2 - FENCE_COLLIDE_INSET;
  if (orient === 0) {
    const cy = pos.y + FENCE_COLLIDE_EW_Y;
    return [
      { x: pos.x - h, y: cy },
      { x: pos.x + h, y: cy },
    ];
  }
  return [
    { x: pos.x, y: pos.y - h },
    { x: pos.x, y: pos.y + h },
  ];
}

/** Нээлттэй хаалгын гарц — хөрш хананы үзүүр хаахгүй */
function inOpenGatePassage(pos: Vector2, openGates: Fence[]): boolean {
  for (const g of openGates) {
    const [a, b] = fenceSegmentEnds(g.pos, g.orient);
    const onGate = closestPointOnSegment(pos, a, b);
    // Хаалгын шугамнаас ойр + сегментийн уртаас бага зэрэг өргөн
    if (dist(pos, onGate) <= FENCE_GRID * 0.55) return true;
  }
  return false;
}

/** Дайсан/хонь/тоглогчийг хашаанаас гадагш түлхэнэ. true = мөргөлдсөн. */
export function pushOutOfFences(
  pos: Vector2,
  radius: number,
  fences: Fence[],
): boolean {
  let hit = false;
  const openGates = fences.filter(
    (f) => f.isGate && f.gateOpen >= GATE_PASS_OPEN,
  );
  // Гарц дотор байвал огт түлхэхгүй
  if (openGates.length > 0 && inOpenGatePassage(pos, openGates)) {
    return false;
  }

  for (const fence of fences) {
    if (!fenceBlocksMovement(fence)) continue;
    const [a, b] = fenceCollideSegment(fence.pos, fence.orient);
    const closest = closestPointOnSegment(pos, a, b);
    // Хөрш хананы үзүүр нээлттэй хаалгыг битүүлнэ үгүй
    if (
      openGates.some(
        (g) =>
          dist(closest, g.pos) <= FENCE_GRID * 0.7 ||
          dist(pos, g.pos) <= FENCE_GRID * 0.55,
      )
    ) {
      continue;
    }
    const d = dist(pos, closest);
    const minD = radius + FENCE_COLLIDE_HALF;
    if (d >= minD) continue;
    hit = true;
    if (d > 1e-4) {
      const nx = (pos.x - closest.x) / d;
      const ny = (pos.y - closest.y) / d;
      pos.x = closest.x + nx * minD;
      pos.y = closest.y + ny * minD;
    } else {
      if (fence.orient === 0) {
        pos.y += minD;
      } else {
        pos.x += minD;
      }
    }
  }
  return hit;
}

/** Хашааны сегментийн хоёр үзүүр */
export function fenceSegmentEnds(
  pos: Vector2,
  orient: 0 | 1,
): [Vector2, Vector2] {
  const h = FENCE_GRID / 2;
  return orient === 0
    ? [
        { x: pos.x - h, y: pos.y },
        { x: pos.x + h, y: pos.y },
      ]
    : [
        { x: pos.x, y: pos.y - h },
        { x: pos.x, y: pos.y + h },
      ];
}

/** Хоёр хашаа тор дээр холбогдсон эсэх (төв эсвэл үзүүр нийлсэн) */
export function fencesGraphAdjacent(a: Vector2, b: Vector2): boolean {
  return dist(a, b) <= FENCE_GRID * 1.2;
}

/** Хоёр хашааны үзүүр/төв нийлсэн эсэх — булангийн холбоос орно */
function fencesShareJoint(a: Fence, b: Fence): boolean {
  if (a.id === b.id) return false;
  if (fencesGraphAdjacent(a.pos, b.pos)) return true;
  const [a0, a1] = fenceSegmentEnds(a.pos, a.orient);
  const [b0, b1] = fenceSegmentEnds(b.pos, b.orient);
  const tip = 5;
  return (
    dist(a0, b0) <= tip ||
    dist(a0, b1) <= tip ||
    dist(a1, b0) <= tip ||
    dist(a1, b1) <= tip
  );
}

function fenceTouchesPoint(fence: Fence, p: Vector2): boolean {
  const [e0, e1] = fenceSegmentEnds(fence.pos, fence.orient);
  const tip = 5;
  return (
    dist(fence.pos, p) <= FENCE_GRID * 0.55 ||
    dist(e0, p) <= tip ||
    dist(e1, p) <= tip
  );
}

/**
 * Шинэ сегмент тавих нь одоогийн хашааны граф дээр цикл үүсгэх эсэх —
 * сүүлийн хэсэг (хоёр үзүүр аль хэдийн холбогдсон сүлжээнд нийлбэл) → хаалга.
 */
export function wouldCloseFenceLoop(
  pos: Vector2,
  orient: 0 | 1,
  fences: Fence[],
): boolean {
  if (fences.length < 3) return false;
  const [endA, endB] = fenceSegmentEnds(pos, orient);
  const nearA = fences.filter((f) => fenceTouchesPoint(f, endA));
  const nearB = fences.filter((f) => fenceTouchesPoint(f, endB));
  if (nearA.length === 0 || nearB.length === 0) return false;

  // Ижил хашаа хоёр үзүүрт нийлсэн бол цикл биш
  const nearAIds = new Set(nearA.map((f) => f.id));
  if (nearB.every((f) => nearAIds.has(f.id)) && nearA.length === 1) {
    return false;
  }

  const toIds = new Set(nearB.map((f) => f.id));
  const visited = new Set<number>();
  const queue: Fence[] = [];
  for (const f of nearA) {
    visited.add(f.id);
    queue.push(f);
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (toIds.has(cur.id) && !nearAIds.has(cur.id)) return true;
    for (const other of fences) {
      if (visited.has(other.id)) continue;
      if (!fencesShareJoint(cur, other)) continue;
      if (toIds.has(other.id)) return true;
      visited.add(other.id);
      queue.push(other);
    }
  }
  return false;
}

/** Хаалганы нүдэнд хэн нэгэн байгаа эсэх */
export function gateDoorwayBlocked(
  fence: Fence,
  state: GameState,
): boolean {
  const r = fence.radius + 6;
  const { player, world } = state;
  if (dist(player.pos, fence.pos) < player.radius + r) return true;
  for (const sheep of world.flock.visuals) {
    if (dist(sheep.pos, fence.pos) < sheep.radius + r) return true;
  }
  if (world.dog && dist(world.dog.pos, fence.pos) < 12 + r) return true;
  for (const wolf of world.wolves) {
    if (!wolf.alive) continue;
    if (dist(wolf.pos, fence.pos) < wolf.radius + r) return true;
  }
  for (const thief of world.thieves) {
    if (!thief.alive) continue;
    if (dist(thief.pos, fence.pos) < thief.radius + r) return true;
  }
  return false;
}

/** Хаалга нээх/хаах анимац + авто-хаалт */
export function updateGates(state: GameState, dt: number): void {
  for (const fence of state.world.fences) {
    if (!fence.isGate) continue;

    if (fence.gateCloseIn > 0) {
      fence.gateCloseIn = Math.max(0, fence.gateCloseIn - dt);
      fence.gateOpen = Math.min(1, fence.gateOpen + dt / GATE_ANIM_SEC);
      continue;
    }

    if (fence.gateOpen <= 0) continue;

    if (gateDoorwayBlocked(fence, state)) {
      fence.gateOpen = Math.max(fence.gateOpen, GATE_PASS_OPEN);
      continue;
    }

    fence.gateOpen = Math.max(0, fence.gateOpen - dt / GATE_ANIM_SEC);
  }
}

/** Тоглогч хаалгыг биеэр түлхэж нээнэ; бүх хашаанд мөргөлдөнө */
export function collidePlayerWithGates(state: GameState): void {
  const { player, world } = state;
  for (const fence of world.fences) {
    if (!fence.isGate) continue;
    const [a, b] = fenceSegmentEnds(fence.pos, fence.orient);
    const closest = closestPointOnSegment(player.pos, a, b);
    const d = dist(player.pos, closest);
    const minD = player.radius + FENCE_COLLIDE_HALF;
    if (d >= minD + 6) continue;

    // Биеэр мөргөж бүрэн нээнэ — нэвтрэх боломжтой болгоно
    fence.gateCloseIn = Math.max(fence.gateCloseIn, GATE_CLOSE_DELAY);
    fence.gateOpen = Math.min(1, Math.max(fence.gateOpen, GATE_PASS_OPEN));
  }

  pushOutOfFences(player.pos, player.radius, world.fences);
}

/** Хашааг тор дээр байрлуулах координат */
export function snapFencePos(x: number, y: number, grid: number): Vector2 {
  return {
    x: Math.round(x / grid) * grid,
    y: Math.round(y / grid) * grid,
  };
}

export function fenceOrientFromFacing(facing: Vector2): 0 | 1 {
  return Math.abs(facing.x) >= Math.abs(facing.y) ? 1 : 0;
}

/** Тоглогчийн урд хашаа байрлуулах цэг */
export function fencePlacePos(
  playerPos: Vector2,
  facing: Vector2,
  grid: number,
): Vector2 {
  const f =
    Math.hypot(facing.x, facing.y) < 1e-4
      ? { x: 0, y: 1 }
      : normalize(facing);
  // Хагас тор — буланд үзүүр нийлэх боломжтой
  return snapFencePos(
    playerPos.x + f.x * grid,
    playerPos.y + f.y * grid,
    grid / 2,
  );
}

export function fencesOverlap(a: Vector2, b: Vector2): boolean {
  // Зөвхөн ижил/бараг ижил цэг — өөр чиглэлийн булангийн холбоосыг зөвшөөрнө
  return dist(a, b) < FENCE_GRID * 0.25;
}

/** Бэлчээрийн ойролцоох хашааны хамгаалалт */
export function pastureFenceDefense(world: World): {
  count: number;
  maxTier: FenceTier | 0;
  tier2Plus: number;
  tier3Count: number;
} {
  const center = pastureCenter(world);
  let count = 0;
  let maxTier: FenceTier | 0 = 0;
  let tier2Plus = 0;
  let tier3Count = 0;
  for (const fence of world.fences) {
    if (dist(fence.pos, center) > PASTURE_RADIUS + 100) continue;
    count += 1;
    if (fence.tier > maxTier) maxTier = fence.tier;
    if (fence.tier >= 2) tier2Plus += 1;
    if (fence.tier >= 3) tier3Count += 1;
  }
  return { count, maxTier, tier2Plus, tier3Count };
}

/** Ойролцоох хашаа хонийг хамгаалах (хохирлын үржүүлэгч) */
export function sheepFenceMitigation(
  sheepPos: Vector2,
  fences: Fence[],
): number {
  let best = 1;
  for (const fence of fences) {
    if (dist(sheepPos, fence.pos) > 58) continue;
    if (fence.tier === 1) best = Math.min(best, 0.82);
    else if (fence.tier === 2) best = Math.min(best, 0.4);
    else best = Math.min(best, 0.05);
  }
  return best;
}

/** Тоглогчид хамгийн ойр хашаа */
export function nearestFence(
  pos: Vector2,
  fences: Fence[],
  maxDist = 70,
): Fence | null {
  let best: Fence | null = null;
  let bestD = maxDist;
  for (const fence of fences) {
    const d = dist(pos, fence.pos);
    if (d < bestD) {
      bestD = d;
      best = fence;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// XP, Level, Skills
// ---------------------------------------------------------------------------
