// Аав ээж — хаалгаар нэвтэрч, өдөр ажиллаад орой гэрт орно

import { sfx } from "./audio";
import { damageThief, damageWolf } from "./combat";
import { animalInPen } from "./daycycle";
import { spawnParticles, spawnText } from "./effects";
import {
  FENCE_GRID,
  GATE_CLOSE_DELAY,
  GATE_PASS_OPEN,
  PASTURE_RADIUS,
  PRODUCE_INTERVAL,
  type BerryBush,
  type GameState,
  type HerdAnimal,
  type ParentNpc,
  type Tree,
  type Vector2,
  type WorldStone,
} from "./types";
import {
  clamp,
  dist,
  flockGatePos,
  gerDoorPos,
  normalize,
  pastureCenter,
  pushOutOfFences,
  pushOutOfGer,
  pushOutOfUrtz,
} from "./utils";

const PARENT_SPEED = 62;
const PARENT_RADIUS = 12;
const ARRIVE = 14;
const FACE_FLIP_DX = 6;
const GATHER_SCAN = PASTURE_RADIUS + 260;
const FIGHT_SCAN = 220;
const ATTACK_RANGE = 30;
const FATHER_ATTACK_DMG = 7;

function collideParentWorld(state: GameState, p: ParentNpc): void {
  pushOutOfFences(p.pos, PARENT_RADIUS, state.world.fences);
  pushOutOfGer(p.pos, PARENT_RADIUS, state.world);
  pushOutOfUrtz(p.pos, PARENT_RADIUS, state.world);
}

function makeParent(
  role: "father" | "mother",
  pos: Vector2,
): ParentNpc {
  return {
    role,
    pos: { ...pos },
    facing: { x: role === "father" ? 1 : -1, y: 0 },
    face: role === "father" ? 1 : -1,
    moving: false,
    task: "idle",
    taskTimer: 1.2 + Math.random(),
    workPulse: 0,
    targetId: null,
    walkTarget: null,
    walkPhase: Math.random() * Math.PI * 2,
    insideGer: false,
    attackCooldown: 0,
    attackAnim: 0,
  };
}

export function ensureParents(state: GameState): void {
  if (state.parents) {
    // Хуучин save — шинэ талбарууд
    for (const p of [state.parents.father, state.parents.mother]) {
      if (typeof p.insideGer !== "boolean") p.insideGer = false;
      if (typeof p.attackCooldown !== "number") p.attackCooldown = 0;
      if (typeof p.attackAnim !== "number") p.attackAnim = 0;
    }
    return;
  }
  const c = state.world.campPos;
  state.parents = {
    father: makeParent("father", { x: c.x - 40, y: c.y + 52 }),
    mother: makeParent("mother", { x: c.x + 44, y: c.y + 56 }),
  };
  state.parentsReturned = true;
}

function setWalkTarget(p: ParentNpc, target: Vector2): void {
  p.walkTarget = { x: target.x, y: target.y };
}

function clearWalk(p: ParentNpc): void {
  p.walkTarget = null;
  p.moving = false;
}

function updateFace(p: ParentNpc, dx: number): void {
  if (dx > FACE_FLIP_DX) p.face = 1;
  else if (dx < -FACE_FLIP_DX) p.face = -1;
  p.facing = { x: p.face, y: 0 };
}

/** Хаалга нээж нэвтрэх */
function openGateNear(state: GameState, pos: Vector2): void {
  for (const fence of state.world.fences) {
    if (!fence.isGate) continue;
    if (dist(pos, fence.pos) > FENCE_GRID * 1.1) continue;
    fence.gateCloseIn = Math.max(fence.gateCloseIn, GATE_CLOSE_DELAY + 1.5);
    fence.gateOpen = Math.min(1, Math.max(fence.gateOpen, GATE_PASS_OPEN));
  }
}

/**
 * Хашаа давж болохгүй — зорилт нөгөө талд бол эхлээд хаалга руу.
 */
function routePoint(
  state: GameState,
  from: Vector2,
  finalTarget: Vector2,
): Vector2 {
  const world = state.world;
  // Эцэг эх хонин хашаагаар нэвтрэнэ (үндсэн хашаа)
  const fromIn = animalInPen(from, world, "sheep");
  const toIn = animalInPen(finalTarget, world, "sheep");
  if (fromIn === toIn) return finalTarget;

  const gate = flockGatePos(world, "sheep");
  if (dist(from, gate) > 28) {
    return { x: gate.x, y: gate.y };
  }
  openGateNear(state, from);
  return finalTarget;
}

