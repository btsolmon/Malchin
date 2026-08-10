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
  type InputState,
  type LivestockKind,
  type BannerAlertKind,
  type PenKind,
  type Season,
  type Vector2,
  type World,
} from "./types";

/** Бүх товчлуур дараагүй, хулгана хөдлөөгүй эхний оролт */
export function neutralInput(): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    interact: false,
    attack: false,
    attackPressed: false,
    dodge: false,
    dodgePressed: false,
    parry: false,
    parryPressed: false,
    shoot: false,
    lightFire: false,
    buildFence: false,
    eat: false,
    debugCheats: false,
    debugBoss: false,
    herd: false,
    migrate: false,
    horseMount: false,
    skill1: false,
    skill2: false,
    skill3: false,
    skill4: false,
    confirm: false,
    pause: false,
    menuUp: false,
    menuDown: false,
    menuLeft: false,
    menuRight: false,
    mouseX: 0,
    mouseY: 0,
    mouseMoved: false,
    mouseClicked: false,
  };
}

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

/** Гэрийн хаалганы байрлал — урд талд (гаднаас ойртоход E дарж орно) */
export function gerDoorPos(world: World): Vector2 {
  const c = pastureCenter(world);
  return { x: c.x, y: c.y + 18 };
}

/**
 * Монгол гэрийн биеийн мөргөлдөөн — эллипсээс гадагш түлхэнэ.
 * Тоглогч/аав ээж/мал/дайсан бүгдэд адилхан.
 */
export function pushOutOfGer(
  pos: Vector2,
  radius: number,
  world: World,
): boolean {
  if (world.gerPacked) return false;

  const center = pastureCenter(world);
  const gerPos = { x: center.x, y: center.y - 14 };
  const rx = 34;
  const ry = 22;
  const pad = radius;

  const dx = pos.x - gerPos.x;
  const dy = pos.y - gerPos.y;
  const nx = dx / (rx + pad);
  const ny = dy / (ry + pad);
  const d = Math.hypot(nx, ny);
  if (d >= 1 || d < 1e-6) {
    if (d < 1e-6) {
      pos.y = gerPos.y + ry + pad;
      return true;
    }
    return false;
  }

  pos.x = gerPos.x + dx / d;
  pos.y = gerPos.y + dy / d;
  return true;
}

/**
 * Бөөгийн урц — эллипс мөргөлдөөн (гэр шиг нэвт гарч болохгүй).
 */
export function pushOutOfUrtz(
  pos: Vector2,
  radius: number,
  world: World,
): boolean {
  const gerPos = world.elder.gerPos;
  const rx = 36;
  const ry = 20;
  const pad = radius;

  const dx = pos.x - gerPos.x;
  const dy = pos.y - gerPos.y;
  const nx = dx / (rx + pad);
  const ny = dy / (ry + pad);
  const d = Math.hypot(nx, ny);
  if (d >= 1 || d < 1e-6) {
    if (d < 1e-6) {
      pos.y = gerPos.y + ry + pad;
      return true;
    }
    return false;
  }

  pos.x = gerPos.x + dx / d;
  pos.y = gerPos.y + dy / d;
  return true;
}

/** Эхлэлийн хашааны хэмжээ (тал бүрт торны тоо) */
export const STARTER_PEN_SIZE = 5;
/** Үхрийн хашааны хэмжээ */
export const CATTLE_PEN_SIZE = 4;

export function angleFromOrient(orient: 0 | 1): number {
  return orient === 1 ? Math.PI / 2 : 0;
}

/** Хоёр өнцөг ижил чиглэлтэй эсэх (урвуу чиглэл ч тооцно) */
export function anglesNearlyEqual(a: number, b: number, tol = 0.2): boolean {
  let d = Math.abs(a - b) % Math.PI;
  if (d > Math.PI / 2) d = Math.PI - d;
  return d <= tol;
}

/** Fence-ийн чиглэл (хуучин save-д angle байхгүй бол orient-оос) */
export function fenceAngle(fence: Pick<Fence, "orient"> & { angle?: number }): number {
  return fence.angle ?? angleFromOrient(fence.orient);
}

