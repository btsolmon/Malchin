import type { CombatEnemy, CombatPlayer, Vector2 } from "./types";

export function createCombatPlayer(
  position: Vector2,
): CombatPlayer {
  return {
    pos: { ...position },
    radius: 14,
    facing: { x: 0, y: 1 },

    health: 100,
    maxHealth: 100,

    stamina: 100,
    maxStamina: 100,
    staminaRegenDelay: 0,

    meleePhase: "idle",
    meleeTimer: 0,
    meleeHitDone: false,
    attackFacing: { x: 0, y: 1 },

    dodgePhase: "idle",
    dodgeTimer: 0,
    dodgeDirection: { x: 0, y: 1 },
    invulnerableTimer: 0,

    parryPhase: "idle",
    parryTimer: 0,

    damageMultiplier: 1,
    reachMultiplier: 1,
    cooldownMultiplier: 1,
  };
}

export function createCombatEnemy(
  id: number | string,
  position: Vector2,
): CombatEnemy {
  return {
    id,
    pos: { ...position },
    radius: 16,
    facing: { x: 0, y: 1 },

    health: 80,
    maxHealth: 80,
    alive: true,

    posture: 0,
    maxPosture: 100,
    postureRecoveryDelay: 0,

    attackPhase: "idle",
    attackTimer: 0,
    attackDirection: { x: 0, y: 1 },
    attackHitDone: false,

    damage: 15,
    moveSpeed: 90,
    attackRange: 28,
    knockbackResistance: 0.15,
  };
}
