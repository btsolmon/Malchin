// Malchin тоглоом ↔ combat багцын холбоос

import type { GameState, Thief, Wolf } from "../types";
import { normalize, setMessage } from "../utils";
import { spawnParticles, spawnText } from "../effects";
import { sfx } from "../audio";
import { damagePlayer } from "../enemies";
import { damageThief, damageWolf } from "./weapons";
import {
  performCriticalHit,
  updateEnemyCombat,
} from "./enemyCombat";
import { updatePlayerCombat } from "./playerCombat";
import type {
  CombatEnemy,
  CombatHooks,
  CombatInput,
  CombatPlayer,
  EnemyAttackPhase,
} from "./types";

type EnemyRef =
  | { kind: "wolf"; wolf: Wolf }
  | { kind: "thief"; thief: Thief };

function ensurePlayerCombat(state: GameState): void {
  const p = state.player;
  if (p.stamina === undefined) p.stamina = 100;
  if (p.maxStamina === undefined) p.maxStamina = 100;
  if (p.staminaRegenDelay === undefined) p.staminaRegenDelay = 0;
  if (!p.meleePhase) p.meleePhase = "idle";
  if (p.meleeTimer === undefined) p.meleeTimer = 0;
  if (p.meleeHitDone === undefined) p.meleeHitDone = false;
  if (!p.attackFacing) p.attackFacing = { ...p.facing };
  if (!p.dodgePhase) p.dodgePhase = "idle";
  if (p.dodgeTimer === undefined) p.dodgeTimer = 0;
  if (!p.dodgeDirection) p.dodgeDirection = { ...p.facing };
  if (!p.parryPhase) p.parryPhase = "idle";
  if (p.parryTimer === undefined) p.parryTimer = 0;
}

function ensureEnemyCombat(enemy: Wolf | Thief): void {
  if (enemy.posture === undefined) enemy.posture = 0;
  if (enemy.maxPosture === undefined) {
    enemy.maxPosture = "kind" in enemy && enemy.kind === "bear" ? 140 : 100;
  }
  if (enemy.postureRecoveryDelay === undefined) {
    enemy.postureRecoveryDelay = 0;
  }
  if (!enemy.combatPhase) enemy.combatPhase = "idle";
  if (enemy.combatTimer === undefined) enemy.combatTimer = 0;
  if (!enemy.attackDirection) enemy.attackDirection = { x: 0, y: 1 };
  if (enemy.attackHitDone === undefined) enemy.attackHitDone = false;
  if (enemy.knockbackResistance === undefined) {
    enemy.knockbackResistance =
      "kind" in enemy && enemy.kind === "bear" ? 0.45 : 0.15;
  }
}

function toCombatPlayer(state: GameState): CombatPlayer {
  const p = state.player;
  ensurePlayerCombat(state);
  return {
    pos: p.pos,
    radius: p.radius,
    facing: p.facing,
    health: p.vitals.health,
    maxHealth: p.vitals.maxHealth,
    stamina: p.stamina,
    maxStamina: p.maxStamina,
    staminaRegenDelay: p.staminaRegenDelay,
    meleePhase: p.meleePhase,
    meleeTimer: p.meleeTimer,
    meleeHitDone: p.meleeHitDone,
    attackFacing: p.attackFacing,
    dodgePhase: p.dodgePhase,
    dodgeTimer: p.dodgeTimer,
    dodgeDirection: p.dodgeDirection,
    invulnerableTimer: Math.max(p.invuln, 0),
    parryPhase: p.parryPhase,
    parryTimer: p.parryTimer,
    damageMultiplier: p.damageMult,
    reachMultiplier: p.reachMult,
    cooldownMultiplier: p.cooldownMult,
  };
}

function fromCombatPlayer(state: GameState, cp: CombatPlayer): void {
  const p = state.player;
  p.pos.x = cp.pos.x;
  p.pos.y = cp.pos.y;
  p.facing = { ...cp.facing };
  p.stamina = cp.stamina;
  p.maxStamina = cp.maxStamina;
  p.staminaRegenDelay = cp.staminaRegenDelay;
  p.meleePhase = cp.meleePhase;
  p.meleeTimer = cp.meleeTimer;
  p.meleeHitDone = cp.meleeHitDone;
  p.attackFacing = { ...cp.attackFacing };
  p.dodgePhase = cp.dodgePhase;
  p.dodgeTimer = cp.dodgeTimer;
  p.dodgeDirection = { ...cp.dodgeDirection };
  p.invuln = Math.max(p.invuln, cp.invulnerableTimer);
  p.parryPhase = cp.parryPhase;
  p.parryTimer = cp.parryTimer;

  // Цохилтын анимэйшн — active/startup үед
  if (cp.meleePhase === "startup" || cp.meleePhase === "active") {
    if (!p.attackMelee || p.attackAnim <= 0) sfx("swing");
    p.attackMelee = true;
    p.attackAnim = Math.max(p.attackAnim, 0.18);
  }
  if (cp.parryPhase === "active" || cp.parryPhase === "startup") {
    p.attackAnim = Math.max(p.attackAnim, 0.12);
  }
}

