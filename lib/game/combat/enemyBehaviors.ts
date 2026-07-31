// Хүн 3 — дайсны AI: чоно, хулгайч, спавн/scaling, мал сүрэг

import {
  LIVESTOCK_MN,
  PASTURE_RADIUS,
  WORLD_H,
  WORLD_W,
  type GameState,
  type Sheep,
  type Vector2,
  type Wolf,
} from "../types";


type WolfLeapPhase =
  | "chasing"
  | "windup"
  | "leaping"
  | "grabbing"
  | "recovery"
  | "stunned";

type WolfAttackKind = "leap" | "claw" | "bearGrab" | "bearSwipe";

type WolfWithLeap = Wolf & {
  attackPhase: WolfLeapPhase;
  attackKind: WolfAttackKind;
  attackTimer: number;
  attackDirection: Vector2;
  attackHitDone: boolean;
};

function getWolfWithLeap(wolf: Wolf): WolfWithLeap {
  return wolf as WolfWithLeap;
}
import {
  allocId,
  clamp,
  dist,
  fenceBlocksMovement,
  isNight,
  normalize,
  pastureCenter,
  randRange,
  setMessage,
  sheepFenceMitigation,
} from "../utils";
import {
  spawnImpactBurst,
  spawnParticles,
  spawnText,
  triggerHitStop,
} from "../effects";
import { sfx } from "../audio";
import {
  killHerdVisual,
  loseLivestock,
  syncVisualFlock as syncLivestockVisuals,
} from "../livestock";

export function createVisualSheep(id: number, around: Vector2): Sheep {
  const ang = Math.random() * Math.PI * 2;
  const r = randRange(20, PASTURE_RADIUS * 0.7);
  return {
    id,
    kind: "sheep",
    pos: {
      x: around.x + Math.cos(ang) * r,
      y: around.y + Math.sin(ang) * r,
    },
    vel: { x: 0, y: 0 },
    radius: 10,
    grazeSeed: Math.random() * 10,
    hp: 3,
    flash: 0,
    face: 1,
    produceIn: 48,
    produceReady: false,
    newborn: false,
    newbornWarmth: 100,
  };
}

export function syncVisualFlock(state: GameState): void {
  syncLivestockVisuals(state);
}

export function loseSheep(state: GameState, n: number): number {
  return loseLivestock(state, n);
}

/** Тодорхой нэг хонь чонод идэгдэх */
export function killSheepVisual(state: GameState, sheep: Sheep): void {
  killHerdVisual(state, sheep);
}

