export const COMBAT_CONFIG = {
  melee: {
    staminaCost: 20,
    startup: 0.12,
    active: 0.1,
    recovery: 0.28,
    baseDamage: 20,
    baseReach: 42,
    facingDotMinimum: 0.25,
    knockback: 28,
    postureDamage: 24,
  },

  stamina: {
    regenerationDelay: 0.75,
    regenerationPerSecond: 30,
  },

  dodge: {
    staminaCost: 25,
    duration: 0.28,
    recovery: 0.12,
    speed: 430,
    invulnerabilityStart: 0.06,
    invulnerabilityEnd: 0.2,
  },

  parry: {
    staminaCost: 12,
    startup: 0.05,
    active: 0.16,
    recovery: 0.28,
    enemyPostureDamage: 55,
    enemyStaggerDuration: 0.9,
  },

  enemy: {
    windup: 0.45,
    active: 0.14,
    recovery: 0.5,
    postureRecoveryDelay: 1.5,
    postureRecoveryPerSecond: 16,
    attackCooldown: 0.5,
  },
} as const;
