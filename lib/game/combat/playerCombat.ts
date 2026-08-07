import { COMBAT_CONFIG } from "./config";
import {
  addScaled,
  clamp,
  directionFromTo,
  distance,
  isInFacingCone,
  safeDirection,
} from "./math";
import type {
  CombatEnemy,
  CombatHooks,
  CombatInput,
  CombatPlayer,
  Vector2,
} from "./types";

export interface PlayerCombatResult {
  movementLocked: boolean;
  dodgeVelocity: Vector2 | null;
}

function updateStamina(player: CombatPlayer, dt: number): void {
  player.staminaRegenDelay = Math.max(0, player.staminaRegenDelay - dt);

  const busy =
    player.meleePhase !== "idle" ||
    player.dodgePhase !== "idle" ||
    player.parryPhase !== "idle";

  if (
    !busy &&
    player.staminaRegenDelay <= 0 &&
    player.stamina < player.maxStamina
  ) {
    const regenMult = player.staminaRegenMultiplier ?? 1;
    player.stamina = Math.min(
      player.maxStamina,
      player.stamina +
        COMBAT_CONFIG.stamina.regenerationPerSecond * regenMult * dt,
    );
  }
}

function beginMelee(player: CombatPlayer, hooks: CombatHooks): boolean {
  if (
    player.meleePhase !== "idle" ||
    player.dodgePhase !== "idle" ||
    player.parryPhase !== "idle"
  ) {
    return false;
  }

  const cost = COMBAT_CONFIG.melee.staminaCost;
  if (player.stamina < cost) {
    hooks.onMessage?.("Тамир хүрэлцэхгүй байна.");
    return false;
  }

  player.stamina -= cost;
  player.staminaRegenDelay = COMBAT_CONFIG.stamina.regenerationDelay;
  player.meleePhase = "startup";
  player.meleeTimer =
    COMBAT_CONFIG.melee.startup * player.cooldownMultiplier;
  player.meleeHitDone = false;
  player.attackFacing = safeDirection(player.facing);
  return true;
}