/** Зөөлөн алхалт + хашаанаас түлхэлт */
function stepTo(
  state: GameState,
  p: ParentNpc,
  target: Vector2,
  dt: number,
  speed = PARENT_SPEED,
): boolean {
  const routed = routePoint(state, p.pos, target);
  const dx = routed.x - p.pos.x;
  const dy = routed.y - p.pos.y;
  const d = Math.hypot(dx, dy);

  if (d <= ARRIVE) {
    // Хаалганы завсрын цэг дээр ирсэн бол үргэлжлүүлнэ
    if (dist(routed, target) > ARRIVE + 2) {
      openGateNear(state, p.pos);
      p.pos.x = routed.x;
      p.pos.y = routed.y;
      collideParentWorld(state, p);
      return false;
    }
    p.pos.x = target.x;
    p.pos.y = target.y;
    clearWalk(p);
    collideParentWorld(state, p);
    return true;
  }

  const slow = d < 28 ? clamp(d / 28, 0.6, 1) : 1;
  const step = Math.min(d, speed * slow * dt);
  const dir = normalize({ x: dx, y: dy });
  p.pos.x += dir.x * step;
  p.pos.y += dir.y * step;
  openGateNear(state, p.pos);
  collideParentWorld(state, p);
  p.moving = true;
  // Алхааны анимэйшний хурд тогтмол — удаашрахад гацахгүй
  p.walkPhase += dt * 10.5;
  updateFace(p, dx);
  return false;
}

function clampNearCamp(
  state: GameState,
  p: ParentNpc,
  maxExtra = 90,
): void {
  const c = pastureCenter(state.world);
  const maxR = PASTURE_RADIUS + maxExtra;
  const d = dist(p.pos, c);
  if (d > maxR) {
    const dir = normalize({ x: c.x - p.pos.x, y: c.y - p.pos.y });
    p.pos.x = c.x - dir.x * maxR;
    p.pos.y = c.y - dir.y * maxR;
    collideParentWorld(state, p);
  }
  p.pos.x = clamp(p.pos.x, 40, state.world.width - 40);
  p.pos.y = clamp(p.pos.y, 40, state.world.height - 40);
}

function pickWanderSpot(
  center: Vector2,
  radiusX: number,
  radiusY: number,
  yBias: number,
): Vector2 {
  const ang = Math.random() * Math.PI * 2;
  return {
    x: center.x + Math.cos(ang) * radiusX,
    y: center.y + Math.sin(ang) * radiusY + yBias,
  };
}

function beginIdle(p: ParentNpc, seconds: number): void {
  p.task = "idle";
  p.taskTimer = seconds;
  p.targetId = null;
  clearWalk(p);
}

function isEveningOrNight(state: GameState): boolean {
  const phase = state.world.dayPhase;
  return phase === "evening" || phase === "night";
}

function isDayWorkTime(state: GameState): boolean {
  const phase = state.world.dayPhase;
  return phase === "dawn" || phase === "day";
}

