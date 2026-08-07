import {
  WORLD_H,
  WORLD_W,
  type AttackVariant,
  type GameState,
  type RouteEnemy,
  type Thief,
  type Vector2,
  type Wolf,
} from "../types";
import { clamp, dist, normalize, setMessage } from "../utils";
import { applyRiverCurrent } from "../biomes";
import {
  spawnImpactBurst,
  spawnParticles,
  spawnSoulRelease,
  spawnText,
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
} from "../firstRoute";
import {
  damageTumurShulmasFromPlayer,
  isTumurShulmasParryThreat,
} from "../tumurShulmas";

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

const STAFF_MELEE_STAMINA_COST = 20;
const SWORD_MELEE_STAMINA_COST = 24;
const MELEE_STARTUP_SECONDS = 0.08;
const MELEE_ACTIVE_SECONDS = 0.07;
const MELEE_RECOVERY_SECONDS = 0.16;

const PARRY_STAMINA_COST = 10;
const PARRY_STARTUP_SECONDS = 0.02;
const PARRY_ACTIVE_SECONDS = 0.5;
const PARRY_RECOVERY_SECONDS = 0.18;

const DODGE_STAMINA_COST = 25;
const DODGE_DURATION_SECONDS = 0.28;
const DODGE_RECOVERY_SECONDS = 0.12;
const DODGE_SPEED = 430;
const DODGE_INVULN_START = 0.06;
const DODGE_INVULN_END = 0.2;

const STAMINA_REGEN_DELAY_SECONDS = 0.75;
const STAMINA_REGEN_PER_SECOND = 30;