/** Мал гаргах/оруулах цэг — хашааны хаалга (байхгүй бол баруун тал) */
export function flockGatePos(
  world: World,
  pen: PenKind = "sheep",
): Vector2 {
  const gate = world.fences.find((f) => f.isGate && f.pen === pen);
  if (gate) return { x: gate.pos.x, y: gate.pos.y };
  const c = penCenterFor(world, pen);
  const n = pen === "cattle" ? CATTLE_PEN_SIZE : STARTER_PEN_SIZE;
  const halfSide = (n * FENCE_GRID) / 2;
  // Хонин хашаа: зүүн тал → хаалга зүүнээс гэртэй ойр (баруун хана)
  // Үхрийн хашаа: урд → хаалга гэртэй ойр (хойд хана)
  if (pen === "cattle") return { x: c.x, y: c.y - halfSide };
  return { x: c.x + halfSide, y: c.y };
}

/** Тоглогчид хамгийн ойр хаалга */
export function nearestPenGate(
  world: World,
  pos: Vector2,
): { pen: PenKind; gate: Vector2; fence: Fence | null; d: number } | null {
  let best: { pen: PenKind; gate: Vector2; fence: Fence | null; d: number } | null =
    null;
  for (const pen of ["sheep", "cattle"] as const) {
    const fence = world.fences.find((f) => f.isGate && f.pen === pen) ?? null;
    const gate = flockGatePos(world, pen);
    const d = dist(pos, gate);
    if (!best || d < best.d) best = { pen, gate, fence, d };
  }
  return best;
}

export const FLOCK_GATE_RADIUS = 36;

/** Хонин/ямааны хашааны төв — гэрийн зүүн (−X), бага зэрэг урагш */
export function starterPenCenter(camp: Vector2): Vector2 {
  const halfSide = (STARTER_PEN_SIZE * FENCE_GRID) / 2;
  return snapFencePos(
    camp.x - halfSide - 7 * FENCE_GRID,
    camp.y + 3 * FENCE_GRID,
    FENCE_GRID,
  );
}

/** Үхрийн хашааны төв — гэрийн урд (өмнөд) */
export function cattlePenCenter(camp: Vector2): Vector2 {
  const halfSide = (CATTLE_PEN_SIZE * FENCE_GRID) / 2;
  return snapFencePos(
    camp.x,
    camp.y + halfSide + 7 * FENCE_GRID,
    FENCE_GRID,
  );
}

/** Хашаан доторх малын бөөгнөрөх радиус */
export const PEN_RADIUS = (STARTER_PEN_SIZE * FENCE_GRID) / 2 - 10;
export const CATTLE_PEN_RADIUS = (CATTLE_PEN_SIZE * FENCE_GRID) / 2 - 8;

export function penCenter(world: World): Vector2 {
  return starterPenCenter(world.campPos);
}

export function penCenterFor(world: World, pen: PenKind): Vector2 {
  return pen === "cattle"
    ? cattlePenCenter(world.campPos)
    : starterPenCenter(world.campPos);
}

export function penRadiusFor(pen: PenKind): number {
  return pen === "cattle" ? CATTLE_PEN_RADIUS : PEN_RADIUS;
}

/** Малын төрөл → хашаа (морь/тэмээ хонинтой цуг) */
export function penForLivestock(kind: LivestockKind): PenKind {
  return kind === "cattle" ? "cattle" : "sheep";
}

export function animalIsOut(world: World, kind: LivestockKind): boolean {
  return penForLivestock(kind) === "cattle" ? world.cattleOut : world.flockOut;
}

/**
 * Эхлэлийн хашаа — тал бүрт STARTER_PEN_SIZE сегмент (5×5).
 * Үзүүр буланд нийлж тасралтгүй дөрвөлжин.
 */
export function createStarterPen(
  camp: Vector2,
  nextId: () => number,
): Fence[] {
  return createRectPen(
    starterPenCenter(camp),
    STARTER_PEN_SIZE,
    "sheep",
    "east",
    nextId,
  );
}

/** Үхрийн хашаа — гэрийн урд, хаалга хойд тал (гэр рүү) */
export function createCattlePen(
  camp: Vector2,
  nextId: () => number,
): Fence[] {
  return createRectPen(
    cattlePenCenter(camp),
    CATTLE_PEN_SIZE,
    "cattle",
    "north",
    nextId,
  );
}

/** Хонин + үхрийн хашаа */
export function createCampPens(
  camp: Vector2,
  nextId: () => number,
): Fence[] {
  return [...createStarterPen(camp, nextId), ...createCattlePen(camp, nextId)];
}

