// Голын загас — эрэг дээрээс уургална · E mash-аар татна
// Хүндрэл: easy (одоогийн) · hard · elite

import { sfx } from "./audio";
import {
  isAtRiverFord,
  isInRiver,
  riverCenterX,
  riverFlowDir,
  riverHalfWidth,
  RIVER_FORD_HALF,
  RIVER_FORD_Y,
} from "./biomes";
import { spawnParticles, spawnText } from "./effects";
import type { Fish, FishTier, GameState, Vector2 } from "./types";
import { WORLD_H } from "./types";
import { clamp, dist, normalize, randRange, setMessage } from "./utils";

const FISH_COUNT = 18;
const MIN_FISH = 14;
const ATTRACT_RANGE = 170;
const LOCAL_FISH_RANGE = 220;

interface TierStats {
  biteRange: number;
  biteDuration: number;
  biteChance: number;
  hookPull: number;
  hookDecay: number;
  hookTime: number;
  escapeRange: number;
  holdRange: number;
  thrashSpd: number;
  thrashSide: number;
  pullBack: number;
  radius: number;
  rewardFish: number;
}

const TIER_STATS: Record<FishTier, TierStats> = {
  // Одоогийн хялбар түвшин
  easy: {
    biteRange: 30,
    biteDuration: 2.2,
    biteChance: 3.2,
    hookPull: 0.145,
    hookDecay: 0.15,
    hookTime: 3.6,
    escapeRange: 100,
    holdRange: 42,
    thrashSpd: 55,
    thrashSide: 22,
    pullBack: 72,
    radius: 7,
    rewardFish: 1,
  },
  // Хэцүү
  hard: {
    biteRange: 26,
    biteDuration: 1.35,
    biteChance: 2.2,
    hookPull: 0.1,
    hookDecay: 0.24,
    hookTime: 2.7,
    escapeRange: 82,
    holdRange: 48,
    thrashSpd: 78,
    thrashSide: 34,
    pullBack: 58,
    radius: 8.5,
    rewardFish: 2,
  },
  // Бүр ч хэцүү
  elite: {
    biteRange: 22,
    biteDuration: 0.95,
    biteChance: 1.5,
    hookPull: 0.072,
    hookDecay: 0.34,
    hookTime: 2.15,
    escapeRange: 68,
    holdRange: 54,
    thrashSpd: 98,
    thrashSide: 44,
    pullBack: 48,
    radius: 10.5,
    rewardFish: 3,
  },
};

export function fishTierStats(tier: FishTier): TierStats {
  return TIER_STATS[tier] ?? TIER_STATS.easy;
}

function normalizeTier(raw: unknown): FishTier {
  return raw === "hard" || raw === "elite" ? raw : "easy";
}

/** ~58% easy · ~30% hard · ~12% elite */
function pickTier(): FishTier {
  const r = Math.random();
  if (r < 0.58) return "easy";
  if (r < 0.88) return "hard";
  return "elite";
}

function sampleRiverPos(y: number): Vector2 {
  const cx = riverCenterX(y);
  const half = Math.max(10, riverHalfWidth(y) - 8);
  return {
    x: cx + randRange(-half, half),
    y,
  };
}

function pickRiverY(preferred?: number): number {
  let y =
    preferred !== undefined
      ? preferred + randRange(-50, 50)
      : randRange(40, WORLD_H - 40);
  for (let i = 0; i < 6; i++) {
    y = clamp(y, 40, WORLD_H - 40);
    if (!isAtRiverFord(y)) return y;
    if (preferred !== undefined) {
      y =
        preferred < RIVER_FORD_Y
          ? RIVER_FORD_Y - RIVER_FORD_HALF - randRange(20, 80)
          : RIVER_FORD_Y + RIVER_FORD_HALF + randRange(20, 80);
    } else {
      y = randRange(40, WORLD_H - 40);
    }
  }
  return clamp(
    y < RIVER_FORD_Y
      ? RIVER_FORD_Y - RIVER_FORD_HALF - 40
      : RIVER_FORD_Y + RIVER_FORD_HALF + 40,
    40,
    WORLD_H - 40,
  );
}

function makeFish(id: number, y: number): Fish {
  const pos = sampleRiverPos(y);
  const flow = riverFlowDir(pos.y);
  const tier = pickTier();
  const stats = fishTierStats(tier);
  return {
    id,
    pos,
    vel: { x: flow.x * randRange(18, 36), y: flow.y * randRange(18, 36) },
    radius: stats.radius,
    face: flow.x >= 0 ? 1 : -1,
    spook: 0,
    bite: 0,
    tier,
  };
}