const NORMAL_MELEE_HIT_STOP_SECONDS = 0.045;
const HEAVY_MELEE_HIT_STOP_SECONDS = 0.07;
const EXECUTION_HIT_STOP_SECONDS = 0.08;

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
  return isSkySwordEquipped(state) ? 29 : 18;
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
  if (
    player.dodgePhase !== "idle" ||
    player.combatPhase !== "idle" ||
    player.parryPhase !== "idle"
  ) {
    return false;
  }
  if (player.stamina < DODGE_STAMINA_COST) {
    setMessage(state, "Тамир тасарч, хүч барагдав.", 1.5);
    return false;
  }
  const direction = dodgeDirection(state);
  player.stamina -= DODGE_STAMINA_COST;
  player.staminaRegenDelay = STAMINA_REGEN_DELAY_SECONDS;
  player.dodgePhase = "dodging";
  player.dodgeTimer = DODGE_DURATION_SECONDS;
  player.dodgeDirection = direction;
  player.facing = direction;
  player.moving = false;
  spawnParticles(state, player.pos, 5, "#b8aa8a", {
    speed: 55,
    size: 2.2,
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
    setMessage(state, "Тамир тасарч, хүч барагдав.", 1.5);
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
    setMessage(state, "Тамир тасарч, хүч барагдав.", 1.5);
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
        `СӨРӨГ ЦОХИЛТ! −${counterDamage}`,
        "#fff0a8",
      );
      damageRouteEnemy(state, nearestRouteEnemy, counterDamage);

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
    damageRouteEnemy(state, nearestRouteEnemy, weaponDamage);
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
        `СӨРӨГ ЦОХИЛТ! −${Math.round(counterDamage)}`,
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

    const knockback =
      nearestWolf.kind === "bear" ? 10 : 28;

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

function tryRangedAttack(state: GameState): boolean {
  const { player, world } = state;

  if (player.combatPhase !== "idle") return false;
  if (player.dodgePhase !== "idle") return false;
  if (player.parryPhase !== "idle") return false;
  if (player.attackCooldown > 0) return false;
  if (!state.input.shoot) return false;

  const bow = player.gear.bow;
  // Сүнсний оронд зэвсэггүй ч сүнсний сум харваж болно
  const spiritBolt = !bow && state.phase === "spirit";
  if (!bow && !spiritBolt) return false;

  if (bow && player.inventory.arrows <= 0) {
    setMessage(
      state,
      "Сум алга — урлалаар хий (1 мод + 1 чулуу = 2 сум).",
      2.5,
    );
    return false;
  }

  const range = spiritBolt ? 240 : 200;

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
      const distance = dist(player.pos, enemy.pos);
      if (distance < bestDistance) {
        bestDistance = distance;
        dir = normalize({
          x: enemy.pos.x - player.pos.x,
          y: enemy.pos.y - player.pos.y,
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
 * 3. Одоогийн melee phase
 * 4. Idle үед шинэ K/J оролт
 */
export function updateCombat(state: GameState, dt: number): void {
  tickCombatTimers(state, dt);
  updateStamina(state, dt);

  if (state.input.dodge) {
    state.input.dodge = false;
    beginDodge(state);
  }
  if (updateDodge(state, dt)) {
    state.combatDodgeActive = state.player.dodgePhase === "dodging";
    state.combatMovementLocked = !state.combatDodgeActive;
    return;
  }
  state.combatDodgeActive = false;

  updateParryPhases(state, dt);
  updateMeleePhases(state, dt);

  const { player, input } = state;
  // Цохих үед алхаж болно — зөвхөн parry түгжинэ
  state.combatMovementLocked = player.parryPhase !== "idle";

  if (player.parryPhase !== "idle") return;
  if (player.combatPhase !== "idle") return;

  if (input.parry) {
    input.parry = false;
    beginParry(state);
    state.combatMovementLocked = player.parryPhase !== "idle";
    return;
  }

  if (tryRangedAttack(state)) return;

  // J — ойр хашаа нураах (дайрахаас өмнө)
  if (
    (input.attack || input.attackPressed) &&
    tryDemolishFence(state)
  ) {
    input.attack = false;
    input.attackPressed = false;
    return;
  }

  // attackPressed — hitstop/frame алдагдлаас хамгаалах edge
  if (!input.attack && !input.attackPressed) return;

  input.attack = false;
  input.attackPressed = false;
  beginMeleeAttack(state);
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
    setMessage(state, bear ? "Баавгайн сүнс одлоо." : "Чонын сүнс одлоо.", 2);
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
    spawnText(state, thief.pos, `+${recovered} хонь · +${xp} XP`, "#b8e8a0");
    gainXp(state, xp);
    setMessage(state, `Мал буцааж авлаа! +${recovered} хонь`, 3);
  }
}

/** Сумнуудын хөдөлгөөн ба мөргөлт (weapons.ts-тай ижил зорилтот) */
export function updateProjectiles(state: GameState, dt: number): void {
  const { world } = state;

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
      for (const enemy of world.firstRoute.enemies) {
        if (!enemy.alive) continue;
        if (dist(projectile.pos, enemy.pos) < enemy.radius + 6) {
          damageRouteEnemy(state, enemy, projectile.dmg);
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

    if (consumed) projectile.life = 0;
  }

  world.projectiles = world.projectiles.filter(
    (projectile) => projectile.life > 0,
  );
}

/** Хоньчин нохой — чоно хөөж, тоглогчийг дагана; хазуулж үхэж болно */
export function updateDog(state: GameState, dt: number): void {
  const dog = state.world.dog;
  if (!dog) return;

  dog.attackCooldown = Math.max(0, dog.attackCooldown - dt);
  dog.flash = Math.max(0, dog.flash - dt);

  // Тайван үедээ аажмаар амиа нөхнө
  if (dog.hp < dog.maxHp) {
    dog.hp = Math.min(dog.maxHp, dog.hp + dt * 1.2);
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

  let target: Vector2 | null = null;

  if (prey) {
    target = prey.pos;
  } else {
    const follow = {
      x: state.player.pos.x + 26,
      y: state.player.pos.y + 12,
    };
    if (dist(dog.pos, follow) > 34) target = follow;
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

    const speed = prey ? 165 : 140;
    const stopRange = prey ? prey.radius * prey.scale + 10 : 0;

    if (!prey || dist(dog.pos, prey.pos) > stopRange) {
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

  dog.pos.x = clamp(dog.pos.x, 20, WORLD_W - 20);
  dog.pos.y = clamp(dog.pos.y, 20, WORLD_H - 20);
}