/** Сүү өгдөг мал (хонь = ноос — алгасна) */
function nearestMilkReady(
  from: Vector2,
  visuals: HerdAnimal[],
  maxDist: number,
): HerdAnimal | null {
  let best: HerdAnimal | null = null;
  let bestD = Infinity;
  for (const a of visuals) {
    if (!a.produceReady) continue;
    if (a.kind === "sheep") continue;
    const d = dist(from, a.pos);
    if (d < bestD && d < maxDist) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

function collectMilk(state: GameState, animal: HerdAnimal): void {
  animal.produceReady = false;
  animal.produceIn = PRODUCE_INTERVAL[animal.kind] * (0.85 + Math.random() * 0.3);
  state.player.inventory.milk += 1;
  state.score += 2;
  sfx("berry");
  spawnParticles(state, animal.pos, 6, "#f0e0a0", { speed: 50, size: 2 });
  spawnText(state, animal.pos, "+1 сүү", "#ffe9a0");
  spawnText(state, state.parents!.mother.pos, "Ээж саав", "#ffe9a0");
}

function findStoneNear(
  from: Vector2,
  stones: WorldStone[],
  maxDist: number,
): WorldStone | null {
  let best: WorldStone | null = null;
  let bestD = Infinity;
  for (const s of stones) {
    if (s.amount <= 0) continue;
    const d = dist(from, s.pos);
    if (d < bestD && d < maxDist) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function findBushNear(
  from: Vector2,
  bushes: BerryBush[],
  maxDist: number,
): BerryBush | null {
  let best: BerryBush | null = null;
  let bestD = Infinity;
  for (const b of bushes) {
    if (b.berries <= 0) continue;
    const d = dist(from, b.pos);
    if (d < bestD && d < maxDist) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

function findTreeNear(
  from: Vector2,
  trees: Tree[],
  maxDist: number,
): Tree | null {
  let best: Tree | null = null;
  let bestD = Infinity;
  for (const t of trees) {
    if (t.hp <= 0) continue;
    const d = dist(from, t.pos);
    if (d < bestD && d < maxDist) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

function nearestThreat(
  state: GameState,
  from: Vector2,
  maxDist: number,
): { id: number; pos: Vector2; kind: "wolf" | "thief" } | null {
  let best: { id: number; pos: Vector2; kind: "wolf" | "thief" } | null = null;
  let bestD = Infinity;
  for (const w of state.world.wolves) {
    if (!w.alive || w.hp <= 0) continue;
    const d = dist(from, w.pos);
    if (d < bestD && d < maxDist) {
      bestD = d;
      best = { id: w.id, pos: w.pos, kind: "wolf" };
    }
  }
  for (const t of state.world.thieves) {
    if (!t.alive || t.hp <= 0) continue;
    const d = dist(from, t.pos);
    if (d < bestD && d < maxDist) {
      bestD = d;
      best = { id: t.id, pos: t.pos, kind: "thief" };
    }
  }
  return best;
}

function exitGerIfDawn(state: GameState, p: ParentNpc): boolean {
  if (!p.insideGer) return false;
  if (!isDayWorkTime(state)) return true; // still inside
  p.insideGer = false;
  const door = gerDoorPos(state.world);
  const side = p.role === "father" ? -28 : 28;
  p.pos = { x: door.x + side, y: door.y + 22 };
  beginIdle(p, 0.8 + Math.random());
  collideParentWorld(state, p);
  return false;
}

function beginGoHome(p: ParentNpc, state: GameState): void {
  p.task = "goHome";
  p.taskTimer = 25;
  p.targetId = null;
  setWalkTarget(p, gerDoorPos(state.world));
}

function updateGoHome(
  state: GameState,
  p: ParentNpc,
  dt: number,
): void {
  if (p.insideGer) {
    p.moving = false;
    return;
  }
  const door = gerDoorPos(state.world);
  if (!p.walkTarget) setWalkTarget(p, door);
  if (stepTo(state, p, p.walkTarget ?? door, dt, PARENT_SPEED * 0.95)) {
    p.insideGer = true;
    clearWalk(p);
    p.task = "idle";
    p.taskTimer = 99;
    spawnText(state, door, p.role === "father" ? "Аав гэртээ" : "Ээж гэртээ", "#d8c8a0");
    return;
  }
  if (p.taskTimer <= 0 || dist(p.pos, door) < 40) {
    p.insideGer = true;
    clearWalk(p);
    p.task = "idle";
    p.taskTimer = 99;
  }
}

function updateFather(state: GameState, dt: number): void {
  const father = state.parents!.father;
  const world = state.world;
  const center = pastureCenter(world);
  const inv = state.player.inventory;

  father.taskTimer = Math.max(0, father.taskTimer - dt);
  father.workPulse = Math.max(0, father.workPulse - dt);
  father.attackCooldown = Math.max(0, father.attackCooldown - dt);
  father.attackAnim = Math.max(0, father.attackAnim - dt);

  if (exitGerIfDawn(state, father)) return;

  if (isEveningOrNight(state) && father.task !== "goHome") {
    beginGoHome(father, state);
  }

  // Дайсан ойртоход ажил таслаад тулалдана (орой гэрт орохоос бусад)
  if (father.task !== "goHome" && father.task !== "fight") {
    const threat = nearestThreat(state, father.pos, FIGHT_SCAN);
    if (threat) {
      father.task = "fight";
      father.taskTimer = 14;
      father.targetId = threat.id;
      setWalkTarget(father, threat.pos);
    }
  }

  if (father.task === "goHome") {
    updateGoHome(state, father, dt);
    return;
  }

  if (father.task === "idle" && father.taskTimer <= 0) {
    const threat = nearestThreat(state, father.pos, FIGHT_SCAN);
    const stone = findStoneNear(center, world.stones, GATHER_SCAN);
    const bush = findBushNear(center, world.bushes, GATHER_SCAN);
    const tree = findTreeNear(center, world.trees, GATHER_SCAN);
    const roll = Math.random();

    if (threat) {
      father.task = "fight";
      father.taskTimer = 14;
      father.targetId = threat.id;
      setWalkTarget(father, threat.pos);
    } else if (stone && roll < 0.34) {
      father.task = "gatherStone";
      father.taskTimer = 16;
      father.targetId = stone.id;
      setWalkTarget(father, stone.pos);
    } else if (bush && roll < 0.62) {
      father.task = "gatherBerry";
      father.taskTimer = 14;
      father.targetId = bush.id;
      setWalkTarget(father, bush.pos);
    } else if (tree) {
      father.task = "gatherWood";
      father.taskTimer = 18;
      father.targetId = tree.id;
      setWalkTarget(father, tree.pos);
    } else {
      father.task = "wander";
      father.taskTimer = 4 + Math.random() * 3;
      father.targetId = null;
      setWalkTarget(
        father,
        pickWanderSpot(center, PASTURE_RADIUS * 0.42, PASTURE_RADIUS * 0.32, 18),
      );
    }
  }

  if (father.task === "idle") {
    father.moving = false;
    return;
  }

  if (father.task === "fight") {
    const wolf = world.wolves.find(
      (w) => w.id === father.targetId && w.alive && w.hp > 0,
    );
    const thief = world.thieves.find(
      (t) => t.id === father.targetId && t.alive && t.hp > 0,
    );
    const foe = wolf ?? thief;
    if (!foe || father.taskTimer <= 0) {
      beginIdle(father, 1);
      return;
    }
    if (!father.walkTarget || dist(father.walkTarget, foe.pos) > 20) {
      setWalkTarget(father, foe.pos);
    }
    stepTo(state, father, father.walkTarget!, dt, PARENT_SPEED * 1.12);
    if (dist(father.pos, foe.pos) < ATTACK_RANGE && father.attackCooldown <= 0) {
      father.attackAnim = 0.28;
      father.workPulse = 0;
      father.attackCooldown = 0.75;
      if (wolf) {
        damageWolf(state, wolf, FATHER_ATTACK_DMG);
        spawnText(state, father.pos, "Аав цохив", "#ffb070");
      } else if (thief) {
        damageThief(state, thief, FATHER_ATTACK_DMG);
        spawnText(state, father.pos, "Аав цохив", "#ffb070");
      }
      if ((!wolf || !wolf.alive || wolf.hp <= 0) && (!thief || !thief.alive || thief.hp <= 0)) {
        beginIdle(father, 1.4);
      }
    }
    return;
  }

  if (father.task === "gatherStone") {
    const stone =
      world.stones.find((s) => s.id === father.targetId && s.amount > 0) ?? null;
    if (!stone || father.taskTimer <= 0) {
      beginIdle(father, 0.9);
      return;
    }
    if (stepTo(state, father, stone.pos, dt)) {
      stone.amount -= 1;
      inv.stone += 1;
      father.workPulse = 0.45;
      sfx("chop");
      spawnParticles(state, stone.pos, 6, "#9a9488", { speed: 70, size: 2.8 });
      spawnText(state, stone.pos, "Аав +1 чулуу", "#c8c0b0");
      if (stone.amount <= 0) stone.respawnIn = 22 + Math.random() * 16;
      beginIdle(father, 1.5);
    }
    return;
  }

  if (father.task === "gatherBerry") {
    const bush =
      world.bushes.find((b) => b.id === father.targetId && b.berries > 0) ??
      null;
    if (!bush || father.taskTimer <= 0) {
      beginIdle(father, 0.9);
      return;
    }
    if (stepTo(state, father, bush.pos, dt)) {
      bush.berries -= 1;
      inv.berries += 1;
      father.workPulse = 0.4;
      sfx("berry");
      spawnParticles(state, bush.pos, 5, "#e04070", { speed: 60, size: 2.5 });
      spawnText(state, bush.pos, "Аав +1 жимс", "#ff9fbf");
      if (bush.berries <= 0) bush.respawnIn = 18 + Math.random() * 12;
      beginIdle(father, 1.4);
    }
    return;
  }

  if (father.task === "gatherWood") {
    const tree =
      world.trees.find((t) => t.id === father.targetId && t.hp > 0) ?? null;
    if (!tree || father.taskTimer <= 0) {
      beginIdle(father, 0.9);
      return;
    }
    if (dist(father.pos, tree.pos) > ARRIVE + 8) {
      stepTo(state, father, tree.pos, dt, PARENT_SPEED * 0.9);
      return;
    }
    clearWalk(father);
    if (father.attackCooldown > 0) return;
    tree.hp -= 1;
    father.workPulse = 0.5;
    father.attackCooldown = 0.55;
    sfx("chop");
    spawnParticles(state, { x: tree.pos.x, y: tree.pos.y - 8 }, 6, "#a0733d", {
      speed: 80,
      size: 3,
    });
    if (tree.hp <= 0) {
      const gained = 1 + Math.floor(Math.random() * 2);
      inv.wood += gained;
      tree.respawnIn = 25 + Math.random() * 15;
      spawnText(state, tree.pos, `Аав +${gained} түлээ`, "#e8c56a");
      beginIdle(father, 2);
    }
    return;
  }

  if (father.task === "wander") {
    if (!father.walkTarget) {
      setWalkTarget(
        father,
        pickWanderSpot(center, PASTURE_RADIUS * 0.42, PASTURE_RADIUS * 0.32, 18),
      );
    }
    if (stepTo(state, father, father.walkTarget!, dt, PARENT_SPEED * 0.72)) {
      beginIdle(father, 1.4 + Math.random());
    } else if (father.taskTimer <= 0) {
      beginIdle(father, 0.8);
    }
  }
}

function updateMother(state: GameState, dt: number): void {
  const mother = state.parents!.mother;
  const world = state.world;
  const center = pastureCenter(world);

  mother.taskTimer = Math.max(0, mother.taskTimer - dt);
  mother.workPulse = Math.max(0, mother.workPulse - dt);

  if (exitGerIfDawn(state, mother)) return;

  if (isEveningOrNight(state) && mother.task !== "goHome") {
    beginGoHome(mother, state);
  }

  if (mother.task === "goHome") {
    updateGoHome(state, mother, dt);
    return;
  }

  if (mother.task === "idle" && mother.taskTimer <= 0) {
    const ready = nearestMilkReady(mother.pos, world.flock.visuals, 280);
    if (ready) {
      mother.task = "collect";
      mother.taskTimer = 14;
      mother.targetId = ready.id;
      setWalkTarget(mother, ready.pos);
    } else {
      mother.task = "wander";
      mother.taskTimer = 3.5 + Math.random() * 2.5;
      mother.targetId = null;
      setWalkTarget(mother, pickWanderSpot(center, 70, 48, 28));
    }
  }

  if (mother.task === "idle") {
    mother.moving = false;
    return;
  }

  if (mother.task === "collect") {
    const animal =
      world.flock.visuals.find(
        (a) =>
          a.id === mother.targetId &&
          a.produceReady &&
          a.kind !== "sheep",
      ) ?? null;
    if (!animal || mother.taskTimer <= 0) {
      beginIdle(mother, 0.9);
      return;
    }
    if (!mother.walkTarget || dist(mother.walkTarget, animal.pos) > 18) {
      setWalkTarget(mother, animal.pos);
    }
    if (stepTo(state, mother, mother.walkTarget!, dt)) {
      mother.workPulse = 0.55;
      collectMilk(state, animal);
      beginIdle(mother, 1.6 + Math.random());
    }
    return;
  }

  if (mother.task === "wander") {
    if (!mother.walkTarget) {
      setWalkTarget(mother, pickWanderSpot(center, 70, 48, 28));
    }
    if (stepTo(state, mother, mother.walkTarget!, dt, PARENT_SPEED * 0.68)) {
      beginIdle(mother, 1.5 + Math.random());
    } else if (mother.taskTimer <= 0) {
      beginIdle(mother, 0.9);
    }
  }
}

export function updateParents(state: GameState, dt: number): void {
  if (!state.parentsReturned || !state.parents) return;
  // Хуучин объект дээр шинэ талбар нөхнө
  for (const p of [state.parents.father, state.parents.mother]) {
    if (typeof p.insideGer !== "boolean") p.insideGer = false;
    if (typeof p.attackCooldown !== "number") p.attackCooldown = 0;
  }
  if (
    state.phase !== "playing" ||
    state.world.gerPacked ||
    state.story.familyReunionEffectRemaining > 0 ||
    (state.story.familyReunionDialogueStarted &&
      !state.story.familyReunionDialogueCompleted)
  ) {
    return;
  }

  updateFather(state, dt);
  updateMother(state, dt);

  const father = state.parents.father;
  const mother = state.parents.mother;
  if (!father.insideGer) {
    const gather =
      father.task === "gatherStone" ||
      father.task === "gatherBerry" ||
      father.task === "gatherWood" ||
      father.task === "fight" ||
      father.task === "goHome";
    clampNearCamp(state, father, gather ? 280 : 90);
  }
  if (!mother.insideGer) {
    clampNearCamp(
      state,
      mother,
      mother.task === "goHome" || mother.task === "collect" ? 160 : 90,
    );
  }
}
