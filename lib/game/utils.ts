// Хүн 1 (дундын суурь) — математик болон туслах функцүүд

import {
  FENCE_GRID,
  FENCE_RADIUS,
  GATE_ANIM_SEC,
  GATE_CLOSE_DELAY,
  GATE_PASS_OPEN,
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
  return { x: world.width / 2, y: world.height / 2 };
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

export function isNight(world: World): boolean {
  return world.timeOfDay < 6 || world.timeOfDay > 19;
}

/** Хаалга нээлттэй үед мөргөлдөөн алгасна */
export function fenceBlocksMovement(fence: Fence): boolean {
  if (fence.isGate && fence.gateOpen >= GATE_PASS_OPEN) return false;
  return true;
}

/** Дайсан/хонийг хашаанаас гадагш түлхэнэ. true = мөргөлдсөн. */
export function pushOutOfFences(
  pos: Vector2,
  radius: number,
  fences: Fence[],
): boolean {
  let hit = false;
  for (const fence of fences) {
    if (!fenceBlocksMovement(fence)) continue;
    const d = dist(pos, fence.pos);
    const minD = radius + fence.radius;
    if (d >= minD) continue;
    hit = true;
    if (d > 1e-4) {
      const nx = (pos.x - fence.pos.x) / d;
      const ny = (pos.y - fence.pos.y) / d;
      pos.x = fence.pos.x + nx * minD;
      pos.y = fence.pos.y + ny * minD;
    } else {
      pos.x = fence.pos.x + minD;
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

/** Хоёр хашаа тор дээр холбогдсон эсэх */
export function fencesGraphAdjacent(a: Vector2, b: Vector2): boolean {
  return dist(a, b) <= FENCE_GRID * 1.2;
}

/**
 * Шинэ сегмент тавих нь одоогийн хашааны граф дээр цикл үүсгэх эсэх —
 * хоёр үзүүр тус бүрт холбогдсон мөчрүүд аль хэдийн нэг холбоос дотор байвал хаалга.
 */
export function wouldCloseFenceLoop(
  pos: Vector2,
  orient: 0 | 1,
  fences: Fence[],
): boolean {
  if (fences.length < 3) return false;
  const [endA, endB] = fenceSegmentEnds(pos, orient);
  const endLink = FENCE_GRID * 0.7;
  const nearA = fences.filter((f) => dist(f.pos, endA) <= endLink);
  const nearB = fences.filter((f) => dist(f.pos, endB) <= endLink);
  if (nearA.length === 0 || nearB.length === 0) return false;

  const toIds = new Set(nearB.map((f) => f.id));
  const visited = new Set<number>();
  const queue: Fence[] = [];
  for (const f of nearA) {
    visited.add(f.id);
    queue.push(f);
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const other of fences) {
      if (visited.has(other.id)) continue;
      if (!fencesGraphAdjacent(cur.pos, other.pos)) continue;
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

/** Тоглогч хаалгыг биеэр түлхэж нээнэ; хаалттай үед түлхэнэ */
export function collidePlayerWithGates(state: GameState): void {
  const { player, world } = state;
  for (const fence of world.fences) {
    if (!fence.isGate) continue;
    const d = dist(player.pos, fence.pos);
    const minD = player.radius + fence.radius;
    if (d >= minD + 2) continue;

    // Биеэр мөргөж нээнэ
    if (fence.gateOpen < 1) {
      fence.gateCloseIn = GATE_CLOSE_DELAY;
      fence.gateOpen = Math.min(1, Math.max(fence.gateOpen, 0.15));
    }

    if (!fenceBlocksMovement(fence)) continue;

    if (d > 1e-4) {
      const nx = (player.pos.x - fence.pos.x) / d;
      const ny = (player.pos.y - fence.pos.y) / d;
      player.pos.x = fence.pos.x + nx * minD;
      player.pos.y = fence.pos.y + ny * minD;
    } else {
      player.pos.x = fence.pos.x + minD;
    }
  }
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
  return snapFencePos(
    playerPos.x + f.x * grid,
    playerPos.y + f.y * grid,
    grid,
  );
}

export function fencesOverlap(a: Vector2, b: Vector2): boolean {
  return dist(a, b) < FENCE_RADIUS * 1.6;
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
