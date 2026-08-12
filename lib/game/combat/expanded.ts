import {
  VIEW_H,
  VIEW_W,
  WOLF_CORPSE_DURATION,
  WORLD_H,
  WORLD_W,
  type AttackVariant,
  type GameState,
  type LivestockKind,
  type Projectile,
  type RouteEnemy,
  type Thief,
  type Vector2,
  type Wolf,
} from "../types";
import {
  clamp,
  dist,
  normalize,
  pushOutOfGer,
  pushOutOfUrtz,
  setMessage,
} from "../utils";
import { applyRiverCurrent } from "../biomes";
import {
  spawnImpactBurst,
  spawnParticles,
  spawnSoulRelease,
  spawnText,
  startCameraShake,
  triggerHitStop,
} from "../effects";
import { sfx } from "../audio";
import { gainXp, tryDemolishFence } from "../player";
import { addSheep } from "../enemies";
import { damageEnemyPosture } from "./enemyBehaviors";
import {
  damageRouteEnemy,
  damageRouteEnemyPosture,
  inShulmasSpirit,
  isRouteEnemyParryThreat,
  zurgaanNarSkyScreenPos,
  zurgaanNarSkyWorldPos,
  zurgaanNarSlotIndex,
} from "../firstRoute";
import {
  damageTumurShulmasFromPlayer,
  isTumurShulmasParryThreat,
} from "../tumurShulmas";
import { trFormat } from "../i18n";

type EnemyCombatPhase =
  | "chasing"
  | "windup"
  | "leaping"
  | "recovery"
  | "stunned";

type EnemyAttackKind =
  | "leap"
  | "claw"
  | "bearGrab"
  | "bearSwipe";

type WolfWithCombatState = Wolf & {
  attackPhase: EnemyCombatPhase;
  attackKind: EnemyAttackKind;
  attackTimer: number;
  attackHitDone: boolean;
};

function getWolfCombatState(wolf: Wolf): WolfWithCombatState {
  return wolf as WolfWithCombatState;
}

// ---------------------------------------------------------------------------
// Milestone 1 — Souls-like melee timing + stamina
// ---------------------------------------------------------------------------

const STAFF_MELEE_STAMINA_COST = 15;
const SWORD_MELEE_STAMINA_COST = 20;
const MELEE_STARTUP_SECONDS = 0.07;
const MELEE_ACTIVE_SECONDS = 0.07;
const MELEE_RECOVERY_SECONDS = 0.12;
/** Recovery эхэлснээс хойш dodge cancel зөвшөөрөх хугацаа */
const MELEE_DODGE_CANCEL_AFTER = 0.04;

const PARRY_STAMINA_COST = 10;
const PARRY_STARTUP_SECONDS = 0.02;
const PARRY_ACTIVE_SECONDS = 0.42;
const PARRY_RECOVERY_SECONDS = 0.14;
/** Нум бүрэн charge болох хугацаа (сек) */
const BOW_CHARGE_SECONDS = 0.62;

const DODGE_STAMINA_COST = 17;
const DODGE_DURATION_SECONDS = 0.28;
const DODGE_RECOVERY_SECONDS = 0.08;
const DODGE_SPEED = 450;
const DODGE_INVULN_START = 0.025;
const DODGE_INVULN_END = 0.24;

const STAMINA_REGEN_DELAY_SECONDS = 0.5;
const STAMINA_REGEN_PER_SECOND = 38;

const NORMAL_MELEE_HIT_STOP_SECONDS = 0.055;
const HEAVY_MELEE_HIT_STOP_SECONDS = 0.08;
const EXECUTION_HIT_STOP_SECONDS = 0.09;

/** Hitstop/recovery үед алдагдсан оролтыг хадгалах цонх */
const COMBAT_INPUT_BUFFER_SECONDS = 0.15;
const FENCE_DEMOLISH_THREAT_RADIUS = 160;

type CombatInputBuffers = {
  attack: number;
  dodge: number;
  parry: number;
};

const combatInputBuffers = new WeakMap<GameState, CombatInputBuffers>();

function getCombatBuffers(state: GameState): CombatInputBuffers {
  let buffers = combatInputBuffers.get(state);
  if (!buffers) {
    buffers = { attack: 0, dodge: 0, parry: 0 };
    combatInputBuffers.set(state, buffers);
  }
  return buffers;
}

function queueCombatInputs(state: GameState): void {
  const buffers = getCombatBuffers(state);
  const { input } = state;
  if (input.attack || input.attackPressed) {
    buffers.attack = COMBAT_INPUT_BUFFER_SECONDS;
  }
  if (input.dodge || input.dodgePressed) {
    buffers.dodge = COMBAT_INPUT_BUFFER_SECONDS;
  }
  if (input.parry || input.parryPressed) {
    buffers.parry = COMBAT_INPUT_BUFFER_SECONDS;
  }
}

function tickCombatBuffers(state: GameState, dt: number): void {
  const buffers = getCombatBuffers(state);
  buffers.attack = Math.max(0, buffers.attack - dt);
  buffers.dodge = Math.max(0, buffers.dodge - dt);
  buffers.parry = Math.max(0, buffers.parry - dt);
}

function isStoryCombatFocus(state: GameState): boolean {
  const objective = state.story.activeMainObjective;
  return (
    state.story.temporaryPlayerProtectionActive ||
    objective === "protectFlock" ||
    objective === "observeWolfMovement" ||
    objective === "parryStoryWolf" ||
    objective === "counterStoryWolf"
  );
}

function setStaminaFailMessage(state: GameState): void {
  // Tutorial coaching-ийг stamina toast дарж болохгүй
  if (isStoryCombatFocus(state) && state.messageTimer > 0.6) return;
  setMessage(state, "Тамир тасарч, хүч барагдав.", 1.5);
}

function threatsNearPlayer(state: GameState, radius: number): boolean {
  const { player, world } = state;
  for (const wolf of world.wolves) {
    if (wolf.alive && dist(player.pos, wolf.pos) <= radius) return true;
  }
  for (const thief of world.thieves) {
    if (thief.alive && dist(player.pos, thief.pos) <= radius) return true;
  }
  for (const enemy of world.firstRoute.enemies) {
    if (enemy.alive && dist(player.pos, enemy.pos) <= radius) return true;
  }
  const boss = world.tumurShulmas;
  if (
    boss.active &&
    !boss.defeated &&
    dist(player.pos, boss.pos) <= radius
  ) {
    return true;
  }
  return false;
}

function addMeleeImpact(
  state: GameState,
  pos: Vector2,
  color: string,
  heavy: boolean,
): void {
  triggerHitStop(
    state,
    heavy
      ? HEAVY_MELEE_HIT_STOP_SECONDS
      : NORMAL_MELEE_HIT_STOP_SECONDS,
  );
  startCameraShake(state, heavy ? 0.12 : 0.08, heavy ? 4.2 : 2.8);
  spawnImpactBurst(state, pos, { heavy, color });
}

/** Visual staff/slash reach-tei taaruulsan melee hitbox. */
const STAFF_NORMAL_REACH = 38;
const STAFF_HEAVY_REACH = 44;
const SWORD_NORMAL_REACH = 49;
const SWORD_HEAVY_REACH = 57;

/** Ar tal bolon heterhii hajuug tsohihgui urd cone. */
const MELEE_FACING_DOT_MIN = 0.35;

