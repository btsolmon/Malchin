import {
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  type Camera,
  type FirstRoute,
  type GameState,
  type RouteEnemy,
  type RouteEnemyKind,
  type Vector2,
} from "./types";
import { sfx } from "./audio";
import { damagePlayer as damagePastoralPlayer } from "./enemies";
import {
  spawnImpactBurst,
  spawnParticles,
  spawnSoulRelease,
  spawnText,
  triggerHitStop,
} from "./effects";
import { gainXp } from "./player";
import { clamp, dist, normalize, setMessage } from "./utils";
import { tryInteractTumurShulmasGate } from "./tumurShulmas";

function routeOf(state: GameState): FirstRoute {
  return state.world.firstRoute;
}

interface RouteEnemyConfig {
  hp: number;
  posture: number;
  radius: number;
  speed: number;
  damage: number;
  aggroRange: number;
  attackRange: number;
  score: number;
  xp: number;
}

const ROUTE_CONFIG: Record<RouteEnemyKind, RouteEnemyConfig> = {
  talynHaragch: {
    hp: 72,
    posture: 58,
    radius: 18,
    speed: 94,
    damage: 12,
    aggroRange: 220,
    attackRange: 64,
    score: 30,
    xp: 24,
  },
  shulmasynHuu: {
    hp: 56,
    posture: 42,
    radius: 16,
    speed: 148,
    damage: 10,
    aggroRange: 210,
    attackRange: 150,
    score: 35,
    xp: 28,
  },
  shidetHarvaach: {
    hp: 52,
    posture: 38,
    radius: 17,
    speed: 86,
    damage: 11,
    aggroRange: 260,
    attackRange: 300,
    score: 40,
    xp: 32,
  },
  shulmasynZarts: {
    hp: 118,
    posture: 92,
    radius: 23,
    speed: 72,
    damage: 20,
    aggroRange: 225,
    attackRange: 82,
    score: 55,
    xp: 42,
  },
  shulmasynBaatar: {
    hp: 420,
    posture: 180,
    radius: 34,
    speed: 84,
    damage: 24,
    aggroRange: 999,
    attackRange: 116,
    score: 250,
    xp: 180,
  },
};

const ROUTE_ENEMY_LABELS: Record<RouteEnemyKind, string> = {
  talynHaragch: "Талын харагч",
  shulmasynHuu: "Шулмасын хүү",
  shidetHarvaach: "Шидэт харваач",
  shulmasynZarts: "Шулмасын зарц",
  shulmasynBaatar: "Шулмасын баатар",
};

const ROUTE_ENEMY_COLORS: Record<RouteEnemyKind, string> = {
  talynHaragch: "#7b4a38",
  shulmasynHuu: "#6f6258",
  shidetHarvaach: "#6f4b91",
  shulmasynZarts: "#4d3a32",
  shulmasynBaatar: "#3a2738",
};

function createEnemy(
  id: number,
  kind: RouteEnemyKind,
  pos: Vector2,
): RouteEnemy {
  const config = ROUTE_CONFIG[kind];
  return {
    id,
    kind,
    pos: { ...pos },
    spawnPos: { ...pos },
    vel: { x: 0, y: 0 },
    facing: -1,
    radius: config.radius,
    speed: config.speed,
    hp: config.hp,
    maxHp: config.hp,
    posture: config.posture,
    maxPosture: config.posture,
    postureRegenDelay: 0,
    damage: config.damage,
    aggroRange: config.aggroRange,
    attackRange: config.attackRange,
    attackCooldown: 0.35,
    phase: "idle",
    phaseTimer: 0,
    attackDirection: { x: -1, y: 0 },
    retreatDirection: { x: 1, y: 0 },
    attackKind:
      kind === "shulmasynHuu"
        ? "rush"
        : kind === "shidetHarvaach"
          ? "bolt"
          : kind === "shulmasynBaatar"
            ? "bossOverhead"
            : "melee",
    attackIndex: 0,
    attackHitDone: false,
    flash: 0,
    deathTimer: 0,
    alive: true,
    engaged: false,
  };
}

export function createFirstRoute(spawn: Vector2): FirstRoute {
  const enemies: RouteEnemy[] = [
    createEnemy(6001, "talynHaragch", {
      x: clamp(spawn.x + 520, 80, WORLD_W - 80),
      y: clamp(spawn.y + 72, 80, WORLD_H - 80),
    }),
    createEnemy(6002, "shulmasynHuu", {
      x: clamp(spawn.x + 710, 80, WORLD_W - 80),
      y: clamp(spawn.y - 132, 80, WORLD_H - 80),
    }),
    createEnemy(6003, "shidetHarvaach", {
      x: clamp(spawn.x + 885, 80, WORLD_W - 80),
      y: clamp(spawn.y + 86, 80, WORLD_H - 80),
    }),
    createEnemy(6004, "shulmasynZarts", {
      x: clamp(spawn.x + 1035, 80, WORLD_W - 80),
      y: clamp(spawn.y - 104, 80, WORLD_H - 80),
    }),
    createEnemy(6005, "talynHaragch", {
      x: clamp(spawn.x + 1065, 80, WORLD_W - 80),
      y: clamp(spawn.y + 126, 80, WORLD_H - 80),
    }),
  ];

  return {
    active: true,
    complete: false,
    introductionShown: false,
    gateMessageShown: false,
    startX: clamp(spawn.x + 350, 80, WORLD_W - 80),
    gatePos: {
      x: Math.min(WORLD_W - 105, spawn.x + 1180),
      y: clamp(spawn.y, 90, WORLD_H - 90),
    },
    gateRadius: 74,
    arenaCenter: {
      x: WORLD_W - 300,
      y: 330,
    },
    arenaRadius: 225,
    bossStarted: false,
    bossDefeated: false,
    swordDrop: {
      pos: { x: WORLD_W - 300, y: 330 },
      visible: false,
      collected: false,
    },
    enemies,
    bolts: [],
    defeated: 0,
    total: enemies.length,
  };
}

export function routeEnemyLabel(kind: RouteEnemyKind): string {
  return ROUTE_ENEMY_LABELS[kind];
}

function safeDirection(
  from: Vector2,
  to: Vector2,
  fallback: Vector2,
): Vector2 {
  const direction = normalize({
    x: to.x - from.x,
    y: to.y - from.y,
  });
  if (direction.x !== 0 || direction.y !== 0) return direction;
  const safeFallback = normalize(fallback);
  return safeFallback.x === 0 && safeFallback.y === 0
    ? { x: 0, y: 1 }
    : safeFallback;
}

function setEnemyFacing(enemy: RouteEnemy, direction: Vector2): void {
  if (Math.abs(direction.x) > 0.08) {
    enemy.facing = direction.x < 0 ? -1 : 1;
  }
}

function moveEnemy(
  enemy: RouteEnemy,
  direction: Vector2,
  speed: number,
  dt: number,
): void {
  enemy.vel = {
    x: direction.x * speed,
    y: direction.y * speed,
  };
  enemy.pos.x = clamp(
    enemy.pos.x + enemy.vel.x * dt,
    enemy.radius,
    WORLD_W - enemy.radius,
  );
  enemy.pos.y = clamp(
    enemy.pos.y + enemy.vel.y * dt,
    enemy.radius,
    WORLD_H - enemy.radius,
  );
  setEnemyFacing(enemy, direction);
}

function stopEnemy(enemy: RouteEnemy): void {
  enemy.vel = { x: 0, y: 0 };
}

