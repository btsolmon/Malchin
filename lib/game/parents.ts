// Аав ээж — буцаж ирсний дараа мал маллах / бүтээгдэхүүн хийх

import { sfx } from "./audio";
import { spawnParticles, spawnText } from "./effects";
import { collectProduct, nearestReadyAnimal } from "./livestock";
import {
  MAX_FEEDER_HAY,
  PASTURE_RADIUS,
  type GameState,
  type ParentNpc,
  type Vector2,
} from "./types";
import { clamp, dist, normalize, pastureCenter, setMessage } from "./utils";

const PARENT_SPEED = 62;
const ARRIVE = 14;
const FACE_FLIP_DX = 6;

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
  };
}

export function ensureParents(state: GameState): void {
  if (state.parents) return;
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

/** Зөөлөн алхалт — overshoot/гацаагүй */
function stepTo(
  p: ParentNpc,
  target: Vector2,
  dt: number,
  speed = PARENT_SPEED,
): boolean {
  const dx = target.x - p.pos.x;
  const dy = target.y - p.pos.y;
  const d = Math.hypot(dx, dy);

  if (d <= ARRIVE) {
    p.pos.x = target.x;
    p.pos.y = target.y;
    clearWalk(p);
    return true;
  }

  // Ойртох үед удаашруулна — чичиргээ/гацаа болиулна
  const slow = d < 36 ? clamp(d / 36, 0.35, 1) : 1;
  const step = Math.min(d, speed * slow * dt);
  const dir = normalize({ x: dx, y: dy });
  p.pos.x += dir.x * step;
  p.pos.y += dir.y * step;
  p.moving = true;
  p.walkPhase += dt * (9.5 * slow);
  updateFace(p, dx);
  return false;
}

function clampNearCamp(state: GameState, p: ParentNpc): void {
  const c = pastureCenter(state.world);
  const maxR = PASTURE_RADIUS + 90;
  const d = dist(p.pos, c);
  if (d > maxR) {
    const dir = normalize({ x: c.x - p.pos.x, y: c.y - p.pos.y });
    p.pos.x = c.x - dir.x * maxR;
    p.pos.y = c.y - dir.y * maxR;
  }
  p.pos.x = clamp(p.pos.x, 40, state.world.width - 40);
  p.pos.y = clamp(p.pos.y, 40, state.world.height - 40);
}

function strayAnimal(state: GameState): { id: number; pos: Vector2 } | null {
  const home = pastureCenter(state.world);
  const limit = state.world.flockOut
    ? PASTURE_RADIUS * 0.85
    : PASTURE_RADIUS * 0.55;
  let best: { id: number; pos: Vector2 } | null = null;
  let bestD = 0;
  for (const a of state.world.flock.visuals) {
    const d = dist(a.pos, home);
    if (d > limit && d > bestD) {
      bestD = d;
      best = { id: a.id, pos: a.pos };
    }
  }
  return best;
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
  clearWalk(p);
}

function updateFather(state: GameState, dt: number): void {
  const father = state.parents!.father;
  const world = state.world;
  const feeder = world.feeder;
  const center = pastureCenter(world);

  father.taskTimer = Math.max(0, father.taskTimer - dt);
  father.workPulse = Math.max(0, father.workPulse - dt);

  // Зөвхөн idle дуусахад шинэ ажил сонгоно
  if (father.task === "idle" && father.taskTimer <= 0) {
    const needFeed = feeder.hay < feeder.maxHay * 0.55;
    const canFill =
      needFeed &&
      (world.pastureGrass > 8 || state.player.inventory.hay > 0);
    const stray = strayAnimal(state);

    if (canFill && Math.random() < 0.55) {
      father.task = "fillFeeder";
      father.taskTimer = 12;
      father.targetId = null;
      setWalkTarget(father, feeder.pos);
    } else if (stray && (world.flockOut || Math.random() < 0.7)) {
      father.task = "herd";
      father.taskTimer = 9;
      father.targetId = stray.id;
      father.walkTarget = null;
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

  if (father.task === "fillFeeder") {
    const target = father.walkTarget ?? feeder.pos;
    if (stepTo(father, target, dt)) {
      father.workPulse = 0.45;
      const space = feeder.maxHay - feeder.hay;
      if (space > 0) {
        let add = 0;
        if (world.pastureGrass > 4) {
          add = Math.min(3, space, Math.floor(world.pastureGrass / 4));
          world.pastureGrass = Math.max(0, world.pastureGrass - add * 3);
        } else if (state.player.inventory.hay > 0) {
          add = Math.min(4, state.player.inventory.hay, space);
          state.player.inventory.hay -= add;
        }
        if (add > 0) {
          feeder.hay = Math.min(MAX_FEEDER_HAY, feeder.hay + add);
          spawnText(state, father.pos, `Аав +${add} өвс`, "#b8d060");
          spawnParticles(state, feeder.pos, 5, "#a8c050", {
            speed: 40,
            size: 1.8,
          });
          sfx("chop");
        }
      }
      beginIdle(father, 2.2 + Math.random());
    } else if (father.taskTimer <= 0) {
      beginIdle(father, 1);
    }
    return;
  }

  if (father.task === "herd") {
    const animal =
      world.flock.visuals.find((a) => a.id === father.targetId) ?? null;
    if (!animal || father.taskTimer <= 0) {
      beginIdle(father, 1.2);
      return;
    }
    const toHome = normalize({
      x: center.x - animal.pos.x,
      y: center.y - animal.pos.y,
    });
    // Ардын цэгийг зөөлөн шинэчилнэ — frame бүр үсрэхгүй
    const behind = {
      x: animal.pos.x - toHome.x * 30,
      y: animal.pos.y - toHome.y * 30,
    };
    if (!father.walkTarget || dist(father.walkTarget, behind) > 22) {
      setWalkTarget(father, behind);
    }
    stepTo(father, father.walkTarget!, dt, PARENT_SPEED * 1.05);
    if (dist(father.pos, animal.pos) < 48) {
      animal.pos.x += toHome.x * 48 * dt;
      animal.pos.y += toHome.y * 48 * dt;
      animal.vel.x = toHome.x * 36;
      animal.vel.y = toHome.y * 36;
      father.workPulse = 0.25;
      if (dist(animal.pos, center) < PASTURE_RADIUS * 0.7) {
        beginIdle(father, 1.8);
      }
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
    const spot = father.walkTarget!;
    if (stepTo(father, spot, dt, PARENT_SPEED * 0.72)) {
      beginIdle(father, 1.4 + Math.random());
    } else if (father.taskTimer <= 0) {
      beginIdle(father, 0.8);
    }
  }
}

function updateMother(state: GameState, dt: number): void {
  const mother = state.parents!.mother;
  const world = state.world;
  const inv = state.player.inventory;
  const center = pastureCenter(world);

  mother.taskTimer = Math.max(0, mother.taskTimer - dt);
  mother.workPulse = Math.max(0, mother.workPulse - dt);

  if (mother.task === "idle" && mother.taskTimer <= 0) {
    const ready = nearestReadyAnimal(mother.pos, world.flock.visuals, 220);
    const canCraft = inv.milk >= 2 || inv.wool >= 3 || inv.cashmere >= 2;

    if (ready) {
      mother.task = "collect";
      mother.taskTimer = 12;
      mother.targetId = ready.id;
      setWalkTarget(mother, ready.pos);
    } else if (canCraft && Math.random() < 0.65) {
      mother.task = "craft";
      mother.taskTimer = 8;
      mother.targetId = null;
      setWalkTarget(mother, { x: center.x + 55, y: center.y + 20 });
    } else {
      mother.task = "wander";
      mother.taskTimer = 3.5 + Math.random() * 2.5;
      mother.targetId = null;
      setWalkTarget(mother, pickWanderSpot(center, 48, 34, 38));
    }
  }

  if (mother.task === "idle") {
    mother.moving = false;
    return;
  }

  if (mother.task === "collect") {
    const animal =
      world.flock.visuals.find(
        (a) => a.id === mother.targetId && a.produceReady,
      ) ?? null;
    if (!animal || mother.taskTimer <= 0) {
      beginIdle(mother, 0.9);
      return;
    }
    // Мал хөдөлвөл зорилтыг ховорхон шинэчилнэ
    if (!mother.walkTarget || dist(mother.walkTarget, animal.pos) > 18) {
      setWalkTarget(mother, animal.pos);
    }
    const spot = mother.walkTarget!;
    if (stepTo(mother, spot, dt)) {
      mother.workPulse = 0.55;
      collectProduct(state, animal);
      spawnText(state, mother.pos, "Ээж саав", "#ffe9a0");
      beginIdle(mother, 1.6 + Math.random());
    }
    return;
  }

  if (mother.task === "craft") {
    const craftSpot = mother.walkTarget ?? {
      x: center.x + 55,
      y: center.y + 20,
    };
    if (stepTo(mother, craftSpot, dt, PARENT_SPEED * 0.85)) {
      mother.workPulse = 0.6;
      if (inv.milk >= 2) {
        inv.milk -= 2;
        inv.aaruul += 1;
        spawnText(state, mother.pos, "+1 ааруул", "#f0d090");
        setMessage(state, "Ээж ааруул хийлээ.", 2);
        sfx("berry");
      } else if (inv.wool >= 3) {
        inv.wool -= 3;
        inv.felt += 1;
        spawnText(state, mother.pos, "+1 эсгий", "#e8d8b0");
        setMessage(state, "Ээж ноосоор эсгий хийлээ.", 2);
        sfx("berry");
      } else if (inv.cashmere >= 2) {
        inv.cashmere -= 2;
        inv.felt += 2;
        spawnText(state, mother.pos, "+2 эсгий", "#e8d8b0");
        setMessage(state, "Ээж ноолуураар эсгий хийлээ.", 2);
        sfx("berry");
      }
      beginIdle(mother, 2.8);
    } else if (mother.taskTimer <= 0) {
      beginIdle(mother, 1);
    }
    return;
  }

  if (mother.task === "wander") {
    if (!mother.walkTarget) {
      setWalkTarget(mother, pickWanderSpot(center, 48, 34, 38));
    }
    const spot = mother.walkTarget!;
    if (stepTo(mother, spot, dt, PARENT_SPEED * 0.68)) {
      beginIdle(mother, 1.5 + Math.random());
    } else if (mother.taskTimer <= 0) {
      beginIdle(mother, 0.9);
    }
  }
}

export function updateParents(state: GameState, dt: number): void {
  if (!state.parentsReturned || !state.parents) return;
  if (state.phase !== "playing" || state.world.gerPacked) return;

  updateFather(state, dt);
  updateMother(state, dt);
  clampNearCamp(state, state.parents.father);
  clampNearCamp(state, state.parents.mother);
}