const WOLF_NORMAL_POSTURE_DAMAGE = 12;
const WOLF_HEAVY_POSTURE_DAMAGE = 22;
const BEAR_NORMAL_POSTURE_DAMAGE = 9;
const BEAR_HEAVY_POSTURE_DAMAGE = 17;

function isSkySwordEquipped(state: GameState): boolean {
  return state.player.hasSkySword && state.player.weapon === "skySword";
}

function meleeStaminaCost(state: GameState): number {
  return isSkySwordEquipped(state)
    ? SWORD_MELEE_STAMINA_COST
    : STAFF_MELEE_STAMINA_COST;
}

function meleeBaseDamage(state: GameState): number {
  return isSkySwordEquipped(state) ? 32 : 20;
}

function meleeWolfDamage(state: GameState): number {
  return isSkySwordEquipped(state) ? 29 : 22;
}

function meleeReach(state: GameState, heavy: boolean): number {
  if (isSkySwordEquipped(state)) {
    return heavy ? SWORD_HEAVY_REACH : SWORD_NORMAL_REACH;
  }
  return heavy ? STAFF_HEAVY_REACH : STAFF_NORMAL_REACH;
}

function meleePostureMultiplier(state: GameState): number {
  return isSkySwordEquipped(state) ? 1.38 : 1;
}

function safeFacing(facing: Vector2): Vector2 {
  const normalized = normalize(facing);
  if (normalized.x === 0 && normalized.y === 0) {
    return { x: 0, y: 1 };
  }
  return normalized;
}

function dodgeDirection(state: GameState): Vector2 {
  const inputDirection = normalize({
    x: (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0),
    y: (state.input.down ? 1 : 0) - (state.input.up ? 1 : 0),
  });
  if (inputDirection.x !== 0 || inputDirection.y !== 0) return inputDirection;

  const { player, world } = state;
  let nearest: Vector2 | null = null;
  let nearestDistance = 190;
  for (const wolf of world.wolves) {
    if (!wolf.alive) continue;
    const distance = dist(player.pos, wolf.pos);
    if (distance <= nearestDistance) {
      nearestDistance = distance;
      nearest = wolf.pos;
    }
  }
  for (const thief of world.thieves) {
    if (!thief.alive) continue;
    const distance = dist(player.pos, thief.pos);
    if (distance <= nearestDistance) {
      nearestDistance = distance;
      nearest = thief.pos;
    }
  }
  if (inShulmasSpirit(state)) {
    for (const enemy of world.firstRoute.enemies) {
      if (!enemy.alive) continue;
      const distance = dist(player.pos, enemy.pos);
      if (distance <= nearestDistance) {
        nearestDistance = distance;
        nearest = enemy.pos;
      }
    }
  }
  const boss = world.tumurShulmas;
  if (boss.active && !boss.defeated) {
    const distance = dist(player.pos, boss.pos);
    if (distance <= nearestDistance) nearest = boss.pos;
  }
  if (nearest) {
    return safeFacing(
      { x: player.pos.x - nearest.x, y: player.pos.y - nearest.y },
    );
  }
  return safeFacing(player.facing);
}

function beginDodge(state: GameState): boolean {
  const { player } = state;
  if (player.dodgePhase !== "idle") return false;
  if (player.parryPhase !== "idle") return false;

  const recoveryElapsed =
    player.combatPhase === "recovery"
      ? MELEE_RECOVERY_SECONDS * player.cooldownMult - player.combatTimer
      : 0;
  const canCancelMelee =
    player.combatPhase === "recovery" &&
    recoveryElapsed >= MELEE_DODGE_CANCEL_AFTER;
  if (player.combatPhase !== "idle" && !canCancelMelee) return false;

  if (player.stamina < DODGE_STAMINA_COST) {
    setStaminaFailMessage(state);
    return false;
  }

  if (canCancelMelee) {
    finishMeleeAttack(state);
  }

  const direction = dodgeDirection(state);
  player.stamina -= DODGE_STAMINA_COST;
  player.staminaRegenDelay = STAMINA_REGEN_DELAY_SECONDS;
  player.dodgePhase = "dodging";
  player.dodgeTimer = DODGE_DURATION_SECONDS;
  player.dodgeDirection = direction;
  player.facing = direction;
  player.moving = false;
  sfx("dodge");
  startCameraShake(state, 0.07, 2);
  spawnParticles(state, player.pos, 8, "#c8d8e8", {
    speed: 70,
    size: 2.4,
  });
  return true;
}

function updateDodge(state: GameState, dt: number): boolean {
  const { player, world } = state;
  if (player.dodgePhase === "idle") return false;
  player.moving = false;

  if (player.dodgePhase === "recovery") {
    player.dodgeTimer = Math.max(0, player.dodgeTimer - dt);
    if (player.dodgeTimer <= 0) {
      player.dodgePhase = "idle";
      player.dodgeTimer = 0;
    }
    return true;
  }

  const elapsedBefore = DODGE_DURATION_SECONDS - player.dodgeTimer;
  player.dodgeTimer = Math.max(0, player.dodgeTimer - dt);
  const elapsedAfter = DODGE_DURATION_SECONDS - player.dodgeTimer;
  if (
    elapsedAfter >= DODGE_INVULN_START &&
    elapsedBefore <= DODGE_INVULN_END
  ) {
    player.invuln = Math.max(player.invuln, dt + 0.04);
  }
  player.pos.x = clamp(
    player.pos.x + player.dodgeDirection.x * DODGE_SPEED * dt,
    player.radius,
    world.width - player.radius,
  );
  player.pos.y = clamp(
    player.pos.y + player.dodgeDirection.y * DODGE_SPEED * dt,
    player.radius,
    world.height - player.radius,
  );
  if (state.phase === "playing") applyRiverCurrent(player.pos, dt, 0.7);
  if (player.dodgeTimer <= 0) {
    player.dodgePhase = "recovery";
    player.dodgeTimer = DODGE_RECOVERY_SECONDS;
  }
  return true;
}

const ATTACK_AUTO_FACE_RANGE = 130;
const PARRY_AUTO_FACE_RANGE = 160;

function facePlayerToward(
  state: GameState,
  targetPos: Vector2,
): boolean {
  const direction = normalize({
    x: targetPos.x - state.player.pos.x,
    y: targetPos.y - state.player.pos.y,
  });

  if (direction.x === 0 && direction.y === 0) return false;

  state.player.facing = direction;
  return true;
}

function autoFaceNearestEnemy(
  state: GameState,
  maxRange: number,
): boolean {
  const { player, world } = state;
  let bestPos: Vector2 | null = null;
  let bestDistance = maxRange;

  for (const wolf of world.wolves) {
    if (!wolf.alive) continue;

    const distance = dist(player.pos, wolf.pos);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestPos = wolf.pos;
    }
  }

  for (const thief of world.thieves) {
    if (!thief.alive) continue;

    const distance = dist(player.pos, thief.pos);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestPos = thief.pos;
    }
  }

  if (inShulmasSpirit(state)) {
    for (const enemy of world.firstRoute.enemies) {
      if (!enemy.alive) continue;

      const distance = dist(player.pos, enemy.pos);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestPos = enemy.pos;
      }
    }
  }

  const boss = world.tumurShulmas;
  if (boss.active && !boss.defeated && boss.phase !== "death") {
    const distance = dist(player.pos, boss.pos);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestPos = boss.pos;
    }
  }

  return bestPos ? facePlayerToward(state, bestPos) : false;
}