function createRectPen(
  c: Vector2,
  n: number,
  pen: PenKind,
  gateSide: "east" | "north",
  nextId: () => number,
): Fence[] {
  const g = FENCE_GRID;
  const wall = (n * g) / 2;
  const left = c.x - wall;
  const right = c.x + wall;
  const top = c.y - wall;
  const bottom = c.y + wall;
  const gateIndex = Math.floor(n / 2);

  const make = (
    x: number,
    y: number,
    orient: 0 | 1,
    isGate = false,
  ): Fence => ({
    id: nextId(),
    pos: { x, y },
    radius: FENCE_RADIUS,
    angle: angleFromOrient(orient),
    orient,
    tier: 1,
    hp: FENCE_MAX_HP_BY_TIER[1],
    maxHp: FENCE_MAX_HP_BY_TIER[1],
    isGate,
    gateOpen: 0,
    gateCloseIn: 0,
    pen,
  });

  const fences: Fence[] = [];
  for (let i = 0; i < n; i++) {
    const along = -wall + g / 2 + i * g;
    const eastGate = gateSide === "east" && i === gateIndex;
    const northGate = gateSide === "north" && i === gateIndex;
    fences.push(make(c.x + along, top, 0, northGate));
    fences.push(make(c.x + along, bottom, 0, false));
    fences.push(make(left, c.y + along, 1, false));
    fences.push(make(right, c.y + along, 1, eastGate));
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

export function setMessage(
  state: GameState,
  text: string,
  seconds = 3.5,
): void {
  state.message = text;
  state.messageTimer = seconds;
}

export function setBannerAlert(
  state: GameState,
  text: string,
  seconds = 3.8,
  kind: BannerAlertKind = "threat",
): void {
  // Өлсгөлөн мэдэгдэл идэвхтэй дайсны мэдэгдлийг бүү дар
  if (
    kind === "hunger" &&
    state.bannerAlert &&
    state.bannerAlert.kind !== "hunger" &&
    state.bannerAlert.timer > 0.9
  ) {
    return;
  }
  // Ижил өлсгөлөн баннерыг дахин fade-гүйгээр сунгана
  if (
    kind === "hunger" &&
    state.bannerAlert &&
    state.bannerAlert.kind === "hunger" &&
    state.bannerAlert.text === text
  ) {
    state.bannerAlert.timer = Math.max(state.bannerAlert.timer, seconds * 0.75);
    return;
  }
  state.bannerAlert = {
    text,
    timer: seconds,
    duration: Math.max(0.1, seconds),
    kind,
  };
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

/** Мөргөлдөөний сегмент — зурагдах үзүүрээс богино, төмөр өндөрт татна */
function fenceCollideSegment(fence: Fence): [Vector2, Vector2] {
  const angle = fenceAngle(fence);
  const h = FENCE_GRID / 2 - FENCE_COLLIDE_INSET;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // Локал "дээш" — хэвтээ үед y−8 шиг
  const lift = -FENCE_COLLIDE_EW_Y;
  const ox = Math.sin(angle) * lift;
  const oy = -Math.cos(angle) * lift;
  return [
    { x: fence.pos.x - c * h + ox, y: fence.pos.y - s * h + oy },
    { x: fence.pos.x + c * h + ox, y: fence.pos.y + s * h + oy },
  ];
}

/** Нээлттэй хаалгын гарц — хөрш хананы үзүүр хаахгүй */
function inOpenGatePassage(pos: Vector2, openGates: Fence[]): boolean {
  for (const g of openGates) {
    const [a, b] = fenceSegmentEnds(g);
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
    const [a, b] = fenceCollideSegment(fence);
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
      const ang = fenceAngle(fence) + Math.PI / 2;
      pos.x += Math.cos(ang) * minD;
      pos.y += Math.sin(ang) * minD;
    }
  }
  return hit;
}

/** Хашааны сегментийн хоёр үзүүр */
export function fenceSegmentEnds(
  fenceOrPos: Fence | Vector2,
  orientOrAngle?: 0 | 1 | number,
): [Vector2, Vector2] {
  let pos: Vector2;
  let angle: number;
  if (
    typeof fenceOrPos === "object" &&
    fenceOrPos !== null &&
    "pos" in fenceOrPos &&
    "orient" in fenceOrPos
  ) {
    pos = fenceOrPos.pos;
    angle = fenceAngle(fenceOrPos);
  } else {
    pos = fenceOrPos as Vector2;
    const oa = orientOrAngle ?? 0;
    angle = oa === 0 || oa === 1 ? angleFromOrient(oa) : oa;
  }
  const h = FENCE_GRID / 2;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    { x: pos.x - c * h, y: pos.y - s * h },
    { x: pos.x + c * h, y: pos.y + s * h },
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
  const [a0, a1] = fenceSegmentEnds(a);
  const [b0, b1] = fenceSegmentEnds(b);
  const tip = 5;
  return (
    dist(a0, b0) <= tip ||
    dist(a0, b1) <= tip ||
    dist(a1, b0) <= tip ||
    dist(a1, b1) <= tip
  );
}

function fenceTouchesPoint(fence: Fence, p: Vector2): boolean {
  const [e0, e1] = fenceSegmentEnds(fence);
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
  orientOrAngle: 0 | 1 | number,
  fences: Fence[],
): boolean {
  // Аль хэдийн хаалга байвал шинэ хаалга үүсгэхгүй
  if (fences.some((f) => f.isGate)) return false;
  if (fences.length < 3) return false;
  const angle =
    orientOrAngle === 0 || orientOrAngle === 1
      ? angleFromOrient(orientOrAngle)
      : orientOrAngle;
  const [endA, endB] = fenceSegmentEnds(pos, angle);
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
  if (state.parents) {
    const pr = 12 + r;
    if (
      !state.parents.father.insideGer &&
      dist(state.parents.father.pos, fence.pos) < pr
    ) {
      return true;
    }
    if (
      !state.parents.mother.insideGer &&
      dist(state.parents.mother.pos, fence.pos) < pr
    ) {
      return true;
    }
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
    const [a, b] = fenceSegmentEnds(fence);
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
  // Зүүн/баруун харвал босоо хашаа; дээр/доор харвал хэвтээ
  return Math.abs(facing.x) >= Math.abs(facing.y) ? 1 : 0;
}

/** Тоглогчийн эгц дээр / доор / зүүн / баруун */
export function cardinalFacing(facing: Vector2): Vector2 {
  if (Math.hypot(facing.x, facing.y) < 1e-4) return { x: 0, y: 1 };
  if (Math.abs(facing.x) >= Math.abs(facing.y)) {
    return { x: facing.x >= 0 ? 1 : -1, y: 0 };
  }
  return { x: 0, y: facing.y >= 0 ? 1 : -1 };
}

/**
 * Хашаа байрлуулах цэг —
 * дээр/доор/зүүн/баруун ижил зай (grid);
 * ойрын хашаа байвал түүнд нийлүүлж түгжинэ.
 */
export function fencePlacePos(
  playerPos: Vector2,
  facing: Vector2,
  grid: number,
  _offsetSteps: Vector2 = { x: 0, y: 0 },
  angle: number = 0,
  fences: Fence[] = [],
): Vector2 {
  const dir = cardinalFacing(facing);
  // Дөрвөн зүгт ижил зай
  const aim = {
    x: playerPos.x + dir.x * grid,
    y: playerPos.y + dir.y * grid,
  };

  let best: Vector2 | null = null;
  let bestD = grid * 1.25;

  const consider = (cand: Vector2): void => {
    // Зөвхөн харсан тал руу (ард талд нийлүүлэхгүй)
    const ahead =
      (cand.x - playerPos.x) * dir.x + (cand.y - playerPos.y) * dir.y;
    if (ahead < grid * 0.25) return;
    const d = dist(cand, aim);
    if (d < bestD) {
      bestD = d;
      best = cand;
    }
  };

  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const half = grid / 2;

  for (const f of fences) {
    const fa = fenceAngle(f);
    if (anglesNearlyEqual(fa, angle)) {
      // Ижил чиглэл — эгнээнд хажуугийн тор
      const fc = Math.cos(fa);
      const fs = Math.sin(fa);
      const t = (aim.x - f.pos.x) * fc + (aim.y - f.pos.y) * fs;
      let slot = Math.round(t / grid);
      if (slot === 0) slot = t >= 0 ? 1 : -1;
      consider({
        x: f.pos.x + fc * slot * grid,
        y: f.pos.y + fs * slot * grid,
      });
      // ±1 тор нэмж шалгана
      for (const extra of [slot - 1, slot + 1]) {
        if (extra === 0) continue;
        consider({
          x: f.pos.x + fc * extra * grid,
          y: f.pos.y + fs * extra * grid,
        });
      }
    } else {
      // Перпендикуляр — үзүүрт булангаар нийлнэ
      const [e0, e1] = fenceSegmentEnds(f);
      for (const end of [e0, e1]) {
        for (const sign of [-1, 1] as const) {
          consider({
            x: end.x + c * sign * half,
            y: end.y + s * sign * half,
          });
        }
      }
    }
  }

  if (best) return best;
  return aim;
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