function toCombatEnemy(ref: EnemyRef): CombatEnemy {
  if (ref.kind === "wolf") {
    const w = ref.wolf;
    ensureEnemyCombat(w);
    return {
      id: `w-${w.id}`,
      pos: { ...w.pos },
      radius: w.radius * w.scale,
      facing: { x: w.face, y: 0 },
      health: w.hp,
      maxHealth: w.maxHp,
      alive: w.alive,
      posture: w.posture,
      maxPosture: w.maxPosture,
      postureRecoveryDelay: w.postureRecoveryDelay,
      attackPhase: w.combatPhase,
      attackTimer: w.combatTimer,
      attackDirection: { ...w.attackDirection },
      attackHitDone: w.attackHitDone,
      damage: w.damage,
      moveSpeed: w.speed,
      attackRange: 28,
      knockbackResistance: w.knockbackResistance,
    };
  }
  const t = ref.thief;
  ensureEnemyCombat(t);
  return {
    id: `t-${t.id}`,
    pos: { ...t.pos },
    radius: t.radius,
    facing: { x: t.face, y: 0 },
    health: t.hp,
    maxHealth: t.maxHp,
    alive: t.alive,
    posture: t.posture,
    maxPosture: t.maxPosture,
    postureRecoveryDelay: t.postureRecoveryDelay,
    attackPhase: t.combatPhase,
    attackTimer: t.combatTimer,
    attackDirection: { ...t.attackDirection },
    attackHitDone: t.attackHitDone,
    damage: t.damage,
    moveSpeed: t.speed,
    attackRange: 26,
    knockbackResistance: t.knockbackResistance,
  };
}

function syncEnemyFromCombat(ref: EnemyRef, e: CombatEnemy): void {
  if (ref.kind === "wolf") {
    const w = ref.wolf;
    w.pos.x = e.pos.x;
    w.pos.y = e.pos.y;
    w.posture = e.posture;
    w.maxPosture = e.maxPosture;
    w.postureRecoveryDelay = e.postureRecoveryDelay;
    w.combatPhase = e.attackPhase;
    w.combatTimer = e.attackTimer;
    w.attackDirection = { ...e.attackDirection };
    w.attackHitDone = e.attackHitDone;
    w.knockbackResistance = e.knockbackResistance;
    if (Math.abs(e.facing.x) > 0.2) w.face = e.facing.x < 0 ? -1 : 1;
    return;
  }
  const t = ref.thief;
  t.pos.x = e.pos.x;
  t.pos.y = e.pos.y;
  t.posture = e.posture;
  t.maxPosture = e.maxPosture;
  t.postureRecoveryDelay = e.postureRecoveryDelay;
  t.combatPhase = e.attackPhase;
  t.combatTimer = e.attackTimer;
  t.attackDirection = { ...e.attackDirection };
  t.attackHitDone = e.attackHitDone;
  t.knockbackResistance = e.knockbackResistance;
  if (Math.abs(e.facing.x) > 0.2) t.face = e.facing.x < 0 ? -1 : 1;
}

function collectEnemyRefs(state: GameState): EnemyRef[] {
  const refs: EnemyRef[] = [];
  for (const wolf of state.world.wolves) {
    if (wolf.alive) refs.push({ kind: "wolf", wolf });
  }
  for (const thief of state.world.thieves) {
    if (thief.alive) refs.push({ kind: "thief", thief });
  }
  return refs;
}

function findRef(refs: EnemyRef[], id: number | string): EnemyRef | null {
  const key = String(id);
  for (const ref of refs) {
    if (ref.kind === "wolf" && `w-${ref.wolf.id}` === key) return ref;
    if (ref.kind === "thief" && `t-${ref.thief.id}` === key) return ref;
  }
  return null;
}