function isParryThreat(wolf: Wolf): boolean {
  const enemy = getWolfCombatState(wolf);

  if (
    enemy.attackPhase !== "windup" &&
    enemy.attackPhase !== "leaping"
  ) {
    return false;
  }

  // Bear grab ni dodge-only attack.
  return enemy.attackKind !== "bearGrab";
}

function autoFaceParryThreat(state: GameState): boolean {
  const { player, world } = state;
  let bestPos: Vector2 | null = null;
  let bestDistance = PARRY_AUTO_FACE_RANGE;

  for (const wolf of world.wolves) {
    if (!wolf.alive || !isParryThreat(wolf)) continue;

    const distance = dist(player.pos, wolf.pos);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestPos = wolf.pos;
    }
  }

  if (inShulmasSpirit(state)) {
    for (const enemy of world.firstRoute.enemies) {
      if (!isRouteEnemyParryThreat(enemy)) continue;

      const distance = dist(player.pos, enemy.pos);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestPos = enemy.pos;
      }
    }
  }

  const boss = world.tumurShulmas;
  if (isTumurShulmasParryThreat(state)) {
    const distance = dist(player.pos, boss.pos);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestPos = boss.pos;
    }
  }

  return bestPos ? facePlayerToward(state, bestPos) : false;
}

function isInMeleeCone(
  playerPos: Vector2,
  targetPos: Vector2,
  facing: Vector2,
  reach: number,
): boolean {
  const distance = dist(playerPos, targetPos);
  if (distance > reach) return false;
  if (distance <= 0.001) return true;

  const toTarget = normalize({
    x: targetPos.x - playerPos.x,
    y: targetPos.y - playerPos.y,
  });
  const attackDirection = safeFacing(facing);
  const dot = toTarget.x * attackDirection.x + toTarget.y * attackDirection.y;

  return dot >= MELEE_FACING_DOT_MIN;
}

function updateStamina(state: GameState, dt: number): void {
  const { player } = state;

  if (!Number.isFinite(dt) || dt <= 0) return;

  player.staminaRegenDelay = Math.max(0, player.staminaRegenDelay - dt);

  if (
    player.combatPhase === "idle" &&
    player.dodgePhase === "idle" &&
    player.parryPhase === "idle" &&
    player.staminaRegenDelay <= 0 &&
    player.stamina < player.maxStamina
  ) {
    const regenMult = player.staminaRegenMult ?? 1;
    player.stamina = Math.min(
      player.maxStamina,
      player.stamina + STAMINA_REGEN_PER_SECOND * regenMult * dt,
    );
  }
}

function beginParry(state: GameState): boolean {
  const { player } = state;

  if (player.parryPhase !== "idle") return false;
  if (player.combatPhase !== "idle") return false;
  if (player.dodgePhase !== "idle") return false;

  if (player.stamina < PARRY_STAMINA_COST) {
    setStaminaFailMessage(state);
    return false;
  }

  // L дарахад parry хийж болох дайсан руу нэг удаа автоматаар харна.
  autoFaceParryThreat(state);

  player.stamina = Math.max(0, player.stamina - PARRY_STAMINA_COST);
  player.staminaRegenDelay = STAMINA_REGEN_DELAY_SECONDS;
  player.parryPhase = "startup";
  player.parryTimer = PARRY_STARTUP_SECONDS;

  // Parry input buffer: active pose нь чоно мөргөх мөчтэй давхцвал амжилттай.
  // Улаан indicator хамгийн найдвартай timing хэвээр, харин арай эрт дарсан
  // input active window-д үлдэж чадвал parry болно.
  player.parryArmed = true;

  return true;
}

function enterParryActive(state: GameState): void {
  state.player.parryPhase = "active";
  state.player.parryTimer = PARRY_ACTIVE_SECONDS;
}

function enterParryRecovery(state: GameState): void {
  state.player.parryPhase = "recovery";
  state.player.parryTimer = PARRY_RECOVERY_SECONDS;
  state.player.parryArmed = false;
}

function finishParry(state: GameState): void {
  state.player.parryPhase = "idle";
  state.player.parryTimer = 0;
  state.player.parryArmed = false;
}

function updateParryPhases(state: GameState, dt: number): void {
  const { player } = state;

  if (!Number.isFinite(dt) || dt <= 0) return;

  let remaining = dt;
  let transitions = 0;

  while (
    remaining > 0 &&
    player.parryPhase !== "idle" &&
    transitions < 4
  ) {
    const currentPhase = player.parryPhase;
    const phaseTime = Math.max(0, player.parryTimer);

    if (phaseTime > remaining) {
      player.parryTimer = phaseTime - remaining;
      break;
    }

    remaining -= phaseTime;
    player.parryTimer = 0;
    transitions += 1;

    switch (currentPhase) {
      case "startup":
        enterParryActive(state);
        break;
      case "active":
        enterParryRecovery(state);
        break;
      case "recovery":
        finishParry(state);
        break;
    }
  }
}

function beginMeleeAttack(state: GameState): boolean {
  const { player } = state;

  if (player.combatPhase !== "idle") return false;
  if (player.dodgePhase !== "idle") return false;
  if (player.parryPhase !== "idle") return false;
  if (player.attackCooldown > 0) return false;

  const staminaCost = meleeStaminaCost(state);
  if (player.stamina < staminaCost) {
    setStaminaFailMessage(state);
    return false;
  }

  // J дарахад 130px доторх хамгийн ойр дайсан руу нэг удаа харна.
  autoFaceNearestEnemy(state, ATTACK_AUTO_FACE_RANGE);

  player.stamina = Math.max(0, player.stamina - staminaCost);
  player.staminaRegenDelay = STAMINA_REGEN_DELAY_SECONDS;
  player.attackVariant = ((player.attackVariant + 1) % 3) as AttackVariant;

  player.combatPhase = "startup";
  player.combatTimer = MELEE_STARTUP_SECONDS * player.cooldownMult;
  player.attackHitDone = false;
  player.attackFacing = safeFacing(player.facing);

  player.attackMelee = true;
  player.attackAnim =
    (MELEE_STARTUP_SECONDS + MELEE_ACTIVE_SECONDS + MELEE_RECOVERY_SECONDS) *
    player.cooldownMult;
  player.attackCooldown = player.attackAnim;

  return true;
}