export function nearestSheep(from: Vector2, visuals: Sheep[]): Sheep | null {
  let best: Sheep | null = null;
  let bestD = Infinity;
  for (const s of visuals) {
    const d = dist(from, s.pos);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function livestockFenceDamageMultiplier(
  state: GameState,
  enemy: Wolf,
  prey: Sheep,
): number {
  let touchingTier = 0;
  const enemyRadius = enemy.radius * enemy.scale;
  for (const fence of state.world.fences) {
    if (!fenceBlocksMovement(fence)) continue;
    if (dist(enemy.pos, fence.pos) > enemyRadius + fence.radius + 4) continue;
    touchingTier = Math.max(touchingTier, fence.tier);
  }
  const contactBlock =
    touchingTier >= 3 ? 0.08 : touchingTier >= 2 ? 0.55 : 1;
  return (
    sheepFenceMitigation(prey.pos, state.world.fences) *
    contactBlock
  );
}

// ---------------------------------------------------------------------------
// World bootstrap
// ---------------------------------------------------------------------------


export function spawnWolf(
  state: GameState,
  kind: "wolf" | "bear" = "wolf",
): void {
  const edge = Math.floor(Math.random() * 4);
  let pos: Vector2;
  if (edge === 0) pos = { x: randRange(40, WORLD_W - 40), y: 40 };
  else if (edge === 1) pos = { x: randRange(40, WORLD_W - 40), y: WORLD_H - 40 };
  else if (edge === 2) pos = { x: 40, y: randRange(40, WORLD_H - 40) };
  else pos = { x: WORLD_W - 40, y: randRange(40, WORLD_H - 40) };

  const night = isNight(state.world);
  const lvl = state.level - 1;
  const bear = kind === "bear";
  // Баавгай: чононоос 2 дахин их амь, 2 дахин их хүчтэй, том биетэй, удаан
  const baseHp = Math.round((night ? 45 : 30) * (1 + 0.12 * lvl));
  const hp = bear ? baseHp * 2 : baseHp;
  const maxPosture = bear ? 140 : 60;
  const wolf: WolfWithLeap = {
    id: allocId(state),
    kind,
    pos,
    vel: { x: 0, y: 0 },
    hp,
    maxHp: hp,
    posture: maxPosture,
    maxPosture,
    postureRegenDelay: 0,
    postureRecoveryDelay: 0,
    radius: bear ? 17 : 14,
    speed: bear
      ? 80 + Math.min(20, lvl * 2)
      : (night ? 115 : 95) + Math.min(30, lvl * 3),
    attackCooldown: 0,
    damage: (12 + lvl * 2) * (bear ? 2 : 1),
    scale: bear
      ? Math.min(2.2, 1.45 + lvl * 0.07)
      : Math.min(1.8, 1 + lvl * 0.09),

    // Shared enemy combat state: wolf leap/claw and bear grab/swipe.
    attackPhase: "chasing",
    attackKind: "leap",
    attackTimer: 0,
    attackDirection: { x: 0, y: 1 },
    attackHitDone: false,
    combatPhase: "idle",
    combatTimer: 0,
    knockbackResistance: bear ? 0.45 : 0.15,

    flash: 0,
    face: 1,
    alive: true,
  };
  state.world.wolves.push(wolf);
  sfx("howl");
  setMessage(
    state,
    bear
      ? "Баавгай мал руу дайрлаа — маш аюултай!"
      : night
        ? "Шөнийн чоно мал руу дайрлаа!"
        : "Чоно ойртлоо — хамгаал!",
    3,
  );
}

export function spawnThief(state: GameState): void {
  if (state.world.flock.total <= 0) return;

  const center = pastureCenter(state.world);
  const ang = Math.random() * Math.PI * 2;
  const pos: Vector2 = {
    x: center.x + Math.cos(ang) * (PASTURE_RADIUS + 40),
    y: center.y + Math.sin(ang) * (PASTURE_RADIUS + 40),
  };

  const escapeAng = Math.atan2(pos.y - center.y, pos.x - center.x);
  const escapeTarget: Vector2 = {
    x: clamp(center.x + Math.cos(escapeAng) * 1400, 20, WORLD_W - 20),
    y: clamp(center.y + Math.sin(escapeAng) * 1400, 20, WORLD_H - 20),
  };

  const stealWant = clamp(2 + Math.floor(Math.random() * 4), 1, 8);
  const stolen = loseSheep(state, stealWant);
  if (stolen <= 0) return;

  const lvl = state.level - 1;
  const thiefHp = 40 + lvl * 8;
  state.world.thieves.push({
    id: allocId(state),
    pos,
    vel: { x: 0, y: 0 },
    hp: thiefHp,
    maxHp: thiefHp,
    radius: 13,
    speed: 88 + Math.min(20, lvl * 2),
    stolen,
    escapeTarget,
    damage: 8 + lvl * 2,
    attackCooldown: 0,
    flash: 0,
    face: 1,
    alive: true,
    posture: 0,
    maxPosture: 100,
    postureRecoveryDelay: 0,
    combatPhase: "idle",
    combatTimer: 0,
    attackDirection: { x: 0, y: 1 },
    attackHitDone: false,
    knockbackResistance: 0.2,
  });
  sfx("alert");

  spawnText(state, pos, `−${stolen} хонь!`, "#ff8080");
  setMessage(state, `Хулгайч ${stolen} хонь авч зугтав! Гүйцэж ав!`, 4);
}

// ---------------------------------------------------------------------------
// Update systems
// ---------------------------------------------------------------------------


export function updateFlock(state: GameState, dt: number): void {
  const center = pastureCenter(state.world);
  const { player, world } = state;

  for (const sheep of world.flock.visuals) {
    const toCenter = normalize({
      x: center.x - sheep.pos.x,
      y: center.y - sheep.pos.y,
    });
    const toPlayer = normalize({
      x: player.pos.x - sheep.pos.x,
      y: player.pos.y - sheep.pos.y,
    });
    const wander = {
      x: Math.sin(world.elapsed * 0.7 + sheep.id) * 0.4,
      y: Math.cos(world.elapsed * 0.5 + sheep.id * 1.3) * 0.4,
    };

    // Чононоос зугтана
    let fleeX = 0;
    let fleeY = 0;
    for (const wolf of world.wolves) {
      const d = dist(sheep.pos, wolf.pos);
      if (d < 140 && d > 1) {
        const w = (140 - d) / 140;
        fleeX += ((sheep.pos.x - wolf.pos.x) / d) * w * 3.5;
        fleeY += ((sheep.pos.y - wolf.pos.y) / d) * w * 3.5;
      }
    }

    const dCenter = dist(sheep.pos, center);
    const pull = dCenter > PASTURE_RADIUS ? 1.2 : 0.25;

    sheep.vel.x +=
      (toCenter.x * pull + toPlayer.x * 0.15 + wander.x + fleeX) * 40 * dt;
    sheep.vel.y +=
      (toCenter.y * pull + toPlayer.y * 0.15 + wander.y + fleeY) * 40 * dt;
    sheep.vel.x *= 0.92;
    sheep.vel.y *= 0.92;
    sheep.pos.x += sheep.vel.x * dt;
    sheep.pos.y += sheep.vel.y * dt;
    sheep.pos.x = clamp(sheep.pos.x, 30, WORLD_W - 30);
    sheep.pos.y = clamp(sheep.pos.y, 30, WORLD_H - 30);

    if (sheep.flash > 0) sheep.flash -= dt;
    // Хазуулсан хонь аажмаар амиа нөхнө (~12с тутамд 1 амь)
    if (sheep.hp < 3) sheep.hp = Math.min(3, sheep.hp + dt * 0.08);
    // Харах чигийг зөвхөн мэдэгдэхүйц хөдөлгөөнд солино (анивчилт арилгана)
    if (Math.abs(sheep.vel.x) > 8) sheep.face = sheep.vel.x < 0 ? -1 : 1;
  }
}

/**
 * Тоглогчид хохирол өгөх нэгдсэн функц.
 * Морьтой бол цохилтын 60%-ийг морь өөр дээрээ авна — морь үхэж болно.
 */
export function damagePlayer(state: GameState, dmg: number): void {
  const player = state.player;
  if (player.gear.horse && player.horseHp > 0) {
    const horseShare = Math.round(dmg * 0.6);
    player.horseHp -= horseShare;
    dmg -= horseShare;
    if (player.horseHp <= 0) {
      player.horseHp = 0;
      player.gear.horse = false;
      spawnParticles(state, player.pos, 14, "#6b4a26", { speed: 110 });
      spawnText(state, player.pos, "Морь үхэв!", "#ff8080");
      if (state.world.gerPacked) {
        const pos = {
          x: clamp(player.pos.x, 120, state.world.width - 120),
          y: clamp(player.pos.y, 120, state.world.height - 120),
        };
        state.world.campPos = { ...pos };
        state.world.gerPacked = false;
        state.world.campfire.pos = { x: pos.x + 52, y: pos.y + 14 };
        state.world.feeder.pos = { x: pos.x - 70, y: pos.y + 48 };
        setMessage(
          state,
          "Морь үхэж гэр унав! Энд буулаа — шинийг авч нүү.",
          4,
        );
      } else {
        setMessage(state, "Морь чинь үхлээ… Дэлгүүрээс шинийг ав.", 3);
      }
    }
  }
  player.vitals.health = clamp(
    player.vitals.health - dmg,
    0,
    player.vitals.maxHealth,
  );
}

const WOLF_PLAYER_AGGRO_RANGE = 260;

/** Edge-to-edge spacing. Player radius ni enemyBodyDistance()-d tusdaa orno. */
const WOLF_CHASE_GAP = 24;
const WOLF_LEAP_STOP_GAP = 28;
const WOLF_SOFT_SEPARATION_GAP = 14;

const WOLF_CLAW_TRIGGER_EXTRA = 32;
const WOLF_CLAW_HIT_EXTRA = 34;
const WOLF_LEAP_TRIGGER_EXTRA = 88;
const WOLF_LEAP_HIT_EXTRA = 38;

/** Wolf claw urd taldaa l onono. */
const WOLF_ATTACK_FRONT_DOT_MIN = 0.32;

const WOLF_WINDUP_DURATION = 0.45;
const WOLF_LEAP_DURATION = 0.22;
const WOLF_RECOVERY_DURATION = 0.55;
const WOLF_LEAP_SPEED = 360;

const WOLF_CLAW_WINDUP_DURATION = 0.32;
const WOLF_CLAW_ACTIVE_DURATION = 0.18;
const WOLF_CLAW_RECOVERY_DURATION = 0.42;
const WOLF_CLAW_DAMAGE_MULTIPLIER = 0.8;

const WOLF_POST_ATTACK_COOLDOWN = 1.2;
const WOLF_CLAW_POST_ATTACK_COOLDOWN = 0.95;

/** Шар telegraph улаан болж parry хийхэд тохиромжтой болох хугацаа. */
export const WOLF_PARRY_WARNING_TIME = 0.22;

/** Амжилттай parry хийсний дараах чонын stun. */
export const WOLF_STUN_DURATION = 2;

// ---------------------------------------------------------------------------
// Enemy posture
// ---------------------------------------------------------------------------

const ENEMY_POSTURE_REGEN_DELAY = 2.5;
const WOLF_POSTURE_REGEN_PER_SECOND = 14;
const BEAR_POSTURE_REGEN_PER_SECOND = 10;
const WOLF_PARRY_POSTURE_DAMAGE = 45;
const BEAR_PARRY_POSTURE_DAMAGE = 60;

function ensureEnemyPosture(wolf: Wolf): void {
  const fallbackMax = wolf.kind === "bear" ? 140 : 60;

  if (!Number.isFinite(wolf.maxPosture) || wolf.maxPosture <= 0) {
    wolf.maxPosture = fallbackMax;
  }
  if (!Number.isFinite(wolf.posture)) {
    wolf.posture = wolf.maxPosture;
  }
  if (!Number.isFinite(wolf.postureRegenDelay)) {
    wolf.postureRegenDelay = 0;
  }

  wolf.posture = clamp(wolf.posture, 0, wolf.maxPosture);
}

function enterPostureBreak(
  state: GameState,
  wolf: WolfWithLeap,
): void {
  wolf.posture = 0;
  wolf.postureRegenDelay =
    wolf.kind === "bear"
      ? BEAR_STUN_DURATION
      : WOLF_STUN_DURATION;
  wolf.attackPhase = "stunned";
  wolf.attackTimer =
    wolf.kind === "bear"
      ? BEAR_STUN_DURATION
      : WOLF_STUN_DURATION;
  wolf.attackHitDone = true;
  wolf.attackCooldown = Math.max(
    wolf.attackCooldown,
    wolf.attackTimer,
  );
  wolf.vel = { x: 0, y: 0 };

  state.fx.shake = Math.max(
    state.fx.shake,
    wolf.kind === "bear" ? 8 : 6,
  );
  spawnText(state, wolf.pos, "POSTURE BREAK!", "#ffe08a");
}

/**
 * J болон parry-аас posture damage өгнө.
 * true = posture 0 болж stun-д орсон.
 */
export function damageEnemyPosture(
  state: GameState,
  rawWolf: Wolf,
  amount: number,
): boolean {
  if (!rawWolf.alive || !Number.isFinite(amount) || amount <= 0) {
    return false;
  }

  ensureEnemyPosture(rawWolf);
  const wolf = getWolfWithLeap(rawWolf);

  if (wolf.attackPhase === "stunned") return false;

  wolf.posture = Math.max(0, wolf.posture - amount);
  wolf.postureRegenDelay = ENEMY_POSTURE_REGEN_DELAY;

  if (wolf.posture <= 0) {
    enterPostureBreak(state, wolf);
    return true;
  }

  return false;
}

function updateEnemyPosture(wolf: WolfWithLeap, dt: number): void {
  ensureEnemyPosture(wolf);

  wolf.postureRegenDelay = Math.max(
    0,
    wolf.postureRegenDelay - dt,
  );

  if (
    wolf.attackPhase === "stunned" ||
    wolf.postureRegenDelay > 0 ||
    wolf.posture >= wolf.maxPosture
  ) {
    return;
  }

  const regen =
    wolf.kind === "bear"
      ? BEAR_POSTURE_REGEN_PER_SECOND
      : WOLF_POSTURE_REGEN_PER_SECOND;

  wolf.posture = Math.min(
    wolf.maxPosture,
    wolf.posture + regen * dt,
  );
}

function restorePostureAfterStun(wolf: Wolf): void {
  ensureEnemyPosture(wolf);
  wolf.posture = wolf.maxPosture;
  wolf.postureRegenDelay = 0;
}

const PARRY_HIT_STOP_SECONDS = 0.08;
const PLAYER_HURT_HIT_STOP_SECONDS = 0.055;
const BEAR_BITE_HIT_STOP_SECONDS = 0.06;

// ---------------------------------------------------------------------------
// Bear attacks
// ---------------------------------------------------------------------------

const BEAR_PLAYER_AGGRO_RANGE = 360;

/** Bear edge-to-edge spacing. */
const BEAR_CHASE_GAP = 36;
const BEAR_GRAB_STOP_GAP = 28;
const BEAR_GRAB_HOLD_GAP = 28;
const BEAR_SOFT_SEPARATION_GAP = 20;

const BEAR_SWIPE_TRIGGER_EXTRA = 44;
const BEAR_SWIPE_HIT_EXTRA = 56;
const BEAR_GRAB_MIN_EXTRA = 82;
const BEAR_GRAB_MAX_EXTRA = 175;

const BEAR_SWIPE_WINDUP_DURATION = 0.68;
const BEAR_SWIPE_ACTIVE_DURATION = 0.28;
const BEAR_SWIPE_RECOVERY_DURATION = 0.82;
const BEAR_SWIPE_DAMAGE_MULTIPLIER = 1.15;
const BEAR_SWIPE_FRONT_DOT_MIN = 0.42;

const BEAR_GRAB_WINDUP_DURATION = 0.82;
const BEAR_GRAB_ACTIVE_DURATION = 0.38;
const BEAR_GRAB_HOLD_DURATION = 0.9;
const BEAR_GRAB_RECOVERY_DURATION = 1.05;
const BEAR_GRAB_SPEED = 430;

const BEAR_SWIPE_POST_ATTACK_COOLDOWN = 1.25;
const BEAR_GRAB_POST_ATTACK_COOLDOWN = 1.7;

/** Шар telegraph улаан болох үед bear swipe parry хийж болно. */
export const BEAR_PARRY_WARNING_TIME = 0.24;

/** Bear swipe parry хийсний дараах counter хийх хугацаа. */
export const BEAR_STUN_DURATION = 1.9;

function enemyBodyDistance(
  enemy: WolfWithLeap,
  playerRadius: number,
  extraGap: number,
): number {
  return enemy.radius * enemy.scale + playerRadius + extraGap;
}

function moveEnemyTowardPlayer(
  enemy: WolfWithLeap,
  playerPos: Vector2,
  direction: Vector2,
  speed: number,
  dt: number,
  minimumDistance: number,
): void {
  const currentDistance = dist(enemy.pos, playerPos);
  const allowedTravel = Math.max(0, currentDistance - minimumDistance);
  const travel = Math.min(speed * dt, allowedTravel);

  enemy.pos.x += direction.x * travel;
  enemy.pos.y += direction.y * travel;
}

/**
 * Leap/grab ehleh agshind avsan direction-ee hadgalna.
 * Player dodge hiivel enemy shine bairlal ruu murij dagahgui.
 */
function moveEnemyAlongLockedAttack(
  enemy: WolfWithLeap,
  playerPos: Vector2,
  speed: number,
  dt: number,
  minimumDistance: number,
): void {
  const step = speed * dt;
  const nextPos = {
    x: enemy.pos.x + enemy.attackDirection.x * step,
    y: enemy.pos.y + enemy.attackDirection.y * step,
  };

  const currentDistance = dist(enemy.pos, playerPos);
  const nextDistance = dist(nextPos, playerPos);

  // Player urd ni heveeree baival body gap deer zogsono.
  if (
    nextDistance < minimumDistance &&
    nextDistance < currentDistance
  ) {
    const allowedTravel = Math.max(
      0,
      currentDistance - minimumDistance,
    );
    enemy.pos.x +=
      enemy.attackDirection.x * Math.min(step, allowedTravel);
    enemy.pos.y +=
      enemy.attackDirection.y * Math.min(step, allowedTravel);
    return;
  }

  enemy.pos.x = nextPos.x;
  enemy.pos.y = nextPos.y;
}

/**
 * Accidental overlap bolohod enemy-g tsaash ni tulhehgui. Enemy bairaa
 * hadgalna, player-iig l zoolon edge ruu gargana.
 */
function softlySeparateEnemyFromPlayer(
  state: GameState,
  enemy: WolfWithLeap,
  edgeGap: number,
  maxCorrection: number,
): void {
  const player = state.player;
  const minimumDistance = enemyBodyDistance(
    enemy,
    player.radius,
    edgeGap,
  );
  const currentDistance = dist(enemy.pos, player.pos);

  if (currentDistance >= minimumDistance) return;

  let away = normalize({
    x: player.pos.x - enemy.pos.x,
    y: player.pos.y - enemy.pos.y,
  });

  if (away.x === 0 && away.y === 0) {
    away = {
      x: enemy.attackDirection.x,
      y: enemy.attackDirection.y,
    };
  }

  if (away.x === 0 && away.y === 0) {
    away = { x: enemy.face, y: 0 };
  }

  const correction = Math.min(
    minimumDistance - currentDistance,
    Math.max(0, maxCorrection),
  );

  player.pos.x = clamp(
    player.pos.x + away.x * correction,
    player.radius,
    WORLD_W - player.radius,
  );
  player.pos.y = clamp(
    player.pos.y + away.y * correction,
    player.radius,
    WORLD_H - player.radius,
  );
}

function holdPlayerInFrontOfBear(
  state: GameState,
  bear: WolfWithLeap,
): void {
  const player = state.player;
  const holdDistance = enemyBodyDistance(
    bear,
    player.radius,
    BEAR_GRAB_HOLD_GAP,
  );

  player.pos.x = clamp(
    bear.pos.x + bear.attackDirection.x * holdDistance,
    player.radius,
    WORLD_W - player.radius,
  );
  player.pos.y = clamp(
    bear.pos.y + bear.attackDirection.y * holdDistance,
    player.radius,
    WORLD_H - player.radius,
  );

  player.facing = {
    x: -bear.attackDirection.x,
    y: -bear.attackDirection.y,
  };
  player.moving = false;

  // Grab animation duusah hurtel movement/attack/parry/dodge-g lock hiine.
  player.combatPhase = "recovery";
  player.combatTimer = Math.max(player.combatTimer, 0.16);
  player.dodgePhase = "recovery";
  player.dodgeTimer = Math.max(player.dodgeTimer, 0.16);
  player.parryPhase = "recovery";
  player.parryTimer = Math.max(player.parryTimer, 0.16);
  player.parryArmed = false;
  player.attackMelee = false;
}

function damagePlayerFromWolf(
  state: GameState,
  wolf: WolfWithLeap,
  knockbackDistance: number,
  damageMultiplier = 1,
): boolean {
  const player = state.player;
  if (player.invuln > 0) return false;

  const resolvedDamage = Math.max(
    1,
    Math.round(wolf.damage * damageMultiplier),
  );

  player.invuln = 0.6;
  damagePlayer(state, resolvedDamage);
  triggerHitStop(state, PLAYER_HURT_HIT_STOP_SECONDS);
  spawnImpactBurst(state, player.pos, {
    color: "#d64545",
  });

  const knock = normalize({
    x: player.pos.x - wolf.pos.x,
    y: player.pos.y - wolf.pos.y,
  });

  player.pos.x = clamp(
    player.pos.x + knock.x * knockbackDistance,
    player.radius,
    WORLD_W - player.radius,
  );
  player.pos.y = clamp(
    player.pos.y + knock.y * knockbackDistance,
    player.radius,
    WORLD_H - player.radius,
  );

  state.fx.shake = Math.max(state.fx.shake, 5);
  state.fx.hurtFlash = 1;
  sfx("hurt");
  spawnParticles(state, player.pos, 8, "#d64545", { speed: 90 });
  spawnText(state, player.pos, `−${resolvedDamage}`, "#ff6060");

  if (player.vitals.health <= 0 && state.phase === "playing") {
    state.phase = "lost";
    setMessage(
      state,
      wolf.kind === "bear" ? "Баавгайд ялагдлаа…" : "Чононд ялагдлаа…",
      99,
    );
  }

  return true;
}

function safeEnemyDirection(
  from: Vector2,
  to: Vector2,
  fallbackFace: 1 | -1,
): Vector2 {
  const direction = normalize({
    x: to.x - from.x,
    y: to.y - from.y,
  });

  if (direction.x === 0 && direction.y === 0) {
    return { x: fallbackFace, y: 0 };
  }

  return direction;
}

function startBearAttack(
  bear: WolfWithLeap,
  playerPos: Vector2,
  attackKind: "bearGrab" | "bearSwipe",
): void {
  const direction = safeEnemyDirection(
    bear.pos,
    playerPos,
    bear.face,
  );

  bear.attackPhase = "windup";
  bear.attackKind = attackKind;
  bear.attackTimer =
    attackKind === "bearGrab"
      ? BEAR_GRAB_WINDUP_DURATION
      : BEAR_SWIPE_WINDUP_DURATION;
  bear.attackDirection = direction;
  bear.attackHitDone = false;
  bear.vel = { x: 0, y: 0 };

  if (Math.abs(direction.x) > 0.1) {
    bear.face = direction.x < 0 ? -1 : 1;
  }
}

function stunBearFromParry(
  state: GameState,
  bear: WolfWithLeap,
): void {
  const player = state.player;
  const postureBroken = damageEnemyPosture(
    state,
    bear,
    BEAR_PARRY_POSTURE_DAMAGE,
  );

  if (!postureBroken) {
    bear.attackPhase = "recovery";
    bear.attackTimer = 0.72;
    bear.attackHitDone = true;
    bear.attackCooldown = Math.max(bear.attackCooldown, 1.05);
    bear.vel = { x: 0, y: 0 };
  }

  player.parryPhase = "recovery";
  player.parryTimer = 0.12;
  player.parryArmed = false;
  player.invuln = Math.max(player.invuln, 0.18);

  state.fx.shake = Math.max(state.fx.shake, 8);
  triggerHitStop(state, PARRY_HIT_STOP_SECONDS);
  spawnImpactBurst(state, bear.pos, {
    heavy: true,
    color: "#ffe08a",
  });
  sfx("parry");
  spawnParticles(state, bear.pos, 22, "#ffe08a", {
    speed: 170,
    size: 3.2,
  });
  spawnText(
    state,
    bear.pos,
    `PARRY! −${BEAR_PARRY_POSTURE_DAMAGE}`,
    "#fff0a8",
  );

  if (postureBroken) {
    setMessage(state, "Posture эвдэрлээ — одоо J: амийн 1/4!", 1.8);
  } else {
    setMessage(
      state,
      `Баавгайн posture: ${Math.ceil(bear.posture)}/${bear.maxPosture}`,
      1.25,
    );
  }
}

function startBearGrabHold(
  state: GameState,
  bear: WolfWithLeap,
): void {
  const player = state.player;

  bear.attackPhase = "grabbing";
  bear.attackTimer = BEAR_GRAB_HOLD_DURATION;
  bear.attackHitDone = false;
  bear.vel = { x: 0, y: 0 };

  player.invuln = Math.max(player.invuln, BEAR_GRAB_HOLD_DURATION + 0.2);
  holdPlayerInFrontOfBear(state, bear);

  state.fx.shake = Math.max(state.fx.shake, 7);
  sfx("hurt");
  spawnParticles(state, player.pos, 10, "#d64545", {
    speed: 95,
    size: 2.6,
  });
  spawnText(state, player.pos, "БАРИУЛАВ!", "#ff8068");
}

function finishPlayerFromBearGrab(
  state: GameState,
  bear: WolfWithLeap,
): void {
  const player = state.player;

  holdPlayerInFrontOfBear(state, bear);
  player.vitals.health = 0;
  player.invuln = 1;
  bear.attackHitDone = true;
  bear.vel = { x: 0, y: 0 };

  state.fx.shake = Math.max(state.fx.shake, 10);
  state.fx.hurtFlash = 1;
  spawnParticles(state, player.pos, 18, "#d64545", {
    speed: 135,
    size: 3,
  });

  if (state.phase === "playing") {
    state.phase = "lost";
    setMessage(state, "Баавгайн дайралтад бариуллаа…", 99);
  }
}

function updateBearAttackPhase(
  state: GameState,
  bear: WolfWithLeap,
  dt: number,
): boolean {
  const player = state.player;

  if (bear.attackPhase === "chasing") return false;

  const previousTimer = bear.attackTimer;
  bear.attackTimer = Math.max(0, bear.attackTimer - dt);

  if (bear.attackPhase === "grabbing") {
    bear.vel = { x: 0, y: 0 };
    holdPlayerInFrontOfBear(state, bear);

    // Animation-iin dund neg udaa hazah impact gargana.
    if (
      !bear.attackHitDone &&
      previousTimer > BEAR_GRAB_HOLD_DURATION * 0.5 &&
      bear.attackTimer <= BEAR_GRAB_HOLD_DURATION * 0.5
    ) {
      bear.attackHitDone = true;
      state.fx.shake = Math.max(state.fx.shake, 8);
      triggerHitStop(state, BEAR_BITE_HIT_STOP_SECONDS);
      spawnImpactBurst(state, player.pos, {
        heavy: true,
        color: "#d64545",
      });
      sfx("hurt");
      spawnParticles(state, player.pos, 12, "#d64545", {
        speed: 115,
        size: 2.8,
      });
      spawnText(state, player.pos, "ХАЗУУЛАВ!", "#ff7058");
    }

    if (bear.attackTimer <= 0) {
      finishPlayerFromBearGrab(state, bear);
    }

    return true;
  }

  if (bear.attackPhase === "stunned") {
    bear.vel = { x: 0, y: 0 };

    if (bear.attackTimer <= 0) {
      restorePostureAfterStun(bear);
      bear.attackPhase = "chasing";
      bear.attackTimer = 0;
      bear.attackHitDone = false;
      bear.attackCooldown = Math.max(bear.attackCooldown, 1);
    }

    return true;
  }

  if (bear.attackPhase === "windup") {
    bear.vel = { x: 0, y: 0 };

    if (bear.attackTimer <= 0) {
      bear.attackPhase = "leaping";
      bear.attackTimer =
        bear.attackKind === "bearGrab"
          ? BEAR_GRAB_ACTIVE_DURATION
          : BEAR_SWIPE_ACTIVE_DURATION;
      bear.attackHitDone = false;
    }

    return true;
  }

  if (bear.attackPhase === "leaping") {
    const grabAttack = bear.attackKind === "bearGrab";
    const swipeAttack = bear.attackKind === "bearSwipe";

    if (grabAttack) {
      bear.vel = {
        x: bear.attackDirection.x * BEAR_GRAB_SPEED,
        y: bear.attackDirection.y * BEAR_GRAB_SPEED,
      };

      const grabStopDistance = enemyBodyDistance(
        bear,
        player.radius,
        BEAR_GRAB_STOP_GAP,
      );

      moveEnemyAlongLockedAttack(
        bear,
        player.pos,
        BEAR_GRAB_SPEED,
        dt,
        grabStopDistance,
      );

      bear.pos.x = clamp(
        bear.pos.x,
        bear.radius,
        WORLD_W - bear.radius,
      );
      bear.pos.y = clamp(
        bear.pos.y,
        bear.radius,
        WORLD_H - bear.radius,
      );

      const grabRange = grabStopDistance + 8;

      if (
        !bear.attackHitDone &&
        dist(bear.pos, player.pos) <= grabRange
      ) {
        if (player.invuln > 0) {
          // Dodge амжилттай давхцсан бол энэ grab дахин шалгахгүй.
          bear.attackHitDone = true;
          spawnText(state, player.pos, "DODGE!", "#b8e8ff");
        } else {
          startBearGrabHold(state, bear);
          return true;
        }
      }
    } else if (swipeAttack) {
      // Босож савардах үед байрнаасаа хөдлөхгүй.
      bear.vel = { x: 0, y: 0 };

      const toPlayer = normalize({
        x: player.pos.x - bear.pos.x,
        y: player.pos.y - bear.pos.y,
      });
      const facingDot =
        toPlayer.x * bear.attackDirection.x +
        toPlayer.y * bear.attackDirection.y;
      const insideFrontCone =
        facingDot >= BEAR_SWIPE_FRONT_DOT_MIN;
      const swipeRange = enemyBodyDistance(
        bear,
        player.radius,
        BEAR_SWIPE_HIT_EXTRA,
      );

      if (
        !bear.attackHitDone &&
        insideFrontCone &&
        dist(bear.pos, player.pos) <= swipeRange
      ) {
        bear.attackHitDone = true;

        if (
          player.parryPhase === "active" &&
          player.parryArmed
        ) {
          stunBearFromParry(state, bear);
        } else {
          damagePlayerFromWolf(
            state,
            bear,
            36,
            BEAR_SWIPE_DAMAGE_MULTIPLIER,
          );
        }
      }
    }

    if (swipeAttack && bear.attackPhase === "leaping") {
      softlySeparateEnemyFromPlayer(
        state,
        bear,
        BEAR_SOFT_SEPARATION_GAP,
        190 * dt,
      );
    }

    if (
      bear.attackPhase === "leaping" &&
      bear.attackTimer <= 0
    ) {
      bear.attackPhase = "recovery";
      bear.attackTimer =
        bear.attackKind === "bearGrab"
          ? BEAR_GRAB_RECOVERY_DURATION
          : BEAR_SWIPE_RECOVERY_DURATION;
      bear.vel = { x: 0, y: 0 };
    }

    return true;
  }

  bear.vel = { x: 0, y: 0 };

  if (bear.attackTimer <= 0) {
    bear.attackPhase = "chasing";
    bear.attackTimer = 0;
    bear.attackHitDone = false;
    bear.attackCooldown = Math.max(
      bear.attackCooldown,
      bear.attackKind === "bearGrab"
        ? BEAR_GRAB_POST_ATTACK_COOLDOWN
        : BEAR_SWIPE_POST_ATTACK_COOLDOWN,
    );
  }

  return true;
}

function updateBearBehavior(
  state: GameState,
  bear: WolfWithLeap,
  dt: number,
): void {
  const player = state.player;
  const dPlayer = dist(bear.pos, player.pos);

  // Player ойрхон үед баавгайн гол бай болно.
  if (dPlayer <= BEAR_PLAYER_AGGRO_RANGE) {
    const toPlayer = safeEnemyDirection(
      bear.pos,
      player.pos,
      bear.face,
    );

    bear.vel = toPlayer;

    if (Math.abs(toPlayer.x) > 0.25) {
      bear.face = toPlayer.x < 0 ? -1 : 1;
    }

    const bodyDistance =
      bear.radius * bear.scale + player.radius;
    const swipeTriggerRange =
      bodyDistance + BEAR_SWIPE_TRIGGER_EXTRA;
    const grabMinRange = bodyDistance + BEAR_GRAB_MIN_EXTRA;
    const grabMaxRange = bodyDistance + BEAR_GRAB_MAX_EXTRA;
    const stopDistance = bodyDistance + BEAR_CHASE_GAP;

    if (bear.attackCooldown <= 0) {
      if (dPlayer <= swipeTriggerRange) {
        startBearAttack(bear, player.pos, "bearSwipe");
        return;
      }

      if (
        dPlayer >= grabMinRange &&
        dPlayer <= grabMaxRange
      ) {
        startBearAttack(bear, player.pos, "bearGrab");
        return;
      }
    }

    moveEnemyTowardPlayer(
      bear,
      player.pos,
      toPlayer,
      bear.speed,
      dt,
      stopDistance,
    );
    softlySeparateEnemyFromPlayer(
      state,
      bear,
      BEAR_CHASE_GAP,
      220 * dt,
    );

    bear.pos.x = clamp(
      bear.pos.x,
      bear.radius,
      WORLD_W - bear.radius,
    );
    bear.pos.y = clamp(
      bear.pos.y,
      bear.radius,
      WORLD_H - bear.radius,
    );
    return;
  }

  // Player хол үед хуучин хонь руу дайрах behavior-ийг хадгална.
  const prey = nearestSheep(
    bear.pos,
    state.world.flock.visuals,
  );
  const target = prey?.pos ?? pastureCenter(state.world);
  const direction = safeEnemyDirection(
    bear.pos,
    target,
    bear.face,
  );

  bear.vel = direction;

  if (Math.abs(direction.x) > 0.25) {
    bear.face = direction.x < 0 ? -1 : 1;
  }

  const dPrey = prey
    ? dist(bear.pos, prey.pos)
    : Number.POSITIVE_INFINITY;
  const biteRange =
    bear.radius * bear.scale +
    (prey ? prey.radius : 0) +
    4;

  if (dPrey > biteRange - 3) {
    bear.pos.x += direction.x * bear.speed * dt;
    bear.pos.y += direction.y * bear.speed * dt;
  }

  if (
    prey &&
    dPrey < biteRange + 4 &&
    bear.attackCooldown <= 0
  ) {
    bear.attackCooldown = 1.5;
    const damage =
      1.5 * livestockFenceDamageMultiplier(state, bear, prey);
    if (damage < 0.12) {
      spawnText(state, prey.pos, "Хашаа хамгааллаа", "#a8d8ff");
      spawnParticles(state, bear.pos, 3, "#90c8e8", { speed: 40 });
    } else {
      prey.hp -= damage;
      prey.flash = 0.18;
      sfx("baa");
      spawnParticles(state, prey.pos, 5, "#f0ebe3", {
        speed: 70,
      });
    }

    if (prey.hp <= 0) {
      spawnParticles(state, prey.pos, 12, "#f0ebe3", {
        speed: 100,
      });
      spawnText(
        state,
        prey.pos,
        `−1 ${LIVESTOCK_MN[prey.kind]}`,
        "#ff8080",
      );
      killSheepVisual(state, prey);
      setMessage(state, `Баавгай ${LIVESTOCK_MN[prey.kind]} барив!`, 2);
    }
  }

  bear.pos.x = clamp(
    bear.pos.x,
    bear.radius,
    WORLD_W - bear.radius,
  );
  bear.pos.y = clamp(
    bear.pos.y,
    bear.radius,
    WORLD_H - bear.radius,
  );
}

function startWolfWindup(
  wolf: WolfWithLeap,
  playerPos: Vector2,
  attackKind: WolfAttackKind,
): void {
  let direction = normalize({
    x: playerPos.x - wolf.pos.x,
    y: playerPos.y - wolf.pos.y,
  });

  if (direction.x === 0 && direction.y === 0) {
    direction = { x: wolf.face, y: 0 };
  }

  wolf.attackPhase = "windup";
  wolf.attackKind = attackKind;
  wolf.attackTimer =
    attackKind === "claw"
      ? WOLF_CLAW_WINDUP_DURATION
      : WOLF_WINDUP_DURATION;
  wolf.attackDirection = direction;
  wolf.attackHitDone = false;
  wolf.vel = { x: 0, y: 0 };

  if (Math.abs(direction.x) > 0.1) {
    wolf.face = direction.x < 0 ? -1 : 1;
  }
}

function stunWolfFromParry(
  state: GameState,
  wolf: WolfWithLeap,
): void {
  const player = state.player;
  const postureBroken = damageEnemyPosture(
    state,
    wolf,
    WOLF_PARRY_POSTURE_DAMAGE,
  );

  if (!postureBroken) {
    wolf.attackPhase = "recovery";
    wolf.attackTimer = 0.46;
    wolf.attackHitDone = true;
    wolf.attackCooldown = Math.max(wolf.attackCooldown, 0.8);
    wolf.vel = { x: 0, y: 0 };
  }

  player.parryPhase = "recovery";
  player.parryTimer = 0.12;
  player.parryArmed = false;
  player.invuln = Math.max(player.invuln, 0.16);

  state.fx.shake = Math.max(state.fx.shake, 6);
  triggerHitStop(state, PARRY_HIT_STOP_SECONDS);
  spawnImpactBurst(state, wolf.pos, {
    heavy: true,
    color: "#ffe08a",
  });
  sfx("parry");
  spawnParticles(state, wolf.pos, 16, "#ffe08a", {
    speed: 145,
    size: 2.8,
  });
  spawnText(
    state,
    wolf.pos,
    `PARRY! −${WOLF_PARRY_POSTURE_DAMAGE}`,
    "#fff0a8",
  );
}

function updateWolfAttackPhase(
  state: GameState,
  wolf: WolfWithLeap,
  dt: number,
): boolean {
  const player = state.player;

  if (wolf.attackPhase === "chasing") return false;

  wolf.attackTimer = Math.max(0, wolf.attackTimer - dt);

  if (wolf.attackPhase === "stunned") {
    wolf.vel = { x: 0, y: 0 };

    if (wolf.attackTimer <= 0) {
      restorePostureAfterStun(wolf);
      wolf.attackPhase = "chasing";
      wolf.attackTimer = 0;
      wolf.attackHitDone = false;
      wolf.attackCooldown = Math.max(wolf.attackCooldown, 0.8);
    }

    return true;
  }

  if (wolf.attackPhase === "windup") {
    wolf.vel = { x: 0, y: 0 };

    if (wolf.attackTimer <= 0) {
      wolf.attackPhase = "leaping";
      wolf.attackTimer =
        wolf.attackKind === "claw"
          ? WOLF_CLAW_ACTIVE_DURATION
          : WOLF_LEAP_DURATION;
      wolf.attackHitDone = false;
    }

    return true;
  }

  if (wolf.attackPhase === "leaping") {
    const clawAttack = wolf.attackKind === "claw";

    if (clawAttack) {
      // Oirhon baih ued usrehgui, bairnaasaa urd sarvuugaar tsohino.
      wolf.vel = { x: 0, y: 0 };
    } else {
      wolf.vel = {
        x: wolf.attackDirection.x * WOLF_LEAP_SPEED,
        y: wolf.attackDirection.y * WOLF_LEAP_SPEED,
      };

      const leapStopDistance = enemyBodyDistance(
        wolf,
        player.radius,
        WOLF_LEAP_STOP_GAP,
      );

      moveEnemyAlongLockedAttack(
        wolf,
        player.pos,
        WOLF_LEAP_SPEED,
        dt,
        leapStopDistance,
      );

      wolf.pos.x = clamp(wolf.pos.x, wolf.radius, WORLD_W - wolf.radius);
      wolf.pos.y = clamp(wolf.pos.y, wolf.radius, WORLD_H - wolf.radius);
    }

    const contactDistance = dist(wolf.pos, player.pos);
    const hitRange = clawAttack
      ? enemyBodyDistance(
          wolf,
          player.radius,
          WOLF_CLAW_HIT_EXTRA,
        )
      : enemyBodyDistance(
          wolf,
          player.radius,
          WOLF_LEAP_HIT_EXTRA,
        );

    const toPlayer = normalize({
      x: player.pos.x - wolf.pos.x,
      y: player.pos.y - wolf.pos.y,
    });
    const facingDot =
      toPlayer.x * wolf.attackDirection.x +
      toPlayer.y * wolf.attackDirection.y;
    const insideAttackArc = !clawAttack || facingDot >= WOLF_ATTACK_FRONT_DOT_MIN;

    if (
      !wolf.attackHitDone &&
      contactDistance <= hitRange &&
      insideAttackArc
    ) {
      wolf.attackHitDone = true;

      if (player.parryPhase === "active" && player.parryArmed) {
        stunWolfFromParry(state, wolf);
      } else {
        damagePlayerFromWolf(
          state,
          wolf,
          clawAttack ? 20 : 32,
          clawAttack ? WOLF_CLAW_DAMAGE_MULTIPLIER : 1,
        );
      }
    }

    softlySeparateEnemyFromPlayer(
      state,
      wolf,
      WOLF_SOFT_SEPARATION_GAP,
      180 * dt,
    );

    if (wolf.attackPhase === "leaping" && wolf.attackTimer <= 0) {
      wolf.attackPhase = "recovery";
      wolf.attackTimer = clawAttack
        ? WOLF_CLAW_RECOVERY_DURATION
        : WOLF_RECOVERY_DURATION;
      wolf.vel = { x: 0, y: 0 };
    }

    return true;
  }

  wolf.vel = { x: 0, y: 0 };

  if (wolf.attackTimer <= 0) {
    wolf.attackPhase = "chasing";
    wolf.attackTimer = 0;
    wolf.attackHitDone = false;
    wolf.attackCooldown = Math.max(
      wolf.attackCooldown,
      wolf.attackKind === "claw"
        ? WOLF_CLAW_POST_ATTACK_COOLDOWN
        : WOLF_POST_ATTACK_COOLDOWN,
    );
  }

  return true;
}

function updateNormalWolfChasing(
  state: GameState,
  wolf: WolfWithLeap,
  dt: number,
): void {
  const player = state.player;
  const flock = state.world.flock;
  const dPlayer = dist(wolf.pos, player.pos);

  // Player is the priority target while close enough.
  if (dPlayer <= WOLF_PLAYER_AGGRO_RANGE) {
    const toPlayer = normalize({
      x: player.pos.x - wolf.pos.x,
      y: player.pos.y - wolf.pos.y,
    });

    wolf.vel = toPlayer;

    if (Math.abs(toPlayer.x) > 0.25) {
      wolf.face = toPlayer.x < 0 ? -1 : 1;
    }

    const bodyDistance =
      wolf.radius * wolf.scale + player.radius;
    const clawTriggerRange =
      bodyDistance + WOLF_CLAW_TRIGGER_EXTRA;
    const leapTriggerRange =
      bodyDistance + WOLF_LEAP_TRIGGER_EXTRA;
    const stopDistance = bodyDistance + WOLF_CHASE_GAP;

    if (wolf.attackCooldown <= 0) {
      if (dPlayer <= clawTriggerRange) {
        startWolfWindup(wolf, player.pos, "claw");
        return;
      }

      if (dPlayer <= leapTriggerRange) {
        startWolfWindup(wolf, player.pos, "leap");
        return;
      }
    }

    moveEnemyTowardPlayer(
      wolf,
      player.pos,
      toPlayer,
      wolf.speed,
      dt,
      stopDistance,
    );
    softlySeparateEnemyFromPlayer(
      state,
      wolf,
      WOLF_CHASE_GAP,
      220 * dt,
    );

    wolf.pos.x = clamp(wolf.pos.x, wolf.radius, WORLD_W - wolf.radius);
    wolf.pos.y = clamp(wolf.pos.y, wolf.radius, WORLD_H - wolf.radius);
    return;
  }

  // Outside player aggro range, preserve the original sheep-hunting behavior.
  const prey = nearestSheep(wolf.pos, flock.visuals);
  const target = prey?.pos ?? pastureCenter(state.world);
  const dir = normalize({
    x: target.x - wolf.pos.x,
    y: target.y - wolf.pos.y,
  });

  wolf.vel = dir;

  if (Math.abs(dir.x) > 0.25) {
    wolf.face = dir.x < 0 ? -1 : 1;
  }

  const dPrey = prey ? dist(wolf.pos, prey.pos) : Infinity;
  const biteRange =
    wolf.radius * wolf.scale + (prey ? prey.radius : 0) + 4;

  if (dPrey > biteRange - 3) {
    wolf.pos.x += dir.x * wolf.speed * dt;
    wolf.pos.y += dir.y * wolf.speed * dt;
  }

  if (prey && dPrey < biteRange + 4 && wolf.attackCooldown <= 0) {
    wolf.attackCooldown = 1.3;
    const damage = livestockFenceDamageMultiplier(state, wolf, prey);
    if (damage < 0.12) {
      spawnText(state, prey.pos, "Хашаа хамгааллаа", "#a8d8ff");
      spawnParticles(state, wolf.pos, 3, "#90c8e8", { speed: 40 });
    } else {
      prey.hp -= damage;
      prey.flash = 0.18;
      sfx("baa");
      spawnParticles(state, prey.pos, 5, "#f0ebe3", { speed: 70 });
    }

    if (prey.hp <= 0) {
      spawnParticles(state, prey.pos, 12, "#f0ebe3", { speed: 100 });
      spawnText(
        state,
        prey.pos,
        `−1 ${LIVESTOCK_MN[prey.kind]}`,
        "#ff8080",
      );
      killSheepVisual(state, prey);
      setMessage(state, `Чоно ${LIVESTOCK_MN[prey.kind]} барив!`, 2);
    }
  }

  wolf.pos.x = clamp(wolf.pos.x, wolf.radius, WORLD_W - wolf.radius);
  wolf.pos.y = clamp(wolf.pos.y, wolf.radius, WORLD_H - wolf.radius);
}

export function updateWolves(state: GameState, dt: number): void {
  const { wolves } = state.world;

  if (!Number.isFinite(dt) || dt <= 0) return;

  for (const rawWolf of wolves) {
    if (!rawWolf.alive) continue;

    const wolf = getWolfWithLeap(rawWolf);

    wolf.attackCooldown = Math.max(0, wolf.attackCooldown - dt);
    wolf.flash = Math.max(0, wolf.flash - dt);
    updateEnemyPosture(wolf, dt);

    if (wolf.kind === "bear") {
      if (updateBearAttackPhase(state, wolf, dt)) {
        continue;
      }

      updateBearBehavior(state, wolf, dt);
      continue;
    }

    if (updateWolfAttackPhase(state, wolf, dt)) {
      continue;
    }

    updateNormalWolfChasing(state, wolf, dt);
  }

  state.world.wolves = wolves.filter((wolf) => wolf.alive);
}

export function updateThieves(state: GameState, dt: number): void {
  const player = state.player;
  for (const thief of state.world.thieves) {
    if (!thief.alive) continue;
    thief.flash = Math.max(0, thief.flash - dt);
    thief.attackCooldown = Math.max(0, thief.attackCooldown - dt);

    const dPlayer = dist(thief.pos, player.pos);
    const dir = normalize({
      x: thief.escapeTarget.x - thief.pos.x,
      y: thief.escapeTarget.y - thief.pos.y,
    });
    thief.vel = dir;

    if (dPlayer < 70) {
      // Тоглогч ойртвол эргэж зөрүүлж зодолдоно — удаан зугтана
      thief.face = player.pos.x < thief.pos.x ? -1 : 1;
      thief.pos.x += dir.x * thief.speed * 0.45 * dt;
      thief.pos.y += dir.y * thief.speed * 0.45 * dt;

      if (
        dPlayer < thief.radius + player.radius + 6 &&
        thief.attackCooldown <= 0 &&
        player.invuln <= 0
      ) {
        thief.attackCooldown = 1.1;
        player.invuln = 0.5;
        damagePlayer(state, thief.damage);
        const knock = normalize({
          x: player.pos.x - thief.pos.x,
          y: player.pos.y - thief.pos.y,
        });
        player.pos.x += knock.x * 20;
        player.pos.y += knock.y * 20;
        state.fx.shake = Math.max(state.fx.shake, 4);
        state.fx.hurtFlash = 1;
        sfx("hurt");
        spawnParticles(state, player.pos, 6, "#d64545", { speed: 80 });
        spawnText(state, player.pos, `−${thief.damage}`, "#ff6060");
        if (player.vitals.health <= 0 && state.phase === "playing") {
          state.phase = "lost";
          setMessage(state, "Хулгайчид зодуулж ялагдлаа…", 99);
        }
      }
    } else {
      if (Math.abs(dir.x) > 0.25) thief.face = dir.x < 0 ? -1 : 1;
      thief.pos.x += dir.x * thief.speed * dt;
      thief.pos.y += dir.y * thief.speed * dt;
    }

    const atEdge =
      thief.pos.x <= 30 ||
      thief.pos.x >= WORLD_W - 30 ||
      thief.pos.y <= 30 ||
      thief.pos.y >= WORLD_H - 30 ||
      dist(thief.pos, thief.escapeTarget) < 40;

    if (atEdge) {
      const lost = thief.stolen;
      thief.stolen = 0;
      thief.alive = false;
      setMessage(
        state,
        lost > 0
          ? `Хулгайч зугтав… ${lost} хонь үгүй болов.`
          : "Хулгайч зугтав.",
        3,
      );
    }
  }

  state.world.thieves = state.world.thieves.filter((t) => t.alive);
}

export function updateThreatTimers(state: GameState, dt: number): void {
  const world = state.world;
  world.nextWolfIn -= dt;
  world.nextThiefIn -= dt;

  const night = isNight(world);
  if (world.nextWolfIn <= 0) {
    // 2-р түвшнээс эхлэн заримдаа чонын оронд баавгай гарна
    const bear = state.level >= 2 && Math.random() < 0.25;
    spawnWolf(state, bear ? "bear" : "wolf");
    world.nextWolfIn = night ? randRange(10, 18) : randRange(22, 38);
  }

  if (world.nextThiefIn <= 0) {
    if (!night || Math.random() < 0.35) {
      spawnThief(state);
    }
    world.nextThiefIn = randRange(28, 50);
  }
}
