// Голын загас — эрэг дээрээс уургална

import { sfx } from "./audio";
import {
  isAtRiverFord,
  isInRiver,
  riverCenterX,
  riverFlowDir,
  riverHalfWidth,
} from "./biomes";
import { spawnParticles, spawnText } from "./effects";
import type { Fish, GameState, Vector2 } from "./types";
import { WORLD_H } from "./types";
import { clamp, dist, normalize, randRange, setMessage } from "./utils";

const FISH_COUNT = 18;
/** Эргээс уурганы хүрээ */
const CATCH_RANGE = 96;

function sampleRiverPos(y: number): Vector2 {
  const cx = riverCenterX(y);
  const half = Math.max(10, riverHalfWidth(y) - 8);
  return {
    x: cx + randRange(-half, half),
    y,
  };
}

export function createRiverFish(nextId: () => number): Fish[] {
  const fish: Fish[] = [];
  for (let i = 0; i < FISH_COUNT; i++) {
    let y = randRange(40, WORLD_H - 40);
    if (isAtRiverFord(y)) y = y < WORLD_H * 0.5 ? y - 120 : y + 120;
    y = clamp(y, 40, WORLD_H - 40);
    const pos = sampleRiverPos(y);
    const flow = riverFlowDir(pos.y);
    fish.push({
      id: nextId(),
      pos,
      vel: { x: flow.x * randRange(18, 36), y: flow.y * randRange(18, 36) },
      radius: 7,
      face: flow.x >= 0 ? 1 : -1,
      spook: 0,
    });
  }
  return fish;
}

function keepInRiver(pos: Vector2): void {
  const cx = riverCenterX(pos.y);
  const half = Math.max(8, riverHalfWidth(pos.y) - 6);
  const dx = pos.x - cx;
  if (Math.abs(dx) > half) {
    pos.x = cx + Math.sign(dx) * half;
  }
  pos.y = clamp(pos.y, 24, WORLD_H - 24);
}

/** Уурганы үзүүр / дэнсний байрлал — гол руу */
export function fishingBobberPos(playerPos: Vector2): Vector2 {
  const cx = riverCenterX(playerPos.y);
  const half = riverHalfWidth(playerPos.y);
  const side = playerPos.x < cx ? 1 : -1;
  // Эргээс гол руу — дэнс усан дээр
  return {
    x: cx - side * (half * 0.35),
    y: playerPos.y,
  };
}

export function updateFish(state: GameState, dt: number): void {
  const { world, player } = state;
  if (world.fish.length < 8 && Math.random() < dt * 0.15) {
    const y = randRange(40, WORLD_H - 40);
    if (!isAtRiverFord(y)) {
      const pos = sampleRiverPos(y);
      const flow = riverFlowDir(pos.y);
      world.fish.push({
        id: state.nextEntityId++,
        pos,
        vel: { x: flow.x * 24, y: flow.y * 24 },
        radius: 7,
        face: flow.x >= 0 ? 1 : -1,
        spook: 0,
      });
    }
  }

  const anglerOnBank =
    state.phase === "playing" &&
    player.gear.fishingRod &&
    nearFishingSpot(player.pos);
  const bobber = anglerOnBank ? fishingBobberPos(player.pos) : null;
  const playerInWater = isInRiver(player.pos, 0);

  for (const f of world.fish) {
    f.spook = Math.max(0, f.spook - dt);
    const flow = riverFlowDir(f.pos.y);
    const wobble = Math.sin(state.world.elapsed * 3.2 + f.id) * 22;
    const side = normalize({ x: -flow.y, y: flow.x });
    const dPlayer = dist(f.pos, player.pos);

    // Усанд орвол айж зугтана — эргээс уургалахад айхгүй
    if (playerInWater && dPlayer < 70 && state.phase === "playing") {
      const away = normalize({
        x: f.pos.x - player.pos.x,
        y: f.pos.y - player.pos.y,
      });
      f.vel.x = away.x * 70 + flow.x * 20;
      f.vel.y = away.y * 70 + flow.y * 20;
      f.spook = Math.max(f.spook, 0.6);
    } else if (bobber && dist(f.pos, bobber) < 130 && f.spook <= 0) {
      // Дэнс рүү сонирхон ойртоно
      const to = normalize({
        x: bobber.x - f.pos.x,
        y: bobber.y - f.pos.y,
      });
      const pull = 38 + Math.sin(state.world.elapsed * 2 + f.id) * 8;
      f.vel.x = to.x * pull + flow.x * 12 + side.x * wobble * 0.4;
      f.vel.y = to.y * pull + flow.y * 12 + side.y * wobble * 0.2;
    } else {
      const spd = f.spook > 0 ? 70 : 28;
      f.vel.x = flow.x * spd + side.x * wobble;
      f.vel.y = flow.y * spd + side.y * wobble * 0.35;
    }

    f.pos.x += f.vel.x * dt;
    f.pos.y += f.vel.y * dt;
    if (Math.abs(f.vel.x) > 4) f.face = f.vel.x >= 0 ? 1 : -1;
    keepInRiver(f.pos);
  }
}

export function nearestFish(
  pos: Vector2,
  fish: Fish[],
  range: number,
): Fish | null {
  let best: Fish | null = null;
  let bestD = range;
  for (const f of fish) {
    const d = dist(pos, f.pos);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

/**
 * Эрэг дээр — усанд гүйхгүй.
 * Голын ирмэгээс гадагш ~55px дотор.
 */
export function nearFishingSpot(pos: Vector2): boolean {
  if (isInRiver(pos, -6)) return false;
  const cx = riverCenterX(pos.y);
  const half = riverHalfWidth(pos.y);
  const d = Math.abs(pos.x - cx);
  return d <= half + 58;
}

/** Загас дэнсний ойрхон эсэх */
export function fishNearBobber(state: GameState): Fish | null {
  if (!nearFishingSpot(state.player.pos)) return null;
  const bobber = fishingBobberPos(state.player.pos);
  return nearestFish(bobber, state.world.fish, 28);
}

/** Загасны уургаар барих — эрэг дээр E */
export function tryCatchFish(state: GameState): boolean {
  const { player, world } = state;
  if (!player.gear.fishingRod) {
    setMessage(state, "Загасны уурга хэрэгтэй — өвгөнөөс ав.", 2.5);
    return false;
  }
  if (isInRiver(player.pos, -4)) {
    setMessage(state, "Эрэг дээр зогсож уургална — ус руу бүү ор.", 2.5);
    return true;
  }
  if (!nearFishingSpot(player.pos)) {
    setMessage(state, "Голын эрэг дээр зогсож уургална.", 2);
    return false;
  }

  const bobber = fishingBobberPos(player.pos);
  // Эхлээд дэнс орчим, дараа нь ерөнхий хүрээ
  let target = nearestFish(bobber, world.fish, 32);
  if (!target) target = nearestFish(player.pos, world.fish, CATCH_RANGE);

  if (!target) {
    setMessage(state, "Загас ойртоогүй — дэнсээ хүлээ.", 2);
    return true;
  }

  const idx = world.fish.indexOf(target);
  if (idx >= 0) world.fish.splice(idx, 1);
  player.inventory.fish += 1;
  sfx("chop");
  spawnParticles(state, target.pos, 10, "#6ab0e8", {
    speed: 60,
    gravity: -15,
    size: 2.2,
  });
  spawnText(state, player.pos, "+1 загас", "#7ec8ff");
  setMessage(state, "Загас барьлаа! Q дарж идээрэй.", 2.5);
  return true;
}