function resolveMeleeHit(state: GameState): void {
  const { player, world } = state;
  const heavyAttack = player.attackVariant === 2;
  const reach = meleeReach(state, heavyAttack) * player.reachMult;
  const weaponDamage = meleeBaseDamage(state) * player.damageMult;
  const postureMultiplier = meleePostureMultiplier(state);

  let nearestWolf: Wolf | null = null;
  let nearestThief: Thief | null = null;
  let nearestRouteEnemy: RouteEnemy | null = null;
  let nearestTumurShulmas = false;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const wolf of world.wolves) {
    if (!wolf.alive) continue;
    if (
      !isInMeleeCone(
        player.pos,
        wolf.pos,
        player.attackFacing,
        reach + wolf.radius * wolf.scale,
      )
    ) {
      continue;
    }

    const distance = dist(player.pos, wolf.pos);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestWolf = wolf;
      nearestThief = null;
      nearestRouteEnemy = null;
      nearestTumurShulmas = false;
    }
  }

  for (const thief of world.thieves) {
    if (!thief.alive) continue;
    if (
      !isInMeleeCone(
        player.pos,
        thief.pos,
        player.attackFacing,
        reach + thief.radius,
      )
    ) {
      continue;
    }

    const distance = dist(player.pos, thief.pos);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestThief = thief;
      nearestWolf = null;
      nearestRouteEnemy = null;
      nearestTumurShulmas = false;
    }
  }

  if (inShulmasSpirit(state)) {
    for (const enemy of world.firstRoute.enemies) {
      if (!enemy.alive) continue;
      // Нар тэнгэрт — ойрын цохилтоор оноохгүй
      if (enemy.kind === "zurgaanNar") continue;
      if (
        !isInMeleeCone(
          player.pos,
          enemy.pos,
          player.attackFacing,
          reach + player.radius + enemy.radius,
        )
      ) {
        continue;
      }

      const distance = dist(player.pos, enemy.pos);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestRouteEnemy = enemy;
        nearestWolf = null;
        nearestThief = null;
        nearestTumurShulmas = false;
      }
    }
  }

  const boss = world.tumurShulmas;
  if (
    boss.active &&
    !boss.defeated &&
    boss.phase !== "death" &&
    isInMeleeCone(
      player.pos,
      boss.pos,
      player.attackFacing,
      reach + player.radius + 42,
    )
  ) {
    const distance = dist(player.pos, boss.pos);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestTumurShulmas = true;
      nearestRouteEnemy = null;
      nearestWolf = null;
      nearestThief = null;
    }
  }

  if (nearestTumurShulmas) {
    const heavyHit = player.attackVariant === 2;
    const bossDamage = (heavyHit ? 48 : 34) * player.damageMult;
    const bossPostureDamage = Math.round(
      (heavyHit ? 28 : 16) * postureMultiplier,
    );
    damageTumurShulmasFromPlayer(
      state,
      bossDamage,
      bossPostureDamage,
      heavyHit,
    );
    return;
  }

  if (nearestRouteEnemy) {
    const heavyHit = player.attackVariant === 2;

    if (
      nearestRouteEnemy.kind === "shulmasynBaatar" &&
      nearestRouteEnemy.phase === "stunned"
    ) {
      const counterDamage = Math.max(
        70,
        Math.round(nearestRouteEnemy.maxHp * 0.25),
      );
      state.fx.shake = Math.max(state.fx.shake, 11);
      triggerHitStop(state, 0.1);
      spawnImpactBurst(state, nearestRouteEnemy.pos, {
        heavy: true,
        color: "#ffe08a",
      });
      spawnParticles(state, nearestRouteEnemy.pos, 24, "#ffe08a", {
        speed: 170,
        size: 3.3,
      });
      spawnText(
        state,
        nearestRouteEnemy.pos,
        trFormat("СӨРӨГ ЦОХИЛТ! −{dmg}", { dmg: counterDamage }),
        "#fff0a8",
      );
      damageRouteEnemy(state, nearestRouteEnemy, counterDamage, "melee");

      if (nearestRouteEnemy.alive) {
        nearestRouteEnemy.posture = Math.max(
          1,
          nearestRouteEnemy.maxPosture * 0.42,
        );
        nearestRouteEnemy.postureRegenDelay = 1.6;
        nearestRouteEnemy.phase = "recovery";
        nearestRouteEnemy.phaseTimer = 1.05;
        nearestRouteEnemy.attackCooldown = 1.2;
        nearestRouteEnemy.attackHitDone = true;
      }
      return;
    }

    const postureDamage = Math.round((heavyHit ? 23 : 13) * postureMultiplier);
    addMeleeImpact(state, nearestRouteEnemy.pos, "#b65a45", heavyHit);
    damageRouteEnemyPosture(state, nearestRouteEnemy, postureDamage);
    damageRouteEnemy(state, nearestRouteEnemy, weaponDamage, "melee");
    return;
  }

  if (nearestWolf) {
    const combatWolf = getWolfCombatState(nearestWolf);

    if (
      nearestWolf.kind === "wolf" &&
      combatWolf.attackPhase === "stunned"
    ) {
      state.fx.shake = Math.max(state.fx.shake, 7);
      triggerHitStop(state, EXECUTION_HIT_STOP_SECONDS);
      spawnImpactBurst(state, nearestWolf.pos, {
        heavy: true,
        color: "#ffe08a",
      });
      spawnText(state, nearestWolf.pos, "ТӨГСГӨЛ!", "#ffe08a");
      damageWolf(
        state,
        nearestWolf,
        nearestWolf.hp + nearestWolf.maxHp + 1,
      );
      return;
    }

    if (
      nearestWolf.kind === "bear" &&
      combatWolf.attackPhase === "stunned"
    ) {
      const counterDamage = Math.max(
        1,
        nearestWolf.maxHp * 0.25,
      );

      state.fx.shake = Math.max(state.fx.shake, 9);
      triggerHitStop(state, EXECUTION_HIT_STOP_SECONDS);
      spawnImpactBurst(state, nearestWolf.pos, {
        heavy: true,
        color: "#ffe08a",
      });
      spawnParticles(state, nearestWolf.pos, 20, "#ffe08a", {
        speed: 165,
        size: 3,
      });
      spawnText(
        state,
        nearestWolf.pos,
        trFormat("СӨРӨГ ЦОХИЛТ! −{dmg}", { dmg: Math.round(counterDamage) }),
        "#ffe08a",
      );

      // Нэг parry-аас зөвхөн нэг удаа max HP-ийн 1/4 damage орно.
      combatWolf.attackPhase = "recovery";
      combatWolf.attackTimer = 0.9;
      combatWolf.attackHitDone = true;
      nearestWolf.posture = nearestWolf.maxPosture;
      nearestWolf.postureRegenDelay = 0;
      nearestWolf.attackCooldown = Math.max(
        nearestWolf.attackCooldown,
        1.35,
      );

      damageWolf(state, nearestWolf, counterDamage);
      return;
    }

    const away = normalize({
      x: nearestWolf.pos.x - player.pos.x,
      y: nearestWolf.pos.y - player.pos.y,
    });

    const rawKnockback = nearestWolf.kind === "bear" ? 12 : 30;
    const knockback =
      rawKnockback * (1 - clamp(nearestWolf.knockbackResistance ?? 0, 0, 0.85));

    nearestWolf.pos.x = clamp(
      nearestWolf.pos.x + away.x * knockback,
      nearestWolf.radius,
      WORLD_W - nearestWolf.radius,
    );
    nearestWolf.pos.y = clamp(
      nearestWolf.pos.y + away.y * knockback,
      nearestWolf.radius,
      WORLD_H - nearestWolf.radius,
    );

    const heavyHit = player.attackVariant === 2;
    const basePostureDamage =
      nearestWolf.kind === "bear"
        ? heavyHit
          ? BEAR_HEAVY_POSTURE_DAMAGE
          : BEAR_NORMAL_POSTURE_DAMAGE
        : heavyHit
          ? WOLF_HEAVY_POSTURE_DAMAGE
          : WOLF_NORMAL_POSTURE_DAMAGE;
    const postureDamage = Math.round(
      basePostureDamage * postureMultiplier,
    );

    addMeleeImpact(
      state,
      nearestWolf.pos,
      "#c03030",
      heavyHit,
    );
    damageEnemyPosture(state, nearestWolf, postureDamage);
    damageWolf(state, nearestWolf, meleeWolfDamage(state) * player.damageMult);
    return;
  }

  if (nearestThief) {
    const away = normalize({
      x: nearestThief.pos.x - player.pos.x,
      y: nearestThief.pos.y - player.pos.y,
    });

    nearestThief.pos.x = clamp(
      nearestThief.pos.x + away.x * 32,
      nearestThief.radius,
      WORLD_W - nearestThief.radius,
    );
    nearestThief.pos.y = clamp(
      nearestThief.pos.y + away.y * 32,
      nearestThief.radius,
      WORLD_H - nearestThief.radius,
    );

    const heavyHit = player.attackVariant === 2;
    addMeleeImpact(
      state,
      nearestThief.pos,
      "#7050a0",
      heavyHit,
    );
    damageThief(state, nearestThief, weaponDamage);
  }
}

