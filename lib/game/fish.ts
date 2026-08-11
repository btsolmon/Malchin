// Голын загас — эрэг дээрээс уургална · E mash-аар татна
// Өнгө (цэнхэр/ногоон/алтан) × хүндрэл (амархан/хэцүү/маш хэцүү)

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
import type { Fish, FishColor, FishTier, GameState, Vector2 } from "./types";
import { WORLD_H } from "./types";
import { clamp, dist, normalize, randRange, setMessage } from "./utils";

const FISH_COUNT = 20;
const MIN_FISH = 16;
const ATTRACT_RANGE = 170;
const LOCAL_FISH_RANGE = 220;
/** Загас хоорондын хамгийн бага зай — бөөгнөрөхөөс сэргийлнэ */
const SEPARATION_DIST = 56;
const SEPARATION_STRENGTH = 72;

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

/** Өнгө = төрөл (харагдах байдал) */
export const FISH_COLORS: Record<FishColor, { name: string; hex: string }> = {
  blue: { name: "Цэнхэр загас", hex: "#5aa8d8" },
  green: { name: "Ногоон загас", hex: "#4ecf88" },
  gold: { name: "Алтан загас", hex: "#f0b040" },
};

const TIER_STATS: Record<FishTier, TierStats> = {
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

export function normalizeFishTier(raw: unknown): FishTier {
  return raw === "hard" || raw === "elite" ? raw : "easy";
}

export function normalizeFishColor(raw: unknown): FishColor {
  return raw === "green" || raw === "gold" ? raw : "blue";
}

function normalizeTier(raw: unknown): FishTier {
  return normalizeFishTier(raw);
}

/** Хуучин save — өнгө байхгүй бол tier-ээс таамаглана */
function colorFromLegacyTier(tier: FishTier): FishColor {
  if (tier === "elite") return "gold";
  if (tier === "hard") return "green";
  return "blue";
}

export function fishLabel(color: FishColor, _tier?: FishTier): string {
  return FISH_COLORS[color].name;
}

/** HUD/зурагт — өнгө */
export function fishKindInfo(
  color: FishColor,
  tier: FishTier,
): { name: string; color: string; tier: FishTier } {
  return {
    name: FISH_COLORS[color].name,
    color: FISH_COLORS[color].hex,
    tier,
  };
}

/** ~50% амархан · ~33% хэцүү · ~17% маш хэцүү */
function pickTier(): FishTier {
  const r = Math.random();
  if (r < 0.5) return "easy";
  if (r < 0.83) return "hard";
  return "elite";
}

/** Өнгө тэнцүү ойролцоо */
function pickColor(): FishColor {
  const r = Math.random();
  if (r < 1 / 3) return "blue";
  if (r < 2 / 3) return "green";
  return "gold";
}

function sampleRiverPos(y: number): Vector2 {
  const cx = riverCenterX(y);
  const half = Math.max(10, riverHalfWidth(y) - 8);
  return {
    x: cx + randRange(-half, half),
    y,
  };
}

/** Голын дагуу тархсан байршил — бөөгнөрөхгүй */
function pickSpreadSpawnY(existing: Fish[]): number {
  const yMin = 36;
  const yMax = WORLD_H - 40;
  let bestY = randRange(yMin, yMax);
  let bestScore = -1;
  for (let attempt = 0; attempt < 16; attempt++) {
    let y = randRange(yMin, yMax);
    if (isAtRiverFord(y)) {
      y = clamp(
        y < RIVER_FORD_Y
          ? RIVER_FORD_Y - RIVER_FORD_HALF - 24
          : RIVER_FORD_Y + RIVER_FORD_HALF + 24,
        yMin,
        yMax,
      );
    }
    let nearest = Infinity;
    for (const f of existing) {
      nearest = Math.min(nearest, Math.abs(f.pos.y - y));
    }
    if (nearest > bestScore) {
      bestScore = nearest;
      bestY = y;
    }
  }
  return bestY;
}

function makeFish(
  id: number,
  y: number,
  color = pickColor(),
  tier = pickTier(),
): Fish {
  const pos = sampleRiverPos(y);
  const flow = riverFlowDir(pos.y);
  const stats = fishTierStats(tier);
  const spd = randRange(22, 34);
  return {
    id,
    pos,
    vel: { x: flow.x * spd, y: flow.y * spd },
    radius: stats.radius,
    face: flow.x >= 0 ? 1 : -1,
    spook: 0,
    bite: 0,
    color,
    tier,
    heading: Math.atan2(flow.y, flow.x),
  };
}

export function createRiverFish(nextId: () => number): Fish[] {
  const fish: Fish[] = [];
  const colors: FishColor[] = ["blue", "green", "gold"];
  const tiers: FishTier[] = ["easy", "hard", "elite"];
  const yMin = 40;
  const yMax = WORLD_H - 48;
  const span = Math.max(80, yMax - yMin);
  for (let i = 0; i < FISH_COUNT; i++) {
    const color = colors[i % 3]!;
    const tier = tiers[Math.floor(i / 3) % 3]!;
    // Голын дагуу жигд тараана + бага санамсаргүй хөдөлгөөн
    const slot = (i + 0.5) / FISH_COUNT;
    let y =
      yMin +
      slot * span +
      randRange(-span / (FISH_COUNT * 2.2), span / (FISH_COUNT * 2.2));
    if (isAtRiverFord(y)) {
      y =
        y < RIVER_FORD_Y
          ? RIVER_FORD_Y - RIVER_FORD_HALF - 28
          : RIVER_FORD_Y + RIVER_FORD_HALF + 28;
    }
    y = clamp(y, yMin, yMax);
    fish.push(makeFish(nextId(), y, color, tier));
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

/**
 * Урсгал зөвхөн урагш (өмнөд) тул загас өмнөд зах руу цуглаад тоглогчоос алга болно.
 * Зах руу хүрсэн загасыг голын урсгалын дээд цэгээс дахин оруулна.
 */
function recycleDownstreamFish(f: Fish, others: Fish[]): void {
  if (f.pos.y < WORLD_H - 28) return;
  // Доод захнаас гармагц голын дагуу зайтай цэгээс дахин орно
  const pos = sampleRiverPos(
    pickSpreadSpawnY(others.filter((o) => o.id !== f.id)),
  );
  f.pos.x = pos.x;
  f.pos.y = pos.y;
  const flow = riverFlowDir(f.pos.y);
  const spd = randRange(22, 34);
  f.vel.x = flow.x * spd;
  f.vel.y = flow.y * spd;
  f.face = flow.x >= 0 ? 1 : -1;
  f.heading = Math.atan2(flow.y, flow.x);
  f.spook = 0;
  f.bite = 0;
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

/** Залгагдсан үед дэгээний байрлал — загасны ам */
export function fishMouthPos(fish: Fish): Vector2 {
  const heading =
    typeof fish.heading === "number" && !Number.isNaN(fish.heading)
      ? fish.heading
      : Math.atan2(fish.vel.y, fish.vel.x);
  const tier = normalizeTier(fish.tier);
  const scale = tier === "elite" ? 1.4 : tier === "hard" ? 1.18 : 1;
  const reach = 10.2 * scale;
  return {
    x: fish.pos.x + Math.cos(heading) * reach,
    y: fish.pos.y + Math.sin(heading) * reach,
  };
}

function spawnFishNear(state: GameState, _preferredY?: number): void {
  // Локал spawn хэт олшрохоос сэргийлнэ
  if (state.world.fish.length >= FISH_COUNT + 2) return;
  // Голын дагуу зайтай цэгээс орно
  state.world.fish.push(
    makeFish(state.nextEntityId++, pickSpreadSpawnY(state.world.fish)),
  );
}

function findFishById(worldFish: Fish[], id: number): Fish | null {
  for (const f of worldFish) {
    if (f.id === id) return f;
  }
  return null;
}

function ensureFish(f: Fish): TierStats {
  f.tier = normalizeTier(f.tier);
  if (f.color !== "blue" && f.color !== "green" && f.color !== "gold") {
    f.color = colorFromLegacyTier(f.tier);
  } else {
    f.color = normalizeFishColor(f.color);
  }
  if (typeof f.bite !== "number") f.bite = 0;
  const stats = fishTierStats(f.tier);
  f.radius = stats.radius;
  if (typeof f.heading !== "number" || Number.isNaN(f.heading)) {
    f.heading = Math.atan2(f.vel.y, f.vel.x);
  }
  return stats;
}

/** Өнцгийн зөрүүг -π..π-д авна */
function angleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Ойрхон загаснаас холдох — бөөгнөрөхгүй */
function separationOffset(
  f: Fish,
  others: Fish[],
  ignoreId: number | null,
): Vector2 {
  let ax = 0;
  let ay = 0;
  for (const o of others) {
    if (o.id === f.id || o.id === ignoreId) continue;
    const dx = f.pos.x - o.pos.x;
    const dy = f.pos.y - o.pos.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.5 || d >= SEPARATION_DIST) continue;
    const w = (SEPARATION_DIST - d) / SEPARATION_DIST;
    const force = w * w;
    ax += (dx / d) * force;
    ay += (dy / d) * force;
  }
  return { x: ax * SEPARATION_STRENGTH, y: ay * SEPARATION_STRENGTH };
}

/** Хүссэн хурд руу зөөлөн ойртуулна — хог шиг шууд drift биш */
function steerVel(
  f: Fish,
  desiredX: number,
  desiredY: number,
  dt: number,
  responsiveness: number,
): void {
  const k = 1 - Math.exp(-responsiveness * dt);
  f.vel.x += (desiredX - f.vel.x) * k;
  f.vel.y += (desiredY - f.vel.y) * k;
}

function updateFishHeading(f: Fish, dt: number, turnRate: number): void {
  const spd = Math.hypot(f.vel.x, f.vel.y);
  if (spd < 6) return;
  const target = Math.atan2(f.vel.y, f.vel.x);
  const k = 1 - Math.exp(-turnRate * dt);
  f.heading += angleDelta(f.heading, target) * k;
  if (Math.abs(f.vel.x) > 4) f.face = f.vel.x >= 0 ? 1 : -1;
}

/** Чөлөөт сэлэлт — урсгал дагаж S-хэлбэрээр, заримдаа түргэснэ */
function freeSwimDesired(
  f: Fish,
  flow: Vector2,
  side: Vector2,
  t: number,
  spooked: boolean,
): Vector2 {
  const idp = f.id * 2.173;
  const lane =
    Math.sin(t * 0.32 + idp) * 0.62 +
    Math.sin(t * 0.13 + idp * 1.9) * 0.28 +
    Math.sin(t * 0.7 + idp * 0.4) * 0.12;
  const look = 55 + Math.sin(t * 0.9 + idp) * 18;
  const aheadY = clamp(
    f.pos.y + flow.y * look + flow.x * look * 0.05,
    20,
    WORLD_H - 20,
  );
  const half = Math.max(10, riverHalfWidth(aheadY) - 14);
  const targetX = riverCenterX(aheadY) + lane * half;
  const to = normalize({
    x: targetX - f.pos.x,
    y: aheadY - f.pos.y,
  });

  // Сэлэлтийн ритм — сүүлний цохилт шиг surge
  const kickPhase = t * (spooked ? 5.5 : 3.4) + idp;
  const kick = 0.55 + 0.45 * Math.max(0, Math.sin(kickPhase));
  // Ховор dart
  const dartWave = Math.sin(t * 0.48 + idp * 1.3);
  const dart = !spooked && dartWave > 0.9 ? 1.85 : dartWave > 0.78 ? 1.25 : 1;

  const cruise = spooked ? 58 : 24 + 14 * kick;
  const spd = cruise * dart;

  // Жижиг хажуугийн сэлгэлт — амьд мэдрэмж
  const flutter =
    Math.sin(t * 4.2 + idp) * (spooked ? 18 : 10) +
    Math.sin(t * 7.1 + idp * 0.7) * 4;

  return {
    x: to.x * spd * 0.72 + flow.x * spd * 0.38 + side.x * flutter,
    y: to.y * spd * 0.72 + flow.y * spd * 0.38 + side.y * flutter * 0.45,
  };
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
  const info = fishKindInfo(target.color, target.tier);
  const idx = world.fish.indexOf(target);
  if (idx >= 0) world.fish.splice(idx, 1);
  state.fishingHook = null;
  player.inventory.fish += stats.rewardFish;
  sfx("chop");
  spawnParticles(state, target.pos, 14 + stats.rewardFish * 4, info.color, {
    speed: 70,
    gravity: -18,
    size: 2.4,
  });
  const label =
    stats.rewardFish > 1 ? `+${stats.rewardFish} загас` : "+1 загас";
  spawnText(state, player.pos, label, info.color);
  setMessage(
    state,
    `${fishLabel(target.color, target.tier)} барьлаа! Q дарж идээрэй.`,
    2.5,
  );
}

function biteHint(color: FishColor, tier: FishTier): string {
  return `${fishLabel(color, tier)} хазлаа! E дарж залга!`;
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
    hook.color = normalizeFishColor(
      hook.color ?? findFishById(world.fish, hook.fishId)?.color,
    );
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
    const side = normalize({ x: -flow.y, y: flow.x });
    const dPlayer = dist(f.pos, player.pos);
    const t = state.world.elapsed;
    let steerRate = 3.8;
    let turnRate = 7;

    if (hookedId !== null && f.id === hookedId && bobber && hookedStats) {
      f.bite = 0;
      const thrash = Math.sin(t * 14 + f.id) * 0.9;
      const away = normalize({
        x: f.pos.x - bobber.x + Math.cos(t * 9 + f.id) * 0.25,
        y: f.pos.y - bobber.y + Math.sin(t * 11 + f.id) * 0.25,
      });
      const spd = hookedStats.thrashSpd + Math.abs(thrash) * hookedStats.thrashSide;
      const pullBack = normalize({
        x: bobber.x - f.pos.x,
        y: bobber.y - f.pos.y,
      });
      steerVel(
        f,
        away.x * spd +
          side.x * thrash * (hookedStats.thrashSide + 10) +
          pullBack.x * hookedStats.pullBack,
        away.y * spd +
          side.y * thrash * hookedStats.thrashSide +
          pullBack.y * hookedStats.pullBack,
        dt,
        9,
      );
      turnRate = 14;
    } else if (playerInWater && dPlayer < 70 && state.phase === "playing") {
      f.bite = 0;
      const away = normalize({
        x: f.pos.x - player.pos.x,
        y: f.pos.y - player.pos.y,
      });
      const zig = Math.sin(t * 11 + f.id) * 28;
      steerVel(
        f,
        away.x * 78 + flow.x * 22 + side.x * zig,
        away.y * 78 + flow.y * 22 + side.y * zig * 0.5,
        dt,
        8,
      );
      f.spook = Math.max(f.spook, 0.6);
      turnRate = 12;
    } else if (bobber && !state.fishingHook && f.bite > 0) {
      const to = normalize({
        x: bobber.x - f.pos.x,
        y: bobber.y - f.pos.y,
      });
      const dBob = dist(f.pos, bobber);
      const hold = dBob > 10 ? 55 : 12;
      const nibble = Math.sin(t * 16 + f.id) * 18;
      const orbit = normalize({ x: -to.y, y: to.x });
      steerVel(
        f,
        to.x * hold + orbit.x * nibble,
        to.y * hold + orbit.y * nibble * 0.7,
        dt,
        7,
      );
      turnRate = 10;
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
            setMessage(state, biteHint(f.color, f.tier), 1.6);
          }
        }
        const orbit = normalize({ x: -to.y, y: to.x });
        const circle = Math.sin(t * 3.5 + f.id) * 36;
        steerVel(
          f,
          to.x * 8 + orbit.x * (40 + circle * 0.2) + flow.x * 8,
          to.y * 8 + orbit.y * (40 + circle * 0.2) + flow.y * 8,
          dt,
          5.5,
        );
      } else {
        const pull = 40 + Math.sin(t * 2.2 + f.id) * 12;
        const glide = freeSwimDesired(f, flow, side, t, false);
        steerVel(
          f,
          to.x * pull + glide.x * 0.35,
          to.y * pull + glide.y * 0.35,
          dt,
          4.2,
        );
      }
      turnRate = 9;
    } else {
      const desired = freeSwimDesired(f, flow, side, t, f.spook > 0);
      const sep = separationOffset(f, world.fish, hookedId);
      steerVel(
        f,
        desired.x + sep.x,
        desired.y + sep.y,
        dt,
        f.spook > 0 ? 6.5 : steerRate,
      );
      turnRate = f.spook > 0 ? 11 : 6.5;
    }

    // Дэгээгүй үед ч ойрхон загаснаас бага зэрэг холдуулна
    if (hookedId !== f.id && (f.bite ?? 0) <= 0) {
      const sep = separationOffset(f, world.fish, hookedId);
      f.vel.x += sep.x * 0.35 * dt * 8;
      f.vel.y += sep.y * 0.35 * dt * 8;
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
    updateFishHeading(f, dt, turnRate);
    keepInRiver(f.pos);
    if (hookedId !== f.id) recycleDownstreamFish(f, world.fish);
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
      setMessage(
        state,
        hooked.tier === "elite"
          ? `E МАШ хурдан дар — ${fishLabel(hooked.color, hooked.tier)}!`
          : `E хурдан дар — ${fishLabel(hooked.color, hooked.tier)}!`,
        1.2,
      );
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
    color: target.color,
    tier: target.tier,
  };
  target.spook = 0;
  sfx("select");
  spawnParticles(state, target.pos, 6, "#7ec8ff", {
    speed: 55,
    gravity: -12,
    size: 2,
  });
  setMessage(
    state,
    `${fishLabel(target.color, target.tier)} залгалаа! E-г ${
      target.tier === "elite" ? "МАШ " : ""
    }хурдан дарж тат!`,
    2,
  );
  return true;
}