function nearestMeleeEnemy(
  player: CombatPlayer,
  enemies: CombatEnemy[],
): CombatEnemy | null {
  let nearest: CombatEnemy | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const reach =
      COMBAT_CONFIG.melee.baseReach * player.reachMultiplier + enemy.radius;

    if (
      !isInFacingCone(
        player.pos,
        enemy.pos,
        player.attackFacing,
        reach,
        COMBAT_CONFIG.melee.facingDotMinimum,
      )
    ) {
      continue;
    }

    const currentDistance = distance(player.pos, enemy.pos);
    if (currentDistance < nearestDistance) {
      nearest = enemy;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}

function damageEnemy(
  player: CombatPlayer,
  enemy: CombatEnemy,
  hooks: CombatHooks,
): void {
  const damage =
    COMBAT_CONFIG.melee.baseDamage * player.damageMultiplier;

  enemy.posture = clamp(
    enemy.posture + COMBAT_CONFIG.melee.postureDamage,
    0,
    enemy.maxPosture,
  );
  enemy.postureRecoveryDelay =
    COMBAT_CONFIG.enemy.postureRecoveryDelay;

  const away = directionFromTo(player.pos, enemy.pos);
  const resistance = clamp(enemy.knockbackResistance, 0, 0.95);
  enemy.pos = addScaled(
    enemy.pos,
    away,
    COMBAT_CONFIG.melee.knockback * (1 - resistance),
  );

  if (hooks.applyEnemyDamage) {
    hooks.applyEnemyDamage(enemy, damage);
  } else {
    enemy.health = Math.max(0, enemy.health - damage);
    if (enemy.health <= 0) {
      enemy.alive = false;
      hooks.onEnemyKilled?.(enemy);
    }
  }

  hooks.onHit?.({
    source: "player",
    position: { ...enemy.pos },
    damage,
    targetId: enemy.id,
  });
  hooks.onShake?.(2.5);

  if (!enemy.alive) return;

  if (enemy.posture >= enemy.maxPosture) {
    enemy.posture = enemy.maxPosture;
    enemy.attackPhase = "staggered";
    enemy.attackTimer = COMBAT_CONFIG.parry.enemyStaggerDuration;
    enemy.attackHitDone = false;
  }
}

function updateMelee(
  player: CombatPlayer,
  enemies: CombatEnemy[],
  dt: number,
  hooks: CombatHooks,
): void {
  if (player.meleePhase === "idle") return;

  player.meleeTimer -= dt;

  if (player.meleeTimer > 0) return;

  if (player.meleePhase === "startup") {
    player.meleePhase = "active";
    player.meleeTimer =
      COMBAT_CONFIG.melee.active * player.cooldownMultiplier;

    if (!player.meleeHitDone) {
      const enemy = nearestMeleeEnemy(player, enemies);
      if (enemy) damageEnemy(player, enemy, hooks);
      player.meleeHitDone = true;
    }
    return;
  }

  if (player.meleePhase === "active") {
    player.meleePhase = "recovery";
    player.meleeTimer =
      COMBAT_CONFIG.melee.recovery * player.cooldownMultiplier;
    return;
  }

  player.meleePhase = "idle";
  player.meleeTimer = 0;
  player.meleeHitDone = false;
}

function beginDodge(
  player: CombatPlayer,
  movement: Vector2,
  hooks: CombatHooks,
): boolean {
  if (
    player.meleePhase !== "idle" ||
    player.dodgePhase !== "idle" ||
    player.parryPhase !== "idle"
  ) {
    return false;
  }

  const cost = COMBAT_CONFIG.dodge.staminaCost;
  if (player.stamina < cost) {
    hooks.onMessage?.("Бултах тамир хүрэлцэхгүй байна.");
    return false;
  }

  player.stamina -= cost;
  player.staminaRegenDelay = COMBAT_CONFIG.stamina.regenerationDelay;
  player.dodgeDirection = safeDirection(movement, player.facing);
  player.facing = { ...player.dodgeDirection };
  player.dodgePhase = "dodging";
  player.dodgeTimer = COMBAT_CONFIG.dodge.duration;
  return true;
}

function updateDodge(
  player: CombatPlayer,
  dt: number,
): Vector2 | null {
  if (player.dodgePhase === "idle") return null;

  if (player.dodgePhase === "recovery") {
    player.dodgeTimer = Math.max(0, player.dodgeTimer - dt);

    if (player.dodgeTimer <= 0) {
      player.dodgePhase = "idle";
      player.dodgeTimer = 0;
    }

    return { x: 0, y: 0 };
  }

  const elapsedBefore =
    COMBAT_CONFIG.dodge.duration - player.dodgeTimer;

  player.dodgeTimer = Math.max(0, player.dodgeTimer - dt);

  const elapsedAfter =
    COMBAT_CONFIG.dodge.duration - player.dodgeTimer;

  const inInvulnerabilityWindow =
    elapsedAfter >= COMBAT_CONFIG.dodge.invulnerabilityStart &&
    elapsedBefore <= COMBAT_CONFIG.dodge.invulnerabilityEnd;

  if (inInvulnerabilityWindow) {
    player.invulnerableTimer = Math.max(
      player.invulnerableTimer,
      dt + 0.04,
    );
  }

  if (player.dodgeTimer <= 0) {
    player.dodgePhase = "recovery";
    player.dodgeTimer = COMBAT_CONFIG.dodge.recovery;
  }

  return {
    x: player.dodgeDirection.x * COMBAT_CONFIG.dodge.speed,
    y: player.dodgeDirection.y * COMBAT_CONFIG.dodge.speed,
  };
}

function beginParry(
  player: CombatPlayer,
  hooks: CombatHooks,
): boolean {
  if (
    player.meleePhase !== "idle" ||
    player.dodgePhase !== "idle" ||
    player.parryPhase !== "idle"
  ) {
    return false;
  }

  const cost = COMBAT_CONFIG.parry.staminaCost;
  if (player.stamina < cost) {
    hooks.onMessage?.("Сөрөх тамир хүрэлцэхгүй байна.");
    return false;
  }

  player.stamina -= cost;
  player.staminaRegenDelay = COMBAT_CONFIG.stamina.regenerationDelay;
  player.parryPhase = "startup";
  player.parryTimer = COMBAT_CONFIG.parry.startup;
  return true;
}

function updateParry(player: CombatPlayer, dt: number): void {
  if (player.parryPhase === "idle") return;

  player.parryTimer = Math.max(0, player.parryTimer - dt);
  if (player.parryTimer > 0) return;

  if (player.parryPhase === "startup") {
    player.parryPhase = "active";
    player.parryTimer = COMBAT_CONFIG.parry.active;
    return;
  }

  if (player.parryPhase === "active") {
    player.parryPhase = "recovery";
    player.parryTimer = COMBAT_CONFIG.parry.recovery;
    return;
  }

  player.parryPhase = "idle";
  player.parryTimer = 0;
}

export function isPlayerParryActive(player: CombatPlayer): boolean {
  return player.parryPhase === "active";
}

export function updatePlayerCombat(
  player: CombatPlayer,
  enemies: CombatEnemy[],
  input: CombatInput,
  dt: number,
  hooks: CombatHooks = {},
): PlayerCombatResult {
  const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;

  player.invulnerableTimer = Math.max(
    0,
    player.invulnerableTimer - safeDt,
  );

  updateStamina(player, safeDt);
  updateMelee(player, enemies, safeDt, hooks);
  updateParry(player, safeDt);

  if (input.dodgePressed) {
    beginDodge(player, input.move, hooks);
  } else if (input.parryPressed) {
    beginParry(player, hooks);
  } else if (input.attackPressed) {
    beginMelee(player, hooks);
  }

  const dodgeVelocity = updateDodge(player, safeDt);

  const movementLocked =
    player.parryPhase !== "idle" ||
    player.dodgePhase === "recovery";

  return { movementLocked, dodgeVelocity };
}