function enterActivePhase(state: GameState): void {
  const { player } = state;

  player.combatPhase = "active";
  player.combatTimer = MELEE_ACTIVE_SECONDS * player.cooldownMult;
  sfx("swing");

  if (!player.attackHitDone) {
    resolveMeleeHit(state);
    player.attackHitDone = true;
  }
}

function enterRecoveryPhase(state: GameState): void {
  const { player } = state;

  player.combatPhase = "recovery";
  player.combatTimer = MELEE_RECOVERY_SECONDS * player.cooldownMult;
}

function finishMeleeAttack(state: GameState): void {
  const { player } = state;

  player.combatPhase = "idle";
  player.combatTimer = 0;
  player.attackHitDone = false;
  player.attackMelee = false;
}

/**
 * Startup → active → recovery фазуудыг шинэчилнэ.
 * Том dt ирсэн ч нэг довтолгоо нэг л удаа хохирол өгнө.
 */
function updateMeleePhases(state: GameState, dt: number): void {
  const { player } = state;

  if (!Number.isFinite(dt) || dt <= 0) return;

  let remaining = dt;
  let transitions = 0;

  while (remaining > 0 && transitions < 4) {
    const currentPhase = player.combatPhase;

    if (currentPhase === "idle") {
      break;
    }

    const phaseTime = Math.max(0, player.combatTimer);

    if (phaseTime > remaining) {
      player.combatTimer = phaseTime - remaining;
      break;
    }

    remaining -= phaseTime;
    player.combatTimer = 0;
    transitions += 1;

    switch (currentPhase) {
      case "startup":
        enterActivePhase(state);
        break;

      case "active":
        enterRecoveryPhase(state);
        break;

      case "recovery":
        finishMeleeAttack(state);
        break;
    }
  }
}

function fireRangedProjectile(state: GameState): boolean {
  const { player, world } = state;

  if (player.combatPhase !== "idle") return false;
  if (player.dodgePhase !== "idle") return false;
  if (player.parryPhase !== "idle") return false;
  if (player.attackCooldown > 0) return false;

  const bow = player.gear.bow && player.tool === "bow";
  const spiritBolt =
    !player.gear.bow && state.phase === "spirit" && player.tool === "bow";
  if (!bow && !spiritBolt) return false;

  if (bow && player.inventory.arrows <= 0) {
    setMessage(
      state,
      "Сум алга — урлалаар хий (1 мод + 1 чулуу = 2 сум).",
      2.5,
    );
    return false;
  }

  const range = spiritBolt ? 240 : inShulmasSpirit(state) ? 360 : 200;

  player.attackCooldown =
    (spiritBolt ? 0.48 : 0.55) * player.cooldownMult;
  player.attackMelee = false;
  player.attackAnim = 0.18;

  let dir = safeFacing(player.facing);
  let bestDistance = range;

  for (const wolf of world.wolves) {
    if (!wolf.alive) continue;
    const distance = dist(player.pos, wolf.pos);
    if (distance < bestDistance) {
      bestDistance = distance;
      dir = normalize({
        x: wolf.pos.x - player.pos.x,
        y: wolf.pos.y - player.pos.y,
      });
    }
  }

  for (const thief of world.thieves) {
    if (!thief.alive) continue;
    const distance = dist(player.pos, thief.pos);
    if (distance < bestDistance) {
      bestDistance = distance;
      dir = normalize({
        x: thief.pos.x - player.pos.x,
        y: thief.pos.y - player.pos.y,
      });
    }
  }

  if (inShulmasSpirit(state)) {
    for (const enemy of world.firstRoute.enemies) {
      if (!enemy.alive) continue;
      const targetPos =
        enemy.kind === "zurgaanNar"
          ? zurgaanNarSkyWorldPos(state, enemy)
          : enemy.pos;
      const distance = dist(player.pos, targetPos);
      if (distance < bestDistance) {
        bestDistance = distance;
        dir = normalize({
          x: targetPos.x - player.pos.x,
          y: targetPos.y - player.pos.y,
        });
      }
    }
  }

  const boss = world.tumurShulmas;
  if (boss.active && !boss.defeated && boss.phase !== "death") {
    const distance = dist(player.pos, boss.pos);
    if (distance < bestDistance) {
      bestDistance = distance;
      dir = normalize({
        x: boss.pos.x - player.pos.x,
        y: boss.pos.y - player.pos.y,
      });
    }
  }

  dir = safeFacing(dir);

  if (bow) player.inventory.arrows -= 1;

  const speed = spiritBolt ? 420 : 400;
  world.projectiles.push({
    pos: {
      x: player.pos.x + dir.x * 14,
      y: player.pos.y - 8 + dir.y * 14,
    },
    vel: { x: dir.x * speed, y: dir.y * speed },
    dmg: (spiritBolt ? 22 : 24) * player.damageMult,
    life: range / speed + 0.15,
    kind: spiritBolt ? "spiritBolt" : "arrow",
  });

  sfx("shoot");
  return true;
}