function makeHooks(state: GameState, refs: EnemyRef[]): CombatHooks {
  return {
    onMessage: (text) => setMessage(state, text, 1.4),
    onShake: (amount) => {
      state.fx.shake = Math.max(state.fx.shake, amount);
    },
    onHit: (event) => {
      if (event.source === "player" || event.source === "critical") {
        spawnParticles(state, event.position, 8, "#c03030", { speed: 100 });
        if (event.source === "critical") {
          spawnText(state, event.position, "Critical!", "#ffd060");
          sfx("kill");
        }
      } else if (event.source === "parry") {
        spawnParticles(state, event.position, 10, "#a8d8ff", { speed: 120 });
        spawnText(state, event.position, "Сөрөв!", "#a8d8ff");
        sfx("hit");
      } else if (event.source === "enemy") {
        state.fx.hurtFlash = 1;
        sfx("hurt");
        spawnParticles(state, event.position, 8, "#d64545", { speed: 90 });
        spawnText(state, event.position, `−${Math.round(event.damage)}`, "#ff6060");
      }
    },
    onParry: () => {
      setMessage(state, "Дайралтыг сөрөв!", 1.2);
    },
    applyEnemyDamage: (enemy, damage) => {
      const ref = findRef(refs, enemy.id);
      if (!ref) return;
      if (ref.kind === "wolf") {
        damageWolf(state, ref.wolf, damage);
        enemy.health = ref.wolf.hp;
        enemy.alive = ref.wolf.alive;
      } else {
        damageThief(state, ref.thief, damage);
        enemy.health = ref.thief.hp;
        enemy.alive = ref.thief.alive;
      }
    },
    applyPlayerDamage: (damage) => {
      damagePlayer(state, damage);
      if (state.player.vitals.health <= 0 && state.phase === "playing") {
        state.phase = "lost";
        setMessage(state, "Тулаанд ялагдлаа…", 99);
      }
    },
    onPlayerKilled: () => {
      if (state.phase === "playing") {
        state.phase = "lost";
        setMessage(state, "Тулаанд ялагдлаа…", 99);
      }
    },
  };
}

function buildCombatInput(state: GameState): CombatInput {
  const { input } = state;
  const move = normalize({
    x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    y: (input.down ? 1 : 0) - (input.up ? 1 : 0),
  });
  return {
    move,
    attackPressed: input.attackPressed,
    dodgePressed: input.dodgePressed,
    parryPressed: input.parryPressed,
  };
}

/**
 * Melee / dodge / parry + дайсны windup довтолгоо.
 * Хөдөлгөөний өмнө дуудах — dodge velocity-г player-д бичнэ.
 */
export function updateAdvancedCombat(state: GameState, dt: number): void {
  ensurePlayerCombat(state);
  const refs = collectEnemyRefs(state);
  const combatEnemies = refs.map(toCombatEnemy);
  const cp = toCombatPlayer(state);
  const hooks = makeHooks(state, refs);
  const input = buildCombatInput(state);

  // Stagger үед critical
  if (input.attackPressed) {
    for (const enemy of combatEnemies) {
      if (enemy.attackPhase === "staggered") {
        performCriticalHit(cp, enemy, hooks);
      }
    }
  }

  const result = updatePlayerCombat(cp, combatEnemies, input, dt, hooks);

  // Ойр эсвэл тулааны фаз дунд байгаа дайснууд
  const nearForAttack = combatEnemies.filter((e) => {
    if (!e.alive) return false;
    if (e.attackPhase !== "idle") return true;
    const dx = e.pos.x - cp.pos.x;
    const dy = e.pos.y - cp.pos.y;
    return Math.hypot(dx, dy) < e.attackRange + cp.radius + e.radius + 40;
  });
  updateEnemyCombat(nearForAttack, cp, dt, hooks);

  fromCombatPlayer(state, cp);

  for (let i = 0; i < refs.length; i++) {
    syncEnemyFromCombat(refs[i], combatEnemies[i]);
  }

  // Dodge хөдөлгөөн
  if (result.dodgeVelocity) {
    const p = state.player;
    p.pos.x += result.dodgeVelocity.x * dt;
    p.pos.y += result.dodgeVelocity.y * dt;
    p.moving = true;
  }

  state.combatMovementLocked = result.movementLocked;
  state.combatDodgeActive = result.dodgeVelocity !== null &&
    (result.dodgeVelocity.x !== 0 || result.dodgeVelocity.y !== 0);

  // Нэг frame-ийн товчнууд
  state.input.attackPressed = false;
  state.input.dodgePressed = false;
  state.input.parryPressed = false;
}

/** Stagger / windup үед AI хөдөлгөөн зогсооно */
export function enemyCombatLocksMovement(
  phase: EnemyAttackPhase | undefined,
): boolean {
  return (
    phase === "windup" ||
    phase === "active" ||
    phase === "recovery" ||
    phase === "staggered"
  );
}