function resolvePlayerBodyContact(
  state: GameState,
  enemy: RouteEnemy,
): void {
  const player = state.player;
  const minimumDistance = enemy.radius + player.radius + 3;
  const currentDistance = dist(enemy.pos, player.pos);
  if (currentDistance >= minimumDistance || currentDistance <= 0.001) return;

  const away = normalize({
    x: player.pos.x - enemy.pos.x,
    y: player.pos.y - enemy.pos.y,
  });
  const correction = minimumDistance - currentDistance;
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

function damagePlayerFromRouteEnemy(
  state: GameState,
  enemy: RouteEnemy,
  damage: number,
  knockback: number,
): boolean {
  const player = state.player;
  if (player.invuln > 0 || state.phase !== "playing") return false;

  const healthBefore = player.vitals.health;
  damagePastoralPlayer(state, damage);
  const healthDamage = Math.max(0, healthBefore - player.vitals.health);
  player.invuln = 0.55;
  state.fx.hurtFlash = 1;
  const heavyEnemy =
    enemy.kind === "shulmasynZarts" ||
    enemy.kind === "shulmasynBaatar";
  state.fx.shake = Math.max(
    state.fx.shake,
    enemy.kind === "shulmasynBaatar" ? 10 : heavyEnemy ? 8 : 5,
  );

  const away = safeDirection(enemy.pos, player.pos, {
    x: -enemy.attackDirection.x,
    y: -enemy.attackDirection.y,
  });
  player.pos.x = clamp(
    player.pos.x + away.x * knockback,
    player.radius,
    WORLD_W - player.radius,
  );
  player.pos.y = clamp(
    player.pos.y + away.y * knockback,
    player.radius,
    WORLD_H - player.radius,
  );

  sfx("hurt");
  triggerHitStop(
    state,
    enemy.kind === "shulmasynBaatar"
      ? 0.075
      : enemy.kind === "shulmasynZarts"
        ? 0.065
        : 0.05,
  );
  spawnImpactBurst(state, player.pos, {
    heavy: heavyEnemy,
    color: "#d64545",
  });
  spawnParticles(state, player.pos, 9, "#d64545", {
    speed: 95,
    size: 2.7,
  });
  spawnText(
    state,
    player.pos,
    healthDamage > 0
      ? `−${Math.round(healthDamage)}`
      : "Морь хамгаалав",
    healthDamage > 0 ? "#ff7068" : "#d7bf86",
  );

  if (player.vitals.health <= 0) {
    state.phase = "lost";
    setMessage(state, `${routeEnemyLabel(enemy.kind)}-д ялагдлаа…`, 99);
  }
  return true;
}

export function isRouteEnemyParryThreat(enemy: RouteEnemy): boolean {
  if (!enemy.alive) return false;
  if (
    enemy.kind === "shulmasynHuu" ||
    enemy.kind === "shidetHarvaach"
  ) {
    return false;
  }

  if (enemy.kind === "shulmasynBaatar") {
    if (enemy.attackKind === "bossCharge") return false;
    if (
      enemy.attackKind !== "bossOverhead" &&
      enemy.attackKind !== "bossSweep"
    ) {
      return false;
    }
    if (enemy.phase === "attacking") return true;
    if (enemy.phase !== "windup") return false;
    return enemy.phaseTimer <=
      (enemy.attackKind === "bossOverhead" ? 0.3 : 0.24);
  }

  if (enemy.phase === "attacking") return true;
  if (enemy.phase !== "windup") return false;
  return enemy.phaseTimer <=
    (enemy.kind === "shulmasynZarts" ? 0.26 : 0.22);
}

export function damageRouteEnemyPosture(
  state: GameState,
  enemy: RouteEnemy,
  amount: number,
): boolean {
  if (!enemy.alive || amount <= 0 || enemy.phase === "stunned") return false;

  enemy.posture = Math.max(0, enemy.posture - amount);
  enemy.postureRegenDelay = 2.4;
  if (enemy.posture > 0) return false;

  enemy.phase = "stunned";
  enemy.phaseTimer =
    enemy.kind === "shulmasynBaatar"
      ? 2.45
      : enemy.kind === "shulmasynZarts"
        ? 2.1
        : 1.6;
  enemy.attackCooldown = Math.max(enemy.attackCooldown, enemy.phaseTimer);
  enemy.attackHitDone = true;
  stopEnemy(enemy);

  state.fx.shake = Math.max(
    state.fx.shake,
    enemy.kind === "shulmasynBaatar"
      ? 10
      : enemy.kind === "shulmasynZarts"
        ? 8
        : 6,
  );
  spawnText(
    state,
    enemy.pos,
    enemy.kind === "shulmasynBaatar"
      ? "БИЕ СУЛАРЛАА!"
      : "POSTURE BREAK!",
    "#ffe08a",
  );
  return true;
}

export function parryRouteEnemy(
  state: GameState,
  enemy: RouteEnemy,
): void {
  if (!isRouteEnemyParryThreat(enemy)) return;

  const postureDamage =
    enemy.kind === "shulmasynBaatar"
      ? 68
      : enemy.kind === "shulmasynZarts"
        ? 52
        : 38;
  const broken = damageRouteEnemyPosture(state, enemy, postureDamage);
  if (!broken) {
    enemy.phase = "recovery";
    enemy.phaseTimer =
      enemy.kind === "shulmasynBaatar"
        ? 0.95
        : enemy.kind === "shulmasynZarts"
          ? 0.82
          : 0.58;
    enemy.attackCooldown = Math.max(enemy.attackCooldown, 0.95);
    enemy.attackHitDone = true;
    stopEnemy(enemy);
  }

  state.player.parryPhase = "recovery";
  state.player.parryTimer = 0.12;
  state.player.parryArmed = false;
  state.player.invuln = Math.max(state.player.invuln, 0.16);
  triggerHitStop(state, 0.08);
  state.fx.shake = Math.max(
    state.fx.shake,
    enemy.kind === "shulmasynBaatar"
      ? 10
      : enemy.kind === "shulmasynZarts"
        ? 8
        : 6,
  );
  spawnImpactBurst(state, enemy.pos, {
    heavy:
      enemy.kind === "shulmasynZarts" ||
      enemy.kind === "shulmasynBaatar",
    color: "#ffe08a",
  });
  spawnParticles(state, enemy.pos, 16, "#ffe08a", {
    speed: 145,
    size: 2.8,
  });
  spawnText(state, enemy.pos, `PARRY! −${postureDamage}`, "#fff0a8");
  sfx("parry");
}

function completeRouteIfCleared(state: GameState): boolean {
  const route = routeOf(state);
  if (route.complete) return false;
  if (route.enemies.some((enemy) => enemy.alive)) return false;

  route.complete = true;
  route.defeated = route.total;
  route.bolts = [];
  setMessage(
    state,
    "Эхний зам цэвэрлэгдлээ. Хараалт хаалганы цаана mini-boss хүлээж байна.",
    5,
  );
  spawnParticles(state, route.gatePos, 28, "#e8c56a", {
    speed: 120,
    size: 3.2,
  });
  state.fx.shake = Math.max(state.fx.shake, 5);
  sfx("levelup");
  return true;
}

export function damageRouteEnemy(
  state: GameState,
  enemy: RouteEnemy,
  damage: number,
): void {
  if (!enemy.alive || damage <= 0) return;

  enemy.hp -= damage;
  enemy.flash = 0.13;
  enemy.engaged = true;
  sfx("hit");
  spawnParticles(state, enemy.pos, 8, ROUTE_ENEMY_COLORS[enemy.kind], {
    speed: enemy.kind === "shulmasynBaatar" ? 130 : 100,
    size: enemy.kind === "shulmasynBaatar" ? 3.2 : 2.4,
  });
  if (enemy.hp > 0) return;

  enemy.hp = 0;
  enemy.alive = false;
  enemy.deathTimer =
    enemy.kind === "shulmasynBaatar" ? 2.1 : 1.25;
  stopEnemy(enemy);

  const route = routeOf(state);
  const isBoss = enemy.kind === "shulmasynBaatar";
  let routeCompleted = false;
  if (isBoss) {
    route.bossDefeated = true;
    route.swordDrop.visible = true;
    route.swordDrop.collected = false;
    route.swordDrop.pos = { ...enemy.pos };
  } else {
    route.defeated += 1;
    routeCompleted = completeRouteIfCleared(state);
  }

  const config = ROUTE_CONFIG[enemy.kind];
  state.score += config.score;
  gainXp(state, config.xp);
  sfx("kill");
  spawnSoulRelease(
    state,
    enemy.pos,
    enemy.radius,
    isBoss
      ? "#f0e4ff"
      : enemy.kind === "shidetHarvaach"
        ? "#d9c8ff"
        : "#d8f4ff",
  );
  spawnParticles(
    state,
    enemy.pos,
    isBoss ? 34 : 12,
    isBoss ? "#c9a6ff" : "#d8f4ff",
    {
      speed: isBoss ? 175 : 110,
      size: isBoss ? 3.6 : 2.6,
    },
  );
  spawnText(
    state,
    enemy.pos,
    `+${config.score} · +${config.xp} XP`,
    "#ffd060",
  );

  if (isBoss) {
    setMessage(
      state,
      "Шулмасын баатар унав. Хөх тэнгэрийн сэлэм газарт үлдлээ.",
      5,
    );
    state.fx.shake = Math.max(state.fx.shake, 12);
    triggerHitStop(state, 0.12);
  } else if (!routeCompleted) {
    setMessage(state, `${routeEnemyLabel(enemy.kind)}-ын сүнс одлоо.`, 1.7);
  }
}

function updatePosture(enemy: RouteEnemy, dt: number): void {
  enemy.postureRegenDelay = Math.max(0, enemy.postureRegenDelay - dt);
  if (
    enemy.phase === "stunned" ||
    enemy.postureRegenDelay > 0 ||
    enemy.posture >= enemy.maxPosture
  ) {
    return;
  }
  const rate =
    enemy.kind === "shulmasynBaatar"
      ? 7
      : enemy.kind === "shulmasynZarts"
        ? 9
        : 13;
  enemy.posture = Math.min(enemy.maxPosture, enemy.posture + rate * dt);
}

function startLockedMeleeWindup(
  enemy: RouteEnemy,
  playerPos: Vector2,
): void {
  enemy.phase = "windup";
  enemy.phaseTimer = enemy.kind === "shulmasynZarts" ? 0.88 : 0.56;
  enemy.attackHitDone = false;
  enemy.attackDirection = safeDirection(
    enemy.pos,
    playerPos,
    { x: enemy.facing, y: 0 },
  );
  setEnemyFacing(enemy, enemy.attackDirection);
  stopEnemy(enemy);
}

function updateMeleeRouteEnemy(
  state: GameState,
  enemy: RouteEnemy,
  dt: number,
): void {
  const player = state.player;
  const config = ROUTE_CONFIG[enemy.kind];
  const dPlayer = dist(enemy.pos, player.pos);

  if (enemy.phase === "windup") {
    stopEnemy(enemy);
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    if (enemy.phaseTimer <= 0) {
      enemy.phase = "attacking";
      enemy.phaseTimer =
        enemy.kind === "shulmasynZarts" ? 0.22 : 0.16;
      enemy.attackHitDone = false;
    }
    return;
  }

  if (enemy.phase === "attacking") {
    stopEnemy(enemy);
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    const toPlayer = safeDirection(
      enemy.pos,
      player.pos,
      enemy.attackDirection,
    );
    const facingDot =
      toPlayer.x * enemy.attackDirection.x +
      toPlayer.y * enemy.attackDirection.y;
    const hitRange =
      enemy.radius +
      player.radius +
      (enemy.kind === "shulmasynZarts" ? 48 : 28);

    if (
      !enemy.attackHitDone &&
      dPlayer <= hitRange &&
      facingDot >= 0.25
    ) {
      enemy.attackHitDone = true;
      if (
        player.parryPhase === "active" &&
        player.parryArmed &&
        isRouteEnemyParryThreat(enemy)
      ) {
        parryRouteEnemy(state, enemy);
      } else {
        damagePlayerFromRouteEnemy(
          state,
          enemy,
          config.damage,
          enemy.kind === "shulmasynZarts" ? 36 : 24,
        );
      }
    }

    if (enemy.phase === "attacking" && enemy.phaseTimer <= 0) {
      enemy.phase = "recovery";
      enemy.phaseTimer =
        enemy.kind === "shulmasynZarts" ? 0.92 : 0.58;
      enemy.attackCooldown =
        enemy.kind === "shulmasynZarts" ? 1.25 : 0.82;
    }
    return;
  }

  if (enemy.phase === "recovery") {
    stopEnemy(enemy);
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    if (enemy.phaseTimer <= 0) enemy.phase = "chasing";
    return;
  }

  if (dPlayer <= config.attackRange && enemy.attackCooldown <= 0) {
    startLockedMeleeWindup(enemy, player.pos);
    return;
  }

  const minimumCenterDistance =
    enemy.radius +
    player.radius +
    (enemy.kind === "shulmasynZarts" ? 34 : 24);
  if (dPlayer > minimumCenterDistance) {
    const direction = safeDirection(
      enemy.pos,
      player.pos,
      { x: enemy.facing, y: 0 },
    );
    const travel = Math.min(
      enemy.speed * dt,
      Math.max(0, dPlayer - minimumCenterDistance),
    );
    moveEnemy(
      enemy,
      direction,
      travel / Math.max(dt, 0.0001),
      dt,
    );
  } else {
    stopEnemy(enemy);
  }
}

function startShulmasynHuuRush(
  enemy: RouteEnemy,
  playerPos: Vector2,
): void {
  enemy.phase = "windup";
  enemy.phaseTimer = 0.34;
  enemy.attackDirection = safeDirection(
    enemy.pos,
    playerPos,
    { x: enemy.facing, y: 0 },
  );
  enemy.attackHitDone = false;
  stopEnemy(enemy);
  setEnemyFacing(enemy, enemy.attackDirection);
}

function updateShulmasynHuu(
  state: GameState,
  enemy: RouteEnemy,
  dt: number,
): void {
  const player = state.player;
  const dPlayer = dist(enemy.pos, player.pos);

  if (enemy.phase === "windup") {
    stopEnemy(enemy);
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    if (enemy.phaseTimer <= 0) {
      enemy.phase = "attacking";
      enemy.phaseTimer = 0.24;
      enemy.attackHitDone = false;
    }
    return;
  }

  if (enemy.phase === "attacking") {
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    moveEnemy(enemy, enemy.attackDirection, 405, dt);
    if (
      !enemy.attackHitDone &&
      dist(enemy.pos, player.pos) <= enemy.radius + player.radius + 12
    ) {
      enemy.attackHitDone = true;
      if (player.invuln > 0) {
        spawnText(state, player.pos, "DODGE!", "#b8e8ff");
      } else {
        damagePlayerFromRouteEnemy(state, enemy, enemy.damage, 28);
      }
    }
    if (enemy.phaseTimer <= 0) {
      enemy.phase = "retreating";
      enemy.phaseTimer = 0.62;
      enemy.retreatDirection = safeDirection(
        player.pos,
        enemy.pos,
        {
          x: -enemy.attackDirection.x,
          y: -enemy.attackDirection.y,
        },
      );
    }
    return;
  }

  if (enemy.phase === "retreating") {
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    moveEnemy(enemy, enemy.retreatDirection, 180, dt);
    if (enemy.phaseTimer <= 0) {
      enemy.phase = "recovery";
      enemy.phaseTimer = 0.34;
      enemy.attackCooldown = 0.9;
    }
    return;
  }

  if (enemy.phase === "recovery") {
    stopEnemy(enemy);
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    if (enemy.phaseTimer <= 0) enemy.phase = "chasing";
    return;
  }

  if (dPlayer <= enemy.attackRange && enemy.attackCooldown <= 0) {
    startShulmasynHuuRush(enemy, player.pos);
    return;
  }

  if (dPlayer > 88) {
    moveEnemy(
      enemy,
      safeDirection(
        enemy.pos,
        player.pos,
        { x: enemy.facing, y: 0 },
      ),
      enemy.speed,
      dt,
    );
  } else {
    stopEnemy(enemy);
  }
}

function spawnEnemyBolt(state: GameState, enemy: RouteEnemy): void {
  const direction = safeDirection(
    enemy.pos,
    state.player.pos,
    enemy.attackDirection,
  );
  const speed = 270;
  routeOf(state).bolts.push({
    pos: {
      x: enemy.pos.x + direction.x * (enemy.radius + 7),
      y: enemy.pos.y - 10 + direction.y * (enemy.radius + 7),
    },
    vel: {
      x: direction.x * speed,
      y: direction.y * speed,
    },
    radius: 7,
    damage: enemy.damage,
    life: 2.5,
  });
  sfx("shoot");
  spawnParticles(state, enemy.pos, 8, "#b890ff", {
    speed: 70,
    size: 2.4,
  });
}

function updateHarvaach(
  state: GameState,
  enemy: RouteEnemy,
  dt: number,
): void {
  const player = state.player;
  const dPlayer = dist(enemy.pos, player.pos);

  if (enemy.phase === "windup") {
    stopEnemy(enemy);
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    if (enemy.phaseTimer <= 0) {
      spawnEnemyBolt(state, enemy);
      enemy.phase = "recovery";
      enemy.phaseTimer = 0.52;
      enemy.attackCooldown = 1.35;
    }
    return;
  }

  if (enemy.phase === "recovery") {
    stopEnemy(enemy);
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    if (enemy.phaseTimer <= 0) enemy.phase = "chasing";
    return;
  }

  if (dPlayer <= enemy.attackRange && enemy.attackCooldown <= 0) {
    enemy.phase = "windup";
    enemy.phaseTimer = 0.82;
    enemy.attackDirection = safeDirection(
      enemy.pos,
      player.pos,
      { x: enemy.facing, y: 0 },
    );
    setEnemyFacing(enemy, enemy.attackDirection);
    stopEnemy(enemy);
    return;
  }

  if (dPlayer < 140) {
    moveEnemy(
      enemy,
      safeDirection(
        player.pos,
        enemy.pos,
        { x: -enemy.facing, y: 0 },
      ),
      enemy.speed,
      dt,
    );
  } else if (dPlayer > 235) {
    moveEnemy(
      enemy,
      safeDirection(
        enemy.pos,
        player.pos,
        { x: enemy.facing, y: 0 },
      ),
      enemy.speed * 0.72,
      dt,
    );
  } else {
    stopEnemy(enemy);
  }
}

const BOSS_OVERHEAD_WINDUP = 0.86;
const BOSS_OVERHEAD_ACTIVE = 0.24;
const BOSS_SWEEP_WINDUP = 0.68;
const BOSS_SWEEP_ACTIVE = 0.3;
const BOSS_CHARGE_WINDUP = 0.52;
const BOSS_CHARGE_ACTIVE = 0.58;
const BOSS_CHARGE_SPEED = 390;

function confinePositionToArena(
  pos: Vector2,
  radius: number,
  center: Vector2,
  arenaRadius: number,
): void {
  const offset = {
    x: pos.x - center.x,
    y: pos.y - center.y,
  };
  const distanceFromCenter = Math.hypot(offset.x, offset.y);
  const maxDistance = Math.max(12, arenaRadius - radius);
  if (
    distanceFromCenter <= maxDistance ||
    distanceFromCenter <= 0.001
  ) {
    return;
  }
  const scale = maxDistance / distanceFromCenter;
  pos.x = center.x + offset.x * scale;
  pos.y = center.y + offset.y * scale;
}

function beginMiniBossAttack(
  enemy: RouteEnemy,
  playerPos: Vector2,
): void {
  const pattern = enemy.attackIndex % 3;
  enemy.attackIndex += 1;
  enemy.phase = "windup";
  enemy.attackHitDone = false;
  enemy.attackDirection = safeDirection(
    enemy.pos,
    playerPos,
    { x: enemy.facing, y: 0 },
  );
  setEnemyFacing(enemy, enemy.attackDirection);
  stopEnemy(enemy);

  if (pattern === 0) {
    enemy.attackKind = "bossOverhead";
    enemy.phaseTimer = BOSS_OVERHEAD_WINDUP;
  } else if (pattern === 1) {
    enemy.attackKind = "bossCharge";
    enemy.phaseTimer = BOSS_CHARGE_WINDUP;
  } else {
    enemy.attackKind = "bossSweep";
    enemy.phaseTimer = BOSS_SWEEP_WINDUP;
  }
}

function enterMiniBossRecovery(enemy: RouteEnemy): void {
  enemy.phase = "recovery";
  enemy.phaseTimer =
    enemy.attackKind === "bossCharge"
      ? 0.96
      : enemy.attackKind === "bossOverhead"
        ? 0.82
        : 0.72;
  enemy.attackCooldown = 0.72;
  stopEnemy(enemy);
}

function updateMiniBoss(
  state: GameState,
  enemy: RouteEnemy,
  dt: number,
): void {
  const player = state.player;
  const route = routeOf(state);
  const dPlayer = dist(enemy.pos, player.pos);

  if (enemy.phase === "windup") {
    stopEnemy(enemy);
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    if (enemy.phaseTimer <= 0) {
      enemy.phase = "attacking";
      enemy.attackHitDone = false;
      enemy.phaseTimer =
        enemy.attackKind === "bossCharge"
          ? BOSS_CHARGE_ACTIVE
          : enemy.attackKind === "bossOverhead"
            ? BOSS_OVERHEAD_ACTIVE
            : BOSS_SWEEP_ACTIVE;
    }
    return;
  }

  if (enemy.phase === "attacking") {
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    if (enemy.attackKind === "bossCharge") {
      moveEnemy(enemy, enemy.attackDirection, BOSS_CHARGE_SPEED, dt);
      if (
        !enemy.attackHitDone &&
        dist(enemy.pos, player.pos) <=
          enemy.radius + player.radius + 12
      ) {
        enemy.attackHitDone = true;
        if (player.invuln > 0) {
          spawnText(state, player.pos, "DODGE!", "#b8e8ff");
        } else {
          damagePlayerFromRouteEnemy(
            state,
            enemy,
            Math.round(enemy.damage * 1.2),
            52,
          );
        }
      }
    } else {
      stopEnemy(enemy);
      const toPlayer = safeDirection(
        enemy.pos,
        player.pos,
        enemy.attackDirection,
      );
      const facingDot =
        toPlayer.x * enemy.attackDirection.x +
        toPlayer.y * enemy.attackDirection.y;
      const hitRange =
        enemy.radius +
        player.radius +
        (enemy.attackKind === "bossSweep" ? 78 : 58);
      const frontDot =
        enemy.attackKind === "bossSweep" ? 0.08 : 0.2;
      if (
        !enemy.attackHitDone &&
        dPlayer <= hitRange &&
        facingDot >= frontDot
      ) {
        enemy.attackHitDone = true;
        if (
          player.parryPhase === "active" &&
          player.parryArmed &&
          isRouteEnemyParryThreat(enemy)
        ) {
          parryRouteEnemy(state, enemy);
        } else {
          damagePlayerFromRouteEnemy(
            state,
            enemy,
            enemy.attackKind === "bossOverhead"
              ? Math.round(enemy.damage * 1.15)
              : enemy.damage,
            enemy.attackKind === "bossOverhead" ? 46 : 38,
          );
        }
      }
    }

    confinePositionToArena(
      enemy.pos,
      enemy.radius,
      route.arenaCenter,
      route.arenaRadius,
    );
    if (enemy.phase === "attacking" && enemy.phaseTimer <= 0) {
      enterMiniBossRecovery(enemy);
    }
    return;
  }

  if (enemy.phase === "recovery") {
    stopEnemy(enemy);
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    if (enemy.phaseTimer <= 0) {
      enemy.phase = "chasing";
      enemy.attackHitDone = false;
    }
    return;
  }

  if (enemy.attackCooldown <= 0 && dPlayer <= 145) {
    beginMiniBossAttack(enemy, player.pos);
    return;
  }

  const minimumDistance = enemy.radius + player.radius + 48;
  if (dPlayer > minimumDistance) {
    const direction = safeDirection(
      enemy.pos,
      player.pos,
      { x: enemy.facing, y: 0 },
    );
    const travel = Math.min(
      enemy.speed * dt,
      Math.max(0, dPlayer - minimumDistance),
    );
    moveEnemy(
      enemy,
      direction,
      travel / Math.max(dt, 0.0001),
      dt,
    );
  } else if (enemy.attackCooldown <= 0) {
    beginMiniBossAttack(enemy, player.pos);
  } else {
    stopEnemy(enemy);
  }
  confinePositionToArena(
    enemy.pos,
    enemy.radius,
    route.arenaCenter,
    route.arenaRadius,
  );
}

function confineMiniBossEncounter(state: GameState): void {
  const route = routeOf(state);
  if (!route.bossStarted || route.bossDefeated) return;
  confinePositionToArena(
    state.player.pos,
    state.player.radius,
    route.arenaCenter,
    route.arenaRadius,
  );
}

function updateRouteBolts(state: GameState, dt: number): void {
  const route = routeOf(state);
  for (const bolt of route.bolts) {
    bolt.pos.x += bolt.vel.x * dt;
    bolt.pos.y += bolt.vel.y * dt;
    bolt.life -= dt;
    if (bolt.life <= 0) continue;

    if (
      dist(bolt.pos, state.player.pos) <=
      bolt.radius + state.player.radius
    ) {
      if (state.player.invuln > 0) {
        spawnText(state, state.player.pos, "DODGE!", "#b8e8ff");
      } else {
        const archer = route.enemies.find(
          (enemy) => enemy.kind === "shidetHarvaach",
        );
        if (archer) {
          damagePlayerFromRouteEnemy(
            state,
            archer,
            bolt.damage,
            18,
          );
        }
      }
      bolt.life = 0;
    }
  }
  route.bolts = route.bolts.filter(
    (bolt) =>
      bolt.life > 0 &&
      bolt.pos.x > -20 &&
      bolt.pos.x < WORLD_W + 20 &&
      bolt.pos.y > -20 &&
      bolt.pos.y < WORLD_H + 20,
  );
}

export function updateFirstRoute(state: GameState, dt: number): void {
  const route = routeOf(state);
  if (!route.active) return;

  completeRouteIfCleared(state);
  if (state.phase !== "playing") return;

  if (
    !route.introductionShown &&
    state.player.pos.x >= route.startX
  ) {
    route.introductionShown = true;
    setMessage(
      state,
      "Эхний зам: 4 төрлийн дайсныг давж, хараалт хаалгад хүр.",
      4,
    );
  }

  updateRouteBolts(state, dt);
  if (state.phase !== "playing") return;
  for (const enemy of route.enemies) {
    if (!enemy.alive) {
      enemy.deathTimer = Math.max(0, enemy.deathTimer - dt);
      continue;
    }

    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    updatePosture(enemy, dt);

    if (enemy.phase === "stunned") {
      enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
      stopEnemy(enemy);
      if (enemy.phaseTimer <= 0) {
        enemy.posture = Math.max(1, enemy.maxPosture * 0.45);
        enemy.postureRegenDelay = 1.2;
        enemy.phase = "recovery";
        enemy.phaseTimer =
          enemy.kind === "shulmasynBaatar" ? 0.72 : 0.42;
        enemy.attackHitDone = false;
      }
      resolvePlayerBodyContact(state, enemy);
      continue;
    }

    if (enemy.kind === "shulmasynBaatar") {
      enemy.engaged = true;
      updateMiniBoss(state, enemy, dt);
      resolvePlayerBodyContact(state, enemy);
      if (state.phase !== "playing") return;
      continue;
    }

    const dPlayer = dist(enemy.pos, state.player.pos);
    const dHome = dist(enemy.pos, enemy.spawnPos);
    if (!enemy.engaged && dPlayer <= enemy.aggroRange) {
      enemy.engaged = true;
      enemy.phase = "chasing";
      setMessage(
        state,
        `${routeEnemyLabel(enemy.kind)} тулалдаанд орлоо.`,
        1.5,
      );
    }
    if (!enemy.engaged) {
      stopEnemy(enemy);
      continue;
    }

    if (dPlayer > enemy.aggroRange + 180) {
      enemy.phase = "chasing";
      if (dHome > 24) {
        moveEnemy(
          enemy,
          safeDirection(
            enemy.pos,
            enemy.spawnPos,
            { x: -enemy.facing, y: 0 },
          ),
          enemy.speed,
          dt,
        );
      }
      if (dist(enemy.pos, enemy.spawnPos) <= 24) {
        enemy.pos.x = enemy.spawnPos.x;
        enemy.pos.y = enemy.spawnPos.y;
        stopEnemy(enemy);
        enemy.engaged = false;
        enemy.phase = "idle";
        enemy.hp = Math.min(
          enemy.maxHp,
          enemy.hp + enemy.maxHp * 0.2,
        );
      }
      continue;
    }

    if (enemy.kind === "shulmasynHuu") {
      updateShulmasynHuu(state, enemy, dt);
    } else if (enemy.kind === "shidetHarvaach") {
      updateHarvaach(state, enemy, dt);
    } else {
      updateMeleeRouteEnemy(state, enemy, dt);
    }
    resolvePlayerBodyContact(state, enemy);
    if (state.phase !== "playing") return;
  }

  completeRouteIfCleared(state);
  confineMiniBossEncounter(state);
}

export function tryInteractFirstRoute(state: GameState): boolean {
  if (!state.input.interact) return false;

  const route = routeOf(state);
  const encounter = state.world.tumurShulmas;
  const nearFinalGate =
    !encounter.active &&
    dist(state.player.pos, encounter.gatePos) <=
      encounter.gateRadius + 28;

  if (nearFinalGate && !encounter.unlocked) {
    state.input.interact = false;
    setMessage(
      state,
      "Хар төмөр хаалгыг Хөх тэнгэрийн сэлэм л нээнэ.",
      2.8,
    );
    sfx("move");
    return true;
  }
  if (encounter.unlocked && tryInteractTumurShulmasGate(state)) {
    return true;
  }

  const drop = route.swordDrop;
  const nearSword =
    drop.visible &&
    !drop.collected &&
    dist(state.player.pos, drop.pos) <= state.player.radius + 54;
  if (nearSword) {
    state.input.interact = false;
    drop.visible = false;
    drop.collected = true;
    encounter.unlocked = true;
    state.player.hasSkySword = true;
    state.player.weapon = "skySword";
    state.player.stamina = state.player.maxStamina;
    state.player.staminaRegenDelay = 0;
    state.score += 150;

    spawnParticles(state, drop.pos, 38, "#b9eaff", {
      speed: 170,
      size: 3.4,
    });
    spawnSoulRelease(state, drop.pos, 30, "#d8f5ff");
    spawnText(
      state,
      drop.pos,
      "+ ХӨХ ТЭНГЭРИЙН СЭЛЭМ",
      "#d9f4ff",
    );
    setMessage(
      state,
      "Хөх тэнгэрийн сэлмийг авлаа. Хар төмөр хаалга нээгдэв. 1: таяг · 2: сэлэм",
      5.5,
    );
    state.fx.shake = Math.max(state.fx.shake, 8);
    triggerHitStop(state, 0.1);
    sfx("levelup");
    return true;
  }

  if (
    dist(state.player.pos, route.gatePos) >
    route.gateRadius + 24
  ) {
    return false;
  }
  state.input.interact = false;

  if (!route.complete) {
    const remaining = route.enemies.filter(
      (enemy) => enemy.alive,
    ).length;
    setMessage(
      state,
      `Хараалт хаалга түгжээтэй. Замын ${remaining} дайсан үлдлээ.`,
      2.5,
    );
    sfx("move");
    return true;
  }

  if (route.bossStarted) {
    setMessage(
      state,
      route.bossDefeated
        ? route.swordDrop.collected
          ? "Хөх тэнгэрийн сэлэм чиний мэдэлд орсон."
          : "Шулмасын баатар унасан. Сэлэм газарт хүлээж байна."
        : "Шулмасын баатартай тулаан үргэлжилж байна.",
      2.5,
    );
    sfx("move");
    return true;
  }

  route.gateMessageShown = true;
  route.bossStarted = true;
  route.bossDefeated = false;
  route.bolts = [];

  const boss = createEnemy(6100, "shulmasynBaatar", {
    x: route.arenaCenter.x,
    y: route.arenaCenter.y - 42,
  });
  boss.engaged = true;
  boss.phase = "chasing";
  boss.attackCooldown = 0.9;
  boss.facing = 1;
  boss.attackDirection = { x: 0, y: 1 };
  route.enemies.push(boss);

  state.player.pos = {
    x: route.arenaCenter.x,
    y: route.arenaCenter.y + 158,
  };
  state.player.facing = { x: 0, y: -1 };
  state.player.moving = false;
  state.player.combatPhase = "idle";
  state.player.combatTimer = 0;
  state.player.attackMelee = false;
  state.player.dodgePhase = "idle";
  state.player.dodgeTimer = 0;
  state.player.parryPhase = "idle";
  state.player.parryTimer = 0;
  state.player.parryArmed = false;

  setMessage(
    state,
    "Шулмасын баатар зам хаалаа. Хараалтай талбайгаас зугтах аргагүй!",
    4.5,
  );
  spawnParticles(state, route.arenaCenter, 34, "#9d6ac8", {
    speed: 145,
    size: 3.2,
  });
  state.fx.shake = Math.max(state.fx.shake, 9);
  sfx("levelup");
  return true;
}

function drawEnemyHealthBars(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  x: number,
  y: number,
): void {
  if (enemy.kind === "shulmasynBaatar") return;
  if (!enemy.engaged && enemy.hp >= enemy.maxHp) return;

  const width = enemy.kind === "shulmasynZarts" ? 62 : 48;
  const hpRatio = clamp(enemy.hp / enemy.maxHp, 0, 1);
  const postureRatio = clamp(
    enemy.posture / enemy.maxPosture,
    0,
    1,
  );
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(x - width / 2, y, width, 5);
  ctx.fillStyle = "#c84242";
  ctx.fillRect(x - width / 2, y, width * hpRatio, 5);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(x - width / 2, y + 7, width, 3);
  ctx.fillStyle = "#e2bd55";
  ctx.fillRect(x - width / 2, y + 7, width * postureRatio, 3);
}

function drawRouteTelegraph(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  x: number,
  y: number,
  time: number,
): void {
  if (enemy.phase !== "windup") return;

  const warning = isRouteEnemyParryThreat(enemy);
  const pulse = 0.65 + Math.sin(time * 13) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle =
    warning
      ? "#ff5252"
      : enemy.attackKind === "bossCharge"
        ? "#b887ff"
        : "#f2c45a";
  ctx.lineWidth =
    warning ? 4 : enemy.kind === "shulmasynBaatar" ? 3 : 2;
  ctx.beginPath();
  ctx.arc(
    x,
    y - (enemy.kind === "shulmasynBaatar" ? 28 : 18),
    enemy.radius +
      (enemy.kind === "shulmasynBaatar" ? 15 : 9),
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  if (
    enemy.kind === "shulmasynBaatar" &&
    enemy.attackKind === "bossCharge"
  ) {
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -time * 40;
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(
      x + enemy.attackDirection.x * 150,
      y - 12 + enemy.attackDirection.y * 150,
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawBasicRouteEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  flash: boolean,
  time: number,
): void {
  const baseColor = flash
    ? "#f6eee3"
    : ROUTE_ENEMY_COLORS[enemy.kind];
  const heavy = enemy.kind === "shulmasynZarts";
  const bodyWidth = heavy ? 19 : 14;
  const bodyTop = heavy ? -34 : -27;

  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.moveTo(-bodyWidth, 8);
  ctx.lineTo(-bodyWidth + 4, bodyTop);
  ctx.lineTo(bodyWidth - 4, bodyTop);
  ctx.lineTo(bodyWidth, 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = flash ? "#fff7eb" : heavy ? "#b17d5d" : "#b98763";
  ctx.beginPath();
  ctx.arc(0, bodyTop - 10, heavy ? 11 : 8, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.kind === "talynHaragch") {
    ctx.strokeStyle = flash ? "#fff" : "#8b663f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(7, -20);
    ctx.lineTo(24, 8);
    ctx.stroke();
    ctx.fillStyle = "#c7b075";
    ctx.beginPath();
    ctx.moveTo(22, 5);
    ctx.lineTo(28, 12);
    ctx.lineTo(20, 11);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = flash ? "#ffffff" : "#66564d";
    ctx.fillRect(-17, -22, 34, 8);
    ctx.strokeStyle = flash ? "#ffffff" : "#5f4635";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(12, -25);
    ctx.lineTo(27, 8);
    ctx.stroke();
    ctx.fillStyle = "#7a6a58";
    ctx.fillRect(22, -1, 13, 12);
  }

  if (enemy.phase === "windup") {
    ctx.strokeStyle = `rgba(242,196,90,${0.45 + Math.sin(time * 12) * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -12, heavy ? 48 : 38, -0.7, 0.7);
    ctx.stroke();
  }
}

function drawRushEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  flash: boolean,
): void {
  const rushing = enemy.phase === "attacking";
  if (rushing) ctx.rotate(-0.18);
  ctx.fillStyle = flash ? "#f6eee3" : ROUTE_ENEMY_COLORS.shulmasynHuu;
  ctx.beginPath();
  ctx.ellipse(0, -8, 16, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash ? "#ffffff" : "#94877a";
  ctx.beginPath();
  ctx.arc(4, -29, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = flash ? "#ffffff" : "#d8d0c4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-9, -20);
  ctx.lineTo(-18, -3);
  ctx.moveTo(10, -18);
  ctx.lineTo(19, -2);
  ctx.stroke();
  ctx.fillStyle = "#e54d4d";
  ctx.fillRect(6, -32, 2, 2);
}

function drawArcher(
  ctx: CanvasRenderingContext2D,
  flash: boolean,
  time: number,
): void {
  ctx.fillStyle = flash
    ? "#f6eee3"
    : ROUTE_ENEMY_COLORS.shidetHarvaach;
  ctx.beginPath();
  ctx.moveTo(-15, 7);
  ctx.lineTo(-10, -28);
  ctx.lineTo(10, -28);
  ctx.lineTo(15, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = flash ? "#fff8ef" : "#36273f";
  ctx.beginPath();
  ctx.arc(0, -32, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = flash ? "#ffffff" : "#8d6a45";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(10, -23);
  ctx.lineTo(21, 8);
  ctx.stroke();
  const glow = 4 + Math.sin(time * 9) * 1.5;
  ctx.fillStyle = "rgba(185,135,255,0.35)";
  ctx.beginPath();
  ctx.arc(20, -2, glow + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c8a5ff";
  ctx.beginPath();
  ctx.arc(20, -2, glow, 0, Math.PI * 2);
  ctx.fill();
}

function drawMiniBossBody(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  flash: boolean,
): void {
  const attacking = enemy.phase === "attacking";
  if (attacking && enemy.attackKind === "bossCharge") {
    ctx.rotate(0.16);
  }
  ctx.fillStyle = "rgba(12,8,16,0.42)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 38, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash
    ? "#f6eee3"
    : ROUTE_ENEMY_COLORS.shulmasynBaatar;
  ctx.beginPath();
  ctx.moveTo(-28, 10);
  ctx.lineTo(-23, -48);
  ctx.lineTo(22, -48);
  ctx.lineTo(31, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = flash ? "#fff7ef" : "#6d4c69";
  ctx.fillRect(-25, -32, 49, 11);
  ctx.fillStyle = flash ? "#fff2e4" : "#b57a62";
  ctx.beginPath();
  ctx.arc(0, -61, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash ? "#ffffff" : "#241a2b";
  ctx.beginPath();
  ctx.moveTo(-17, -68);
  ctx.lineTo(-8, -82);
  ctx.lineTo(-2, -68);
  ctx.lineTo(8, -82);
  ctx.lineTo(18, -68);
  ctx.lineTo(14, -56);
  ctx.lineTo(-14, -56);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ef5f67";
  ctx.fillRect(5, -64, 3, 3);

  let weaponAngle = 0.18;
  if (enemy.phase === "windup") {
    weaponAngle =
      enemy.attackKind === "bossOverhead"
        ? -1.05
        : enemy.attackKind === "bossSweep"
          ? -0.42
          : 0.05;
  } else if (attacking) {
    weaponAngle =
      enemy.attackKind === "bossOverhead"
        ? 0.72
        : enemy.attackKind === "bossSweep"
          ? 1.05
          : 0.12;
  }
  ctx.save();
  ctx.translate(18, -39);
  ctx.rotate(weaponAngle);
  ctx.strokeStyle = flash ? "#ffffff" : "#5e463d";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 48);
  ctx.stroke();
  ctx.fillStyle = flash ? "#ffffff" : "#766274";
  ctx.fillRect(-5, 37, 23, 18);
  ctx.restore();
}

export function drawRouteEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  cam: Camera,
  time: number,
): void {
  if (!enemy.alive && enemy.deathTimer <= 0) return;

  const x = enemy.pos.x - cam.x;
  const y = enemy.pos.y - cam.y;
  const flash = enemy.flash > 0;
  const bob = Math.sin(time * 5 + enemy.id) * 1.2;

  if (!enemy.alive) {
    const duration =
      enemy.kind === "shulmasynBaatar" ? 2.1 : 1.25;
    const fade = clamp(enemy.deathTimer / duration, 0, 1);
    ctx.save();
    ctx.globalAlpha = fade * 0.7;
    ctx.translate(x, y + 8);
    ctx.rotate(enemy.facing * -0.2);
    ctx.fillStyle = "rgba(35,30,28,0.78)";
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      enemy.radius + 7,
      Math.max(7, enemy.radius * 0.42),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(x, y + bob);
  if (enemy.facing < 0) ctx.scale(-1, 1);
  ctx.fillStyle = "rgba(20,18,15,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 8, enemy.radius + 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (
    enemy.kind === "talynHaragch" ||
    enemy.kind === "shulmasynZarts"
  ) {
    drawBasicRouteEnemy(ctx, enemy, flash, time);
  } else if (enemy.kind === "shulmasynHuu") {
    drawRushEnemy(ctx, enemy, flash);
  } else if (enemy.kind === "shidetHarvaach") {
    drawArcher(ctx, flash, time);
  } else {
    drawMiniBossBody(ctx, enemy, flash);
  }

  if (enemy.phase === "stunned") {
    ctx.fillStyle = "#ffe08a";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "✦",
      0,
      enemy.kind === "shulmasynBaatar" ? -88 : -55,
    );
  }
  ctx.restore();

  drawRouteTelegraph(ctx, enemy, x, y, time);
  drawEnemyHealthBars(
    ctx,
    enemy,
    x,
    y - enemy.radius - 35,
  );
  if (enemy.engaged && enemy.kind !== "shulmasynBaatar") {
    ctx.fillStyle = "#f0dfc3";
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      routeEnemyLabel(enemy.kind),
      x,
      y - enemy.radius - 42,
    );
    ctx.textAlign = "left";
  }
}

export function drawMiniBossArena(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  const route = routeOf(state);
  if (!route.bossStarted) return;

  const x = route.arenaCenter.x - cam.x;
  const y = route.arenaCenter.y - cam.y;
  const pulse = 0.45 + Math.sin(time * 3.2) * 0.08;
  ctx.save();
  const ground = ctx.createRadialGradient(
    x,
    y,
    20,
    x,
    y,
    route.arenaRadius,
  );
  ground.addColorStop(0, "rgba(58,38,63,0.22)");
  ground.addColorStop(0.72, "rgba(38,25,43,0.2)");
  ground.addColorStop(1, "rgba(18,12,22,0)");
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.arc(x, y, route.arenaRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = route.bossDefeated
    ? "rgba(232,197,106,0.32)"
    : `rgba(150,95,190,${pulse})`;
  ctx.lineWidth = route.bossDefeated ? 3 : 7;
  ctx.beginPath();
  ctx.arc(x, y, route.arenaRadius, 0, Math.PI * 2);
  ctx.stroke();

  if (!route.bossDefeated) {
    ctx.setLineDash([16, 15]);
    ctx.lineDashOffset = time * 28;
    ctx.strokeStyle = "rgba(206,145,255,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, route.arenaRadius - 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8 + time * 0.025;
    const runeRadius = route.arenaRadius - 30;
    const runeX = x + Math.cos(angle) * runeRadius;
    const runeY = y + Math.sin(angle) * runeRadius;
    ctx.save();
    ctx.translate(runeX, runeY);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = route.bossDefeated
      ? "rgba(232,197,106,0.18)"
      : "rgba(190,125,230,0.3)";
    ctx.fillRect(-3, -12, 6, 24);
    ctx.fillRect(-10, -3, 20, 6);
    ctx.restore();
  }
  ctx.restore();
}

export function drawSwordDrop(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  const drop = routeOf(state).swordDrop;
  if (!drop.visible) return;

  const x = drop.pos.x - cam.x;
  const y = drop.pos.y - cam.y;
  const bob = Math.sin(time * 4.2) * 5;
  const pulse = 0.72 + Math.sin(time * 6.5) * 0.16;
  ctx.save();
  ctx.translate(x, y - 22 + bob);
  ctx.rotate(-0.62);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(120,200,255,${0.15 * pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d9f4ff";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(0, 24);
  ctx.stroke();
  ctx.strokeStyle = "#8bc8e8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -29);
  ctx.lineTo(0, 22);
  ctx.stroke();
  ctx.strokeStyle = "#d7b86a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-12, 18);
  ctx.lineTo(12, 18);
  ctx.stroke();
  ctx.strokeStyle = "#74513a";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 19);
  ctx.lineTo(0, 35);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.82)";
  ctx.lineWidth = 4;
  ctx.strokeText(
    "ХӨХ ТЭНГЭРИЙН СЭЛЭМ",
    x,
    y - 72 + bob,
  );
  ctx.fillStyle = "#ccefff";
  ctx.fillText(
    "ХӨХ ТЭНГЭРИЙН СЭЛЭМ",
    x,
    y - 72 + bob,
  );
  ctx.restore();
}

export function drawMiniBossHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const route = routeOf(state);
  if (!route.bossStarted || route.bossDefeated) return;
  const boss = route.enemies.find(
    (enemy) =>
      enemy.kind === "shulmasynBaatar" && enemy.alive,
  );
  if (!boss) return;

  const width = Math.min(500, VIEW_W - 80);
  const x = (VIEW_W - width) / 2;
  const y = VIEW_H - 54;
  const hpRatio = clamp(boss.hp / boss.maxHp, 0, 1);
  const postureRatio = clamp(
    boss.posture / boss.maxPosture,
    0,
    1,
  );
  ctx.save();
  ctx.fillStyle = "rgba(12,8,14,0.84)";
  ctx.fillRect(x - 16, y - 24, width + 32, 66);
  ctx.strokeStyle = "rgba(199,154,226,0.58)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 16, y - 24, width + 32, 66);
  ctx.textAlign = "center";
  ctx.font = "800 15px system-ui, sans-serif";
  ctx.fillStyle = "#ead9f1";
  ctx.fillText("ШУЛМАСЫН БААТАР", VIEW_W / 2, y - 7);
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(x, y, width, 13);
  ctx.fillStyle = "#b43f53";
  ctx.fillRect(x, y, width * hpRatio, 13);
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(x, y + 20, width, 7);
  ctx.fillStyle = "#d8b84f";
  ctx.fillRect(x, y + 20, width * postureRatio, 7);
  ctx.textAlign = "left";
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.fillStyle = "#f3d9dc";
  ctx.fillText(
    `Амьдрал ${Math.ceil(boss.hp)} / ${boss.maxHp}`,
    x + 5,
    y + 11,
  );
  ctx.fillStyle = "#ffe39a";
  ctx.fillText(
    `Биеийн тэнцвэр ${Math.ceil(boss.posture)} / ${boss.maxPosture}`,
    x + 5,
    y + 27,
  );
  ctx.restore();
}

export function drawFirstRouteGate(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  const route = routeOf(state);
  const x = route.gatePos.x - cam.x;
  const y = route.gatePos.y - cam.y;
  const open = route.complete;
  const pulse = 0.55 + Math.sin(time * 4) * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(15,12,10,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 20, 64, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    const postX = side * 46;
    ctx.fillStyle = open ? "#88775f" : "#655c58";
    ctx.fillRect(postX - 12, -58, 24, 78);
    ctx.fillStyle = open ? "#a28d6d" : "#7b6f68";
    ctx.beginPath();
    ctx.moveTo(postX - 17, -58);
    ctx.lineTo(postX + 17, -58);
    ctx.lineTo(postX + 10, -70);
    ctx.lineTo(postX - 10, -70);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = open ? "#9d8662" : "#514946";
  ctx.fillRect(-58, -57, 116, 16);
  if (!open) {
    ctx.strokeStyle = `rgba(140,95,185,${pulse})`;
    ctx.lineWidth = 5;
    for (let bar = -2; bar <= 2; bar += 1) {
      ctx.beginPath();
      ctx.moveTo(bar * 18, -42);
      ctx.lineTo(bar * 18, 18);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = `rgba(232,197,106,${pulse})`;
    ctx.beginPath();
    ctx.arc(0, -49, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.textAlign = "center";
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = 3;
  ctx.strokeText("ХАРААЛТ ХААЛГА", x, y - 82);
  ctx.fillStyle = open ? "#ffe29a" : "#d6c6d9";
  ctx.fillText("ХАРААЛТ ХААЛГА", x, y - 82);
  ctx.textAlign = "left";
}

export function drawFirstRouteBolts(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  for (const bolt of routeOf(state).bolts) {
    const x = bolt.pos.x - cam.x;
    const y = bolt.pos.y - cam.y;
    const pulse = 1 + Math.sin(time * 15) * 0.12;
    ctx.fillStyle = "rgba(167,108,255,0.28)";
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      bolt.radius * 2.1 * pulse,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#c9a6ff";
    ctx.beginPath();
    ctx.arc(x, y, bolt.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFirstRouteHint(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  const route = routeOf(state);
  const drop = route.swordDrop;
  if (
    drop.visible &&
    !drop.collected &&
    dist(state.player.pos, drop.pos) <= state.player.radius + 70
  ) {
    const x = drop.pos.x - cam.x;
    const y = drop.pos.y - cam.y - 96;
    const text = "E — Хөх тэнгэрийн сэлмийг авах";
    ctx.textAlign = "center";
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.84)";
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = "#d9f4ff";
    ctx.fillText(text, x, y);
    ctx.textAlign = "left";
    return;
  }

  if (
    dist(state.player.pos, route.gatePos) >
    route.gateRadius + 36
  ) {
    return;
  }
  const x = route.gatePos.x - cam.x;
  const y = route.gatePos.y - cam.y - 104;
  const text = route.complete
    ? "E — Mini-boss-ийн талбайг шалгах"
    : `E — Түгжээ шалгах (${route.enemies.filter((enemy) => enemy.alive).length} үлдсэн)`;
  ctx.textAlign = "center";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#ffe9a8";
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}