/** Чулуу шидэх — hotbar-д чулуу сонгоод J */
function tryThrowStone(state: GameState): boolean {
  const { player, world } = state;
  if (player.tool !== "stone") return false;
  if (player.combatPhase !== "idle") return false;
  if (player.dodgePhase !== "idle") return false;
  if (player.parryPhase !== "idle") return false;
  if (player.attackCooldown > 0) return false;
  if (player.inventory.stone <= 0) {
    setMessage(state, "Чулуу алга.", 1.6);
    return false;
  }

  player.inventory.stone -= 1;
  player.attackCooldown = 0.42 * player.cooldownMult;
  player.attackMelee = false;
  player.attackAnim = 0.16;

  let dir = safeFacing(player.facing);
  const range = 160;
  let bestDistance = range;

  const consider = (pos: Vector2) => {
    const distance = dist(player.pos, pos);
    if (distance >= bestDistance || distance < 8) return;
    bestDistance = distance;
    dir = normalize({
      x: pos.x - player.pos.x,
      y: pos.y - player.pos.y,
    });
  };

  for (const wolf of world.wolves) {
    if (wolf.alive) consider(wolf.pos);
  }
  for (const thief of world.thieves) {
    if (thief.alive) consider(thief.pos);
  }
  for (const animal of world.flock.visuals) {
    consider(animal.pos);
  }
  if (world.dog) consider(world.dog.pos);
  if (world.mountHorse && !player.riding) consider(world.mountHorse.pos);
  for (const horse of world.wildHorses) {
    consider(horse.pos);
  }
  for (const fish of world.fish) {
    consider(fish.pos);
  }
  if (state.parents) {
    if (!state.parents.father.insideGer) consider(state.parents.father.pos);
    if (!state.parents.mother.insideGer) consider(state.parents.mother.pos);
  }
  consider(world.elder.pos);

  dir = safeFacing(dir);

  const speed = 320;
  world.projectiles.push({
    pos: {
      x: player.pos.x + dir.x * 12,
      y: player.pos.y - 10 + dir.y * 12,
    },
    vel: { x: dir.x * speed, y: dir.y * speed },
    // Нумтай ойролцоо хүч (нум 24)
    dmg: 22 * player.damageMult,
    life: range / speed + 0.12,
    kind: "stone",
  });

  sfx("stone");
  spawnParticles(
    state,
    { x: player.pos.x + dir.x * 10, y: player.pos.y - 8 },
    3,
    "#9a9488",
    { speed: 50, size: 2 },
  );
  return true;
}

function livestockHitSfx(kind: LivestockKind): void {
  if (kind === "cattle" || kind === "camel") sfx("moo");
  else if (kind === "horse") sfx("neigh");
  else sfx("baa");
}

/** Чулуу — эцэг эх / нохой / морь / мал руу онох (амь хасдаггүй) */
function tryStoneBonkFriendly(
  state: GameState,
  projectile: Projectile,
): boolean {
  if (projectile.kind !== "stone") return false;
  const { world, player } = state;
  const pos = projectile.pos;

  const bump = (target: Vector2, vel?: Vector2, strength = 95) => {
    const away = normalize({
      x: target.x - pos.x,
      y: target.y - pos.y,
    });
    if (vel) {
      vel.x += away.x * strength;
      vel.y += away.y * strength;
    }
    spawnParticles(state, target, 5, "#9a9488", { speed: 70, size: 2.4 });
    sfx("hit");
  };

  for (const animal of world.flock.visuals) {
    if (dist(pos, animal.pos) < animal.radius + 8) {
      animal.flash = 0.28;
      bump(animal.pos, animal.vel);
      livestockHitSfx(animal.kind);
      return true;
    }
  }

  const dog = world.dog;
  if (dog && dist(pos, dog.pos) < 16) {
    dog.flash = 0.28;
    bump(dog.pos, dog.vel);
    sfx("bark");
    return true;
  }

  if (state.parents) {
    for (const parent of [state.parents.father, state.parents.mother]) {
      if (parent.insideGer) continue;
      if (dist(pos, parent.pos) < 18) {
        parent.hitFlash = 0.85;
        parent.moving = false;
        parent.workPulse = 0;
        parent.walkTarget = null;
        bump(parent.pos);
        sfx("yell");
        spawnText(
          state,
          { x: parent.pos.x, y: parent.pos.y - 22 },
          parent.role === "father" ? "Аа!" : "Ээ!",
          "#ffb090",
        );
        return true;
      }
    }
  }

  const elder = world.elder;
  if (dist(pos, elder.pos) < 22) {
    elder.hitFlash = 0.9;
    bump(elder.pos);
    sfx("yell");
    spawnText(
      state,
      { x: elder.pos.x, y: elder.pos.y - 26 },
      "Өө!",
      "#e8d0a8",
    );
    return true;
  }

  const mh = world.mountHorse;
  if (mh && !player.riding && dist(pos, mh.pos) < 22) {
    mh.flash = 0.28;
    bump(mh.pos);
    sfx("neigh");
    return true;
  }

  for (const horse of world.wildHorses) {
    if (dist(pos, horse.pos) < horse.radius + 10) {
      horse.spooked = Math.max(horse.spooked, 1.4);
      bump(horse.pos, horse.vel, 120);
      sfx("neigh");
      return true;
    }
  }

  for (const fish of world.fish) {
    if (dist(pos, fish.pos) < fish.radius + 8) {
      fish.spook = Math.max(fish.spook, 1.2);
      bump(fish.pos, fish.vel, 70);
      return true;
    }
  }

  return false;
}

/**
 * Hold J (нум) — charge; бүрэн болсон үед харвана.
 * Суллах хүртэл дахин charge эхлэхгүй.
 */
function updateBowCharge(state: GameState, dt: number): boolean {
  const { player, input } = state;
  const bow = player.gear.bow && player.tool === "bow";
  const spiritBolt =
    !player.gear.bow && state.phase === "spirit" && player.tool === "bow";
  const canShoot =
    (bow || spiritBolt) &&
    player.combatPhase === "idle" &&
    player.dodgePhase === "idle" &&
    player.parryPhase === "idle" &&
    player.attackCooldown <= 0;

  if (!input.shoot) {
    player.bowCharge = 0;
    player.bowChargeLock = false;
    return false;
  }

  if (!bow && !spiritBolt) {
    player.bowCharge = 0;
    player.bowChargeLock = false;
    return false;
  }

  if (!canShoot) {
    player.bowCharge = 0;
    return false;
  }

  if (player.bowChargeLock) {
    return false;
  }

  if (bow && player.inventory.arrows <= 0) {
    setMessage(
      state,
      "Сум алга — урлалаар хий (1 мод + 1 чулуу = 2 сум).",
      2.5,
    );
    player.bowCharge = 0;
    return false;
  }

  player.bowCharge = Math.min(
    1,
    player.bowCharge + dt / BOW_CHARGE_SECONDS,
  );

  if (player.bowCharge < 1) return false;

  if (fireRangedProjectile(state)) {
    player.bowCharge = 0;
    player.bowChargeLock = true;
    return true;
  }
  player.bowCharge = 0;
  return false;
}

/**
 * Тулааны таймер — playing ба spirit хоёуланд updateCombat дуудагдана.
 * (updateSurvival зөвхөн playing дээр ажилладаг тул энд байх ёстой —
 *  үгүй бол spirit-д attackCooldown буурахгүй, J/K нэг удаа л ажиллана.)
 */
function tickCombatTimers(state: GameState, dt: number): void {
  const { player } = state;
  if (!Number.isFinite(dt) || dt <= 0) return;

  if (player.attackCooldown > 0) {
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  }
  if (player.attackAnim > 0) {
    player.attackAnim = Math.max(0, player.attackAnim - dt);
    if (player.attackAnim <= 0) {
      player.attackAnim = 0;
      player.attackMelee = false;
    }
  }
  if (player.invuln > 0) {
    player.invuln = Math.max(0, player.invuln - dt);
  }
}

/**
 * Engine game loop-оос frame бүр дуудна.
 *
 * 1. Тулааны таймер (cooldown / anim / invuln)
 * 2. Тэнхэлийн regeneration
 * 3. Одоогийн melee / dodge / parry phase
 * 4. Buffered J/Space/Shift оролт (recovery үед алдахгүй)
 */
