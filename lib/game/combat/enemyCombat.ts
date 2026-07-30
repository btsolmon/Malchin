import { COMBAT_CONFIG } from "./config";
import {
  addScaled,
  clamp,
  directionFromTo,
  distance,
  safeDirection,
} from "./math";
import { isPlayerParryActive } from "./playerCombat";
import type {
  CombatEnemy,
  CombatHooks,
  CombatPlayer,
} from "./types";

export function beginEnemyAttack(
  enemy: CombatEnemy,
  player: CombatPlayer,
): boolean {
  if (!enemy.alive || enemy.attackPhase !== "idle") return false;

  const reach = enemy.attackRange + player.radius + enemy.radius;
  if (distance(enemy.pos, player.pos) > reach) return false;

  enemy.attackPhase = "windup";
  enemy.attackTimer = COMBAT_CONFIG.enemy.windup;
  enemy.attackDirection = directionFromTo(enemy.pos, player.pos);
  enemy.facing = { ...enemy.attackDirection };
  enemy.attackHitDone = false;
  return true;
}

function resolveEnemyAttack(
  enemy: CombatEnemy,
  player: CombatPlayer,
  hooks: CombatHooks,
): void {
  if (enemy.attackHitDone || !enemy.alive) return;
  enemy.attackHitDone = true;

  const hitReach = enemy.attackRange + player.radius + enemy.radius;
  if (distance(enemy.pos, player.pos) > hitReach) return;

  if (isPlayerParryActive(player)) {
    enemy.posture = clamp(
      enemy.posture + COMBAT_CONFIG.parry.enemyPostureDamage,
      0,
      enemy.maxPosture,
    );
    enemy.postureRecoveryDelay =
      COMBAT_CONFIG.enemy.postureRecoveryDelay;

    enemy.attackPhase = "staggered";
    enemy.attackTimer = COMBAT_CONFIG.parry.enemyStaggerDuration;
    enemy.attackHitDone = false;

    hooks.onParry?.(enemy);
    hooks.onHit?.({
      source: "parry",
      position: { ...enemy.pos },
      damage: 0,
      targetId: enemy.id,
    });
    hooks.onShake?.(4);
    return;
  }

  if (player.invulnerableTimer > 0) return;

  const knockbackDirection = safeDirection(
    directionFromTo(enemy.pos, player.pos),
  );
  player.pos = addScaled(player.pos, knockbackDirection, 24);
  player.invulnerableTimer = 0.45;

  if (hooks.applyPlayerDamage) {
    hooks.applyPlayerDamage(enemy.damage, enemy);
  } else {
    player.health = Math.max(0, player.health - enemy.damage);
    if (player.health <= 0) hooks.onPlayerKilled?.();
  }

  hooks.onHit?.({
    source: "enemy",
    position: { ...player.pos },
    damage: enemy.damage,
    targetId: enemy.id,
  });
  hooks.onShake?.(3);
}

function updatePosture(enemy: CombatEnemy, dt: number): void {
  enemy.postureRecoveryDelay = Math.max(
    0,
    enemy.postureRecoveryDelay - dt,
  );

  if (
    enemy.attackPhase === "idle" &&
    enemy.postureRecoveryDelay <= 0 &&
    enemy.posture > 0
  ) {
    enemy.posture = Math.max(
      0,
      enemy.posture -
        COMBAT_CONFIG.enemy.postureRecoveryPerSecond * dt,
    );
  }
}

function updateEnemyAttack(
  enemy: CombatEnemy,
  player: CombatPlayer,
  dt: number,
  hooks: CombatHooks,
): void {
  if (!enemy.alive) return;

  updatePosture(enemy, dt);

  if (enemy.attackPhase === "idle") {
    beginEnemyAttack(enemy, player);
    return;
  }

  enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
  if (enemy.attackTimer > 0) return;

  if (enemy.attackPhase === "windup") {
    enemy.attackPhase = "active";
    enemy.attackTimer = COMBAT_CONFIG.enemy.active;
    resolveEnemyAttack(enemy, player, hooks);
    return;
  }

  if (enemy.attackPhase === "active") {
    enemy.attackPhase = "recovery";
    enemy.attackTimer = COMBAT_CONFIG.enemy.recovery;
    return;
  }

  if (enemy.attackPhase === "recovery") {
    enemy.attackPhase = "idle";
    enemy.attackTimer = COMBAT_CONFIG.enemy.attackCooldown;
    enemy.attackHitDone = false;
    return;
  }

  if (enemy.attackPhase === "staggered") {
    enemy.attackPhase = "idle";
    enemy.attackTimer = 0;
    enemy.attackHitDone = false;

    if (enemy.posture >= enemy.maxPosture) {
      enemy.posture = enemy.maxPosture * 0.4;
    }
  }
}

export function updateEnemyCombat(
  enemies: CombatEnemy[],
  player: CombatPlayer,
  dt: number,
  hooks: CombatHooks = {},
): void {
  const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;

  for (const enemy of enemies) {
    updateEnemyAttack(enemy, player, safeDt, hooks);
  }
}

export function performCriticalHit(
  player: CombatPlayer,
  enemy: CombatEnemy,
  hooks: CombatHooks = {},
): boolean {
  if (!enemy.alive || enemy.attackPhase !== "staggered") return false;

  const range = player.radius + enemy.radius + 38;
  if (distance(player.pos, enemy.pos) > range) return false;

  const damage = COMBAT_CONFIG.melee.baseDamage *
    player.damageMultiplier *
    3;

  enemy.posture = 0;
  enemy.attackPhase = "recovery";
  enemy.attackTimer = 0.6;

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
    source: "critical",
    position: { ...enemy.pos },
    damage,
    targetId: enemy.id,
  });
  hooks.onShake?.(6);

  return true;
}
