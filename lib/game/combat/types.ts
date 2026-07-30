export interface Vector2 {
  x: number;
  y: number;
}

export type MeleePhase = "idle" | "startup" | "active" | "recovery";
export type DodgePhase = "idle" | "dodging" | "recovery";
export type ParryPhase = "idle" | "startup" | "active" | "recovery";
export type EnemyAttackPhase =
  | "idle"
  | "windup"
  | "active"
  | "recovery"
  | "staggered";

export interface CombatInput {
  move: Vector2;
  attackPressed: boolean;
  dodgePressed: boolean;
  parryPressed: boolean;
}

export interface CombatPlayer {
  pos: Vector2;
  radius: number;
  facing: Vector2;

  health: number;
  maxHealth: number;

  stamina: number;
  maxStamina: number;
  staminaRegenDelay: number;

  meleePhase: MeleePhase;
  meleeTimer: number;
  meleeHitDone: boolean;
  attackFacing: Vector2;

  dodgePhase: DodgePhase;
  dodgeTimer: number;
  dodgeDirection: Vector2;
  invulnerableTimer: number;

  parryPhase: ParryPhase;
  parryTimer: number;

  damageMultiplier: number;
  reachMultiplier: number;
  cooldownMultiplier: number;
}

export interface CombatEnemy {
  id: number | string;
  pos: Vector2;
  radius: number;
  facing: Vector2;

  health: number;
  maxHealth: number;
  alive: boolean;

  posture: number;
  maxPosture: number;
  postureRecoveryDelay: number;

  attackPhase: EnemyAttackPhase;
  attackTimer: number;
  attackDirection: Vector2;
  attackHitDone: boolean;

  damage: number;
  moveSpeed: number;
  attackRange: number;
  knockbackResistance: number;
}

export interface HitEvent {
  source: "player" | "enemy" | "parry" | "critical";
  position: Vector2;
  damage: number;
  targetId?: number | string;
}

export interface CombatHooks {
  onMessage?: (text: string) => void;
  onHit?: (event: HitEvent) => void;
  onParry?: (enemy: CombatEnemy) => void;
  onEnemyKilled?: (enemy: CombatEnemy) => void;
  onPlayerKilled?: () => void;
  onShake?: (amount: number) => void;
  /** Тоглогчид хохирол өгөх — морь/гэр гэх мэт тоглоомын логикт холбоно */
  applyPlayerDamage?: (damage: number, enemy: CombatEnemy) => void;
  /** Дайсанд melee хохирол өгөх — score/sfx-д холбоно */
  applyEnemyDamage?: (enemy: CombatEnemy, damage: number) => void;
}