export function updateCombat(state: GameState, dt: number): void {
  tickCombatTimers(state, dt);
  updateStamina(state, dt);
  queueCombatInputs(state);
  tickCombatBuffers(state, dt);

  const buffers = getCombatBuffers(state);
  const { player, input } = state;

  // Dodge — recovery cancel + buffer-тай хамгийн өндөр ач холбогдол
  if (buffers.dodge > 0 || input.dodge || input.dodgePressed) {
    if (beginDodge(state)) {
      buffers.dodge = 0;
      input.dodge = false;
      input.dodgePressed = false;
    }
  }

  if (updateDodge(state, dt)) {
    state.combatDodgeActive = state.player.dodgePhase === "dodging";
    state.combatMovementLocked = !state.combatDodgeActive;
    return;
  }
  state.combatDodgeActive = false;

  updateParryPhases(state, dt);
  updateMeleePhases(state, dt);

  // Цохих үед алхаж болно — зөвхөн parry түгжинэ
  state.combatMovementLocked = player.parryPhase !== "idle";

  if (player.parryPhase !== "idle") return;

  if (player.combatPhase === "idle") {
    if (buffers.parry > 0 || input.parry || input.parryPressed) {
      if (beginParry(state)) {
        buffers.parry = 0;
        input.parry = false;
        input.parryPressed = false;
        state.combatMovementLocked = true;
        return;
      }
    }
  }

  if (player.combatPhase !== "idle") return;

  if (updateBowCharge(state, dt)) return;

  // J — ойр хашаа нураах (дайсан ойрхон үед тулаанд өгнө)
  const wantsAttack =
    buffers.attack > 0 || input.attack || input.attackPressed;
  if (
    wantsAttack &&
    !threatsNearPlayer(state, FENCE_DEMOLISH_THREAT_RADIUS) &&
    tryDemolishFence(state)
  ) {
    buffers.attack = 0;
    input.attack = false;
    input.attackPressed = false;
    return;
  }

  if (!wantsAttack) return;

  if (player.tool === "stone") {
    if (tryThrowStone(state)) {
      buffers.attack = 0;
      input.attack = false;
      input.attackPressed = false;
    }
    return;
  }

  if (beginMeleeAttack(state)) {
    buffers.attack = 0;
    input.attack = false;
    input.attackPressed = false;
  }
}

export function damageWolf(state: GameState, wolf: Wolf, dmg: number): void {
  const isOpeningStoryWolf = state.story.storyWolfId === wolf.id;
  const storyTutorialProtected =
    isOpeningStoryWolf &&
    state.story.milestone3Completed &&
    !state.story.milestone4Completed &&
    (!state.story.storyWolfParryCompleted ||
      wolf.attackPhase !== "stunned");
  const storyProtected =
    isOpeningStoryWolf &&
    (!state.story.milestone3Completed || storyTutorialProtected);
  if (!storyProtected) wolf.hp -= dmg;
  wolf.flash = 0.12;
  sfx("hit");
  spawnParticles(state, wolf.pos, 8, "#c03030", { speed: 100 });

  if (storyProtected) {
    wolf.hp = Math.max(1, wolf.hp);
    wolf.alive = true;
    wolf.deathTimer = 0;
    return;
  }

  if (isOpeningStoryWolf && wolf.attackPhase === "stunned") {
    state.story.storyWolfCounterCompleted = true;
    state.story.storyWolfOpeningActive = false;
  }

  if (wolf.hp <= 0) {
    const bear = wolf.kind === "bear";
    const score = bear ? 60 : 25;
    const xp = bear ? 45 : 22;
    wolf.alive = false;
    wolf.deathTimer = WOLF_CORPSE_DURATION;
    if (isOpeningStoryWolf) state.story.storyWolfDefeated = true;
    sfx(bear ? "kill" : "wolfDeath");
    state.score += score;
    spawnSoulRelease(
      state,
      wolf.pos,
      wolf.radius * wolf.scale,
      bear ? "#e8f2ff" : "#d8f4ff",
    );
    spawnText(state, wolf.pos, `+${score} · +${xp} XP`, "#ffd060");
    gainXp(state, xp);
    if (isOpeningStoryWolf) {
      state.player.vitals.health = Math.min(
        state.player.vitals.maxHealth,
        state.player.vitals.health + 22,
      );
      spawnText(state, state.player.pos, "+22 HP", "#a8e080");
      setMessage(state, "Чоно унав! Голомтын дэргэд өвгөн дээр оч.", 4.5);
    } else {
      const nearbyThreats =
        state.world.wolves.filter((w) => w.alive).length +
        state.world.thieves.filter((t) => t.alive).length;
      if (nearbyThreats > 0) {
        setMessage(
          state,
          bear
            ? "Баавгайн сүнс одлоо — ойрхон аюул үлдлээ."
            : "Чонын сүнс одлоо — ойрхон аюул үлдлээ.",
          2.8,
        );
      } else {
        setMessage(
          state,
          bear ? "Баавгайн сүнс одлоо." : "Чонын сүнс одлоо.",
          2.4,
        );
      }
    }
  }
}

/** Хулгайчид хохирол өгөх */
export function damageThief(state: GameState, thief: Thief, dmg: number): void {
  thief.hp -= dmg;
  thief.flash = 0.12;
  sfx("hit");
  spawnParticles(state, thief.pos, 8, "#7050a0", { speed: 100 });

  if (thief.hp <= 0) {
    thief.alive = false;
    sfx("kill");
    spawnSoulRelease(state, thief.pos, thief.radius, "#decfff");
    const recovered = thief.stolen;
    const xp = 30 + recovered * 2;
    thief.stolen = 0;
    addSheep(state, recovered);
    state.score += recovered * 15;
    spawnText(
      state,
      thief.pos,
      trFormat("+{n} хонь · +{xp} XP", { n: recovered, xp }),
      "#b8e8a0",
    );
    gainXp(state, xp);
    setMessage(
      state,
      trFormat("Мал буцааж авлаа! +{n} хонь", { n: recovered }),
      3,
    );
  }
}