export function createRiverFish(nextId: () => number): Fish[] {
  const fish: Fish[] = [];
  for (let i = 0; i < FISH_COUNT; i++) {
    fish.push(makeFish(nextId(), pickRiverY()));
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

export function fishingBobberPos(playerPos: Vector2): Vector2 {
  const cx = riverCenterX(playerPos.y);
  const half = riverHalfWidth(playerPos.y);
  const side = playerPos.x < cx ? 1 : -1;
  return {
    x: cx - side * (half * 0.35),
    y: playerPos.y,
  };
}

function spawnFishNear(state: GameState, preferredY?: number): void {
  state.world.fish.push(makeFish(state.nextEntityId++, pickRiverY(preferredY)));
}

function findFishById(worldFish: Fish[], id: number): Fish | null {
  for (const f of worldFish) {
    if (f.id === id) return f;
  }
  return null;
}

function ensureFish(f: Fish): TierStats {
  f.tier = normalizeTier(f.tier);
  if (typeof f.bite !== "number") f.bite = 0;
  const stats = fishTierStats(f.tier);
  f.radius = stats.radius;
  return stats;
}

function failHook(state: GameState, fish: Fish | null, reason: string): void {
  state.fishingHook = null;
  if (fish) {
    fish.spook = Math.max(fish.spook, 2.4);
    const bobber = fishingBobberPos(state.player.pos);
    const away = normalize({
      x: fish.pos.x - bobber.x,
      y: fish.pos.y - bobber.y,
    });
    fish.vel.x = away.x * 130;
    fish.vel.y = away.y * 130;
    spawnParticles(state, fish.pos, 8, "#8ec8e8", {
      speed: 70,
      gravity: -10,
      size: 2,
    });
  }
  sfx("alert");
  setMessage(state, reason, 2.2);
}

function completeCatch(state: GameState, target: Fish): void {
  const { player, world } = state;
  const stats = ensureFish(target);
  const idx = world.fish.indexOf(target);
  if (idx >= 0) world.fish.splice(idx, 1);
  state.fishingHook = null;
  player.inventory.fish += stats.rewardFish;
  sfx("chop");
  const color =
    target.tier === "elite"
      ? "#ffb060"
      : target.tier === "hard"
        ? "#90e0a8"
        : "#6ab0e8";
  spawnParticles(state, target.pos, 14 + stats.rewardFish * 4, color, {
    speed: 70,
    gravity: -18,
    size: 2.4,
  });
  const label =
    stats.rewardFish > 1 ? `+${stats.rewardFish} загас` : "+1 загас";
  spawnText(state, player.pos, label, color);
  const msg =
    target.tier === "elite"
      ? "Ховор том загас барьлаа! Q дарж идээрэй."
      : target.tier === "hard"
        ? "Том загас барьлаа! Q дарж идээрэй."
        : "Загас барьлаа! Q дарж идээрэй.";
  setMessage(state, msg, 2.5);
}

function biteHint(tier: FishTier): string {
  if (tier === "elite") return "ХОВОР том загас хазлаа! E дарж залга!";
  if (tier === "hard") return "Том загас хазлаа! E дарж залга!";
  return "Загас дэгээг хазлаа! E дарж залга!";
}

export function updateFish(state: GameState, dt: number): void {
  const { world, player } = state;

  const anglerOnBank =
    state.phase === "playing" &&
    player.gear.fishingRod &&
    nearFishingSpot(player.pos);
  const bobber = anglerOnBank ? fishingBobberPos(player.pos) : null;

  if (world.fish.length < MIN_FISH && Math.random() < dt * 1.1) {
    const preferLocal =
      bobber && !nearestFish(bobber, world.fish, LOCAL_FISH_RANGE)
        ? player.pos.y
        : undefined;
    spawnFishNear(state, preferLocal);
  }

  if (
    bobber &&
    !state.fishingHook &&
    !nearestFish(bobber, world.fish, LOCAL_FISH_RANGE) &&
    Math.random() < dt * 1.4
  ) {
    spawnFishNear(state, player.pos.y);
  }

  if (state.fishingHook) {
    const hook = state.fishingHook;
    hook.tier = normalizeTier(hook.tier);
    const stats = fishTierStats(hook.tier);
    const hooked = findFishById(world.fish, hook.fishId);
    if (!hooked || !bobber || !anglerOnBank) {
      failHook(state, hooked, "Загас зугтлаа!");
    } else {
      hook.timeLeft -= dt;
      hook.progress = Math.max(0, hook.progress - stats.hookDecay * dt);
      const dBob = dist(hooked.pos, bobber);
      if (
        hook.timeLeft <= 0 ||
        hook.progress <= 0 ||
        dBob > stats.escapeRange
      ) {
        failHook(
          state,
          hooked,
          dBob > stats.escapeRange
            ? "Загас шугам таслаад зугтлаа!"
            : "Загас зугтлаа! E-г хурдан дар.",
        );
      }
    }
  }

  const playerInWater = isInRiver(player.pos, 0);
  const hookedId = state.fishingHook?.fishId ?? null;
  const hookedStats = state.fishingHook
    ? fishTierStats(normalizeTier(state.fishingHook.tier))
    : null;

  for (const f of world.fish) {
    const stats = ensureFish(f);
    f.spook = Math.max(0, f.spook - dt);
    const wasBiting = f.bite > 0;
    f.bite = Math.max(0, f.bite - dt);
    if (wasBiting && f.bite <= 0 && hookedId !== f.id) {
      f.spook = 0;
    }
    const flow = riverFlowDir(f.pos.y);
    const wobble = Math.sin(state.world.elapsed * 3.2 + f.id) * 22;
    const side = normalize({ x: -flow.y, y: flow.x });
    const dPlayer = dist(f.pos, player.pos);

    if (hookedId !== null && f.id === hookedId && bobber && hookedStats) {
      f.bite = 0;
      const t = state.world.elapsed;
      const thrash = Math.sin(t * 14 + f.id) * 0.9;
      const away = normalize({
        x: f.pos.x - bobber.x + Math.cos(t * 9 + f.id) * 0.25,
        y: f.pos.y - bobber.y + Math.sin(t * 11 + f.id) * 0.25,
      });
      const spd = hookedStats.thrashSpd + Math.abs(thrash) * hookedStats.thrashSide;
      f.vel.x = away.x * spd + side.x * thrash * (hookedStats.thrashSide + 10);
      f.vel.y = away.y * spd + side.y * thrash * hookedStats.thrashSide;
      const pullBack = normalize({
        x: bobber.x - f.pos.x,
        y: bobber.y - f.pos.y,
      });
      f.vel.x += pullBack.x * hookedStats.pullBack;
      f.vel.y += pullBack.y * hookedStats.pullBack;
    } else if (playerInWater && dPlayer < 70 && state.phase === "playing") {
      f.bite = 0;
      const away = normalize({
        x: f.pos.x - player.pos.x,
        y: f.pos.y - player.pos.y,
      });
      f.vel.x = away.x * 70 + flow.x * 20;
      f.vel.y = away.y * 70 + flow.y * 20;
      f.spook = Math.max(f.spook, 0.6);
    } else if (bobber && !state.fishingHook && f.bite > 0) {
      const to = normalize({
        x: bobber.x - f.pos.x,
        y: bobber.y - f.pos.y,
      });
      const dBob = dist(f.pos, bobber);
      const hold = dBob > 10 ? 55 : 12;
      const nibble = Math.sin(state.world.elapsed * 16 + f.id) * 18;
      const orbit = normalize({ x: -to.y, y: to.x });
      f.vel.x = to.x * hold + orbit.x * nibble;
      f.vel.y = to.y * hold + orbit.y * nibble * 0.7;
    } else if (
      bobber &&
      !state.fishingHook &&
      dist(f.pos, bobber) < ATTRACT_RANGE &&
      f.spook <= 0
    ) {
      const dBob = dist(f.pos, bobber);
      const to = normalize({
        x: bobber.x - f.pos.x,
        y: bobber.y - f.pos.y,
      });
      if (dBob < stats.biteRange) {
        const alreadyBiting = world.fish.some(
          (o) => o.id !== f.id && (o.bite ?? 0) > 0,
        );
        if (f.bite <= 0 && !alreadyBiting && Math.random() < dt * stats.biteChance) {
          f.bite = stats.biteDuration;
          sfx("alert");
          spawnParticles(state, bobber, 5, "#c8ecff", {
            speed: 35,
            gravity: -25,
            size: 1.8,
          });
          if (anglerOnBank) {
            setMessage(state, biteHint(f.tier), 1.6);
          }
        }
        const orbit = normalize({ x: -to.y, y: to.x });
        f.vel.x = to.x * 6 + orbit.x * 42 + flow.x * 10;
        f.vel.y = to.y * 6 + orbit.y * 42 + flow.y * 10;
      } else {
        const pull = 44 + Math.sin(state.world.elapsed * 2 + f.id) * 10;
        f.vel.x = to.x * pull + flow.x * 10 + side.x * wobble * 0.35;
        f.vel.y = to.y * pull + flow.y * 10 + side.y * wobble * 0.2;
      }
    } else {
      const spd = f.spook > 0 ? 48 : 30;
      f.vel.x = flow.x * spd + side.x * wobble;
      f.vel.y = flow.y * spd + side.y * wobble * 0.35;
    }

    f.pos.x += f.vel.x * dt;
    f.pos.y += f.vel.y * dt;
    if (hookedId !== null && f.id === hookedId && bobber && hookedStats) {
      const dHook = dist(f.pos, bobber);
      if (dHook > hookedStats.holdRange) {
        const back = normalize({
          x: bobber.x - f.pos.x,
          y: bobber.y - f.pos.y,
        });
        const pull = dHook - hookedStats.holdRange;
        f.pos.x += back.x * pull;
        f.pos.y += back.y * pull;
      }
    }
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

export function nearFishingSpot(pos: Vector2): boolean {
  if (isInRiver(pos, -6)) return false;
  const cx = riverCenterX(pos.y);
  const half = riverHalfWidth(pos.y);
  const d = Math.abs(pos.x - cx);
  return d <= half + 58;
}

/** Загас дэгээг амандаа хийсэн эсэх — зөвхөн тэгээд E-ээр залгана */
export function fishNearBobber(state: GameState): Fish | null {
  if (!nearFishingSpot(state.player.pos)) return null;
  let best: Fish | null = null;
  let bestD = 40;
  const bobber = fishingBobberPos(state.player.pos);
  for (const f of state.world.fish) {
    if ((f.bite ?? 0) <= 0) continue;
    const d = dist(f.pos, bobber);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

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

  if (state.fishingHook) {
    const hooked = findFishById(world.fish, state.fishingHook.fishId);
    if (!hooked) {
      state.fishingHook = null;
      return true;
    }
    const stats = fishTierStats(normalizeTier(state.fishingHook.tier));
    state.fishingHook.progress = Math.min(
      1,
      state.fishingHook.progress + stats.hookPull + randRange(0, 0.03),
    );
    state.fishingHook.timeLeft = Math.min(
      state.fishingHook.timeMax || stats.hookTime,
      state.fishingHook.timeLeft + (stats.hookPull > 0.12 ? 0.14 : 0.08),
    );
    const to = normalize({
      x: bobber.x - hooked.pos.x,
      y: bobber.y - hooked.pos.y,
    });
    hooked.pos.x += to.x * 3.5;
    hooked.pos.y += to.y * 3.5;
    spawnParticles(state, hooked.pos, 2, "#a8d8f0", {
      speed: 40,
      gravity: -20,
      size: 1.6,
    });
    if (state.fishingHook.progress >= 1) {
      completeCatch(state, hooked);
    } else {
      const tip =
        hooked.tier === "elite"
          ? "E МАШ хурдан дар — ховор загас зугтана!"
          : hooked.tier === "hard"
            ? "E хурдан дар — том загас хүчтэй!"
            : "E хурдан дар — загас зугтаж байна!";
      setMessage(state, tip, 1.2);
    }
    return true;
  }

  const target = fishNearBobber(state);
  if (!target) {
    setMessage(state, "Загас дэгээг хазтал хүлээ — дараа нь E дар.", 2);
    return true;
  }

  const stats = ensureFish(target);
  target.bite = 0;
  state.fishingHook = {
    fishId: target.id,
    progress: stats.hookPull * 0.85,
    timeLeft: stats.hookTime,
    timeMax: stats.hookTime,
    tier: target.tier,
  };
  target.spook = 0;
  sfx("select");
  spawnParticles(state, target.pos, 6, "#7ec8ff", {
    speed: 55,
    gravity: -12,
    size: 2,
  });
  const startMsg =
    target.tier === "elite"
      ? "Ховор загас залгалаа! E-г МАШ хурдан дар!"
      : target.tier === "hard"
        ? "Том загас залгалаа! E-г хурдан дарж тат!"
        : "Залгалаа! E-г хурдан дарж тат!";
  setMessage(state, startMsg, 2);
  return true;
}