/** Сумнуудын хөдөлгөөн ба мөргөлт (weapons.ts-тай ижил зорилтот) */
export function updateProjectiles(state: GameState, dt: number): void {
  const { world } = state;

  if (world.mountHorse) {
    const flash = world.mountHorse.flash ?? 0;
    if (flash > 0) world.mountHorse.flash = Math.max(0, flash - dt);
    else if (typeof world.mountHorse.flash !== "number") {
      world.mountHorse.flash = 0;
    }
  }

  for (const projectile of world.projectiles) {
    projectile.pos.x += projectile.vel.x * dt;
    projectile.pos.y += projectile.vel.y * dt;
    projectile.life -= dt;
    if (projectile.life <= 0) continue;

    let consumed = false;

    for (const wolf of world.wolves) {
      if (!wolf.alive) continue;
      if (dist(projectile.pos, wolf.pos) < wolf.radius * wolf.scale + 5) {
        damageWolf(state, wolf, projectile.dmg);
        consumed = true;
        break;
      }
    }

    if (!consumed) {
      for (const thief of world.thieves) {
        if (!thief.alive) continue;
        if (dist(projectile.pos, thief.pos) < thief.radius + 6) {
          damageThief(state, thief, projectile.dmg);
          consumed = true;
          break;
        }
      }
    }

    if (!consumed && inShulmasSpirit(state)) {
      const camX = clamp(
        state.player.pos.x - VIEW_W / 2,
        0,
        WORLD_W - VIEW_W,
      );
      const camY = clamp(
        state.player.pos.y - VIEW_H / 2,
        0,
        WORLD_H - VIEW_H,
      );
      const arrowScreen = {
        x: projectile.pos.x - camX,
        y: projectile.pos.y - camY,
      };

      for (const enemy of world.firstRoute.enemies) {
        if (!enemy.alive) continue;

        if (enemy.kind === "zurgaanNar") {
          // Тэнгэрийн нар — дэлгэцийн байрлалаар ононо
          const sunScreen = zurgaanNarSkyScreenPos(
            zurgaanNarSlotIndex(enemy),
            VIEW_W,
            VIEW_H,
            state.world.elapsed,
          );
          if (dist(arrowScreen, sunScreen) < enemy.radius + 22) {
            damageRouteEnemy(
              state,
              enemy,
              projectile.dmg,
              projectile.kind === "arrow"
                ? "arrow"
                : projectile.kind === "spiritBolt"
                  ? "spiritBolt"
                  : "other",
            );
            consumed = true;
            break;
          }
          continue;
        }

        if (dist(projectile.pos, enemy.pos) < enemy.radius + 6) {
          damageRouteEnemy(
            state,
            enemy,
            projectile.dmg,
            projectile.kind === "arrow"
              ? "arrow"
              : projectile.kind === "spiritBolt"
                ? "spiritBolt"
                : "other",
          );
          consumed = true;
          break;
        }
      }
    }

    if (!consumed) {
      const boss = world.tumurShulmas;
      if (
        boss.active &&
        !boss.defeated &&
        boss.phase !== "death" &&
        dist(projectile.pos, boss.pos) < 48
      ) {
        damageTumurShulmasFromPlayer(state, projectile.dmg, 10, false);
        consumed = true;
      }
    }

    if (!consumed && tryStoneBonkFriendly(state, projectile)) {
      consumed = true;
    }

    if (consumed) projectile.life = 0;
  }

  world.projectiles = world.projectiles.filter(
    (projectile) => projectile.life > 0,
  );
}

/** Хоньчин нохой — тоглогчийг дагана; N үед малыг тууна; чоно хөөж болно */
export function updateDog(state: GameState, dt: number): void {
  const dog = state.world.dog;
  if (!dog) return;

  dog.attackCooldown = Math.max(0, dog.attackCooldown - dt);
  dog.flash = Math.max(0, dog.flash - dt);
  dog.petTimer = Math.max(0, (dog.petTimer ?? 0) - dt);

  // Тайван үедээ аажмаар амиа нөхнө
  if (dog.hp < dog.maxHp) {
    dog.hp = Math.min(dog.maxHp, dog.hp + dt * 1.2);
  }

  // Илэж байхад тоглогч дэргэд зогсоод сүүл найлгана
  if (dog.petTimer > 0) {
    dog.vel = { x: 0, y: 0 };
    const dx = state.player.pos.x - dog.pos.x;
    if (Math.abs(dx) > 4) dog.face = dx < 0 ? -1 : 1;
    if (state.phase === "playing") applyRiverCurrent(dog.pos, dt, 0.55);
    pushOutOfGer(dog.pos, 12, state.world);
    return;
  }

  let prey: Wolf | null = null;
  let bestDistance = 320;

  for (const wolf of state.world.wolves) {
    if (!wolf.alive) continue;
    const distance = dist(dog.pos, wolf.pos);
    if (distance < bestDistance) {
      bestDistance = distance;
      prey = wolf;
    }
  }

  const herding = state.input.herd;
  const visuals = state.world.flock.visuals;
  // Ойрхон чоно байвал хөөх; бусад үед дагах эсвэл туух
  const threatRange = herding ? 150 : 200;
  const chasePrey =
    prey && bestDistance < threatRange ? prey : null;

  let target: Vector2 | null = null;
  let speed = 140;

  if (chasePrey) {
    target = chasePrey.pos;
    speed = 165;
  } else if (herding && visuals.length > 0) {
    // N — тоглогчид хамгийн ойр малын ард орж, ижил чигт тууна
    const drive = normalize(state.player.facing);
    let nearest = visuals[0];
    let nearestD = Infinity;
    for (const sheep of visuals) {
      const d = dist(sheep.pos, state.player.pos);
      if (d < nearestD) {
        nearestD = d;
        nearest = sheep;
      }
    }

    if (nearestD < 240) {
      // Мал туух чигийн урд явах ёстой → нохой ард нь зогсоно
      const behindDist = 34;
      target = {
        x: nearest.pos.x - drive.x * behindDist,
        y: nearest.pos.y - drive.y * behindDist,
      };
      speed = 195;
    } else {
      // Ойр мал алга — тоглогчтой нийлж ойртоно
      target = {
        x: state.player.pos.x + drive.x * 24,
        y: state.player.pos.y + drive.y * 24,
      };
      speed = 175;
    }
  } else {
    // Энгийн үед тоглогчийг дагана (ард/хажууд)
    const face = normalize(state.player.facing);
    const follow = {
      x: state.player.pos.x - face.x * 30 + face.y * 16,
      y: state.player.pos.y - face.y * 30 - face.x * 16,
    };
    if (dist(dog.pos, follow) > 26) {
      target = follow;
      speed = 160;
    }
  }

  if (target) {
    const dir = normalize({
      x: target.x - dog.pos.x,
      y: target.y - dog.pos.y,
    });

    dog.vel = dir;

    if (Math.abs(dir.x) > 0.25) {
      dog.face = dir.x < 0 ? -1 : 1;
    }

    const stopRange = chasePrey
      ? chasePrey.radius * chasePrey.scale + 10
      : 10;

    if (dist(dog.pos, target) > stopRange) {
      dog.pos.x += dir.x * speed * dt;
      dog.pos.y += dir.y * speed * dt;
    }
  } else {
    dog.vel = { x: 0, y: 0 };
  }

  if (
    prey &&
    dog.attackCooldown <= 0 &&
    dist(dog.pos, prey.pos) < prey.radius * prey.scale + 14
  ) {
    dog.attackCooldown = 0.9;
    sfx("bark");
    damageWolf(state, prey, 10);

    // Араатан эргүүлж хаздаг — баавгай нохойд илүү аюултай
    if (prey.alive) {
      dog.hp -= prey.kind === "bear" ? 14 : 5;
      dog.flash = 0.15;
      spawnParticles(state, dog.pos, 5, "#c03030", { speed: 70 });

      if (dog.hp <= 0) {
        state.world.dog = null;
        state.player.gear.dog = false;
        sfx("hurt");
        spawnParticles(state, dog.pos, 16, "#7a5c38", { speed: 120 });
        spawnText(state, dog.pos, "Нохой үхэв!", "#ff8080");
        setMessage(state, "Нохой чинь үхлээ… Дэлгүүрээс шинийг ав.", 3);
        return;
      }
    }
  }

  if (state.phase === "playing") applyRiverCurrent(dog.pos, dt, 0.55);
  pushOutOfGer(dog.pos, 12, state.world);
  pushOutOfUrtz(dog.pos, 12, state.world);
  dog.pos.x = clamp(dog.pos.x, 20, WORLD_W - 20);
  dog.pos.y = clamp(dog.pos.y, 20, WORLD_H - 20);
}
