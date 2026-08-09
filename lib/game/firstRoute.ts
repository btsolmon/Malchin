import {
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  SNAKE_CRUSH_STONE_COST,
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
import { riverCenterX, RIVER_HALF_W } from "./biomes";
import { tryInteractTumurShulmasGate } from "./tumurShulmas";
import { drawOngodDemon } from "./render/ongodDemons";
import { tr, trFormat } from "./i18n";
import { handlePlayerDeath } from "./spirit";

/** Голын зүүн эрэг — туслахууд энд зогсоно */
function eastOfRiver(y: number, margin = 70): number {
  return clamp(
    riverCenterX(y) + RIVER_HALF_W + margin,
    120,
    WORLD_W - 80,
  );
}

function routeOf(state: GameState): FirstRoute {
  return state.world.firstRoute;
}

/** Сүнсний оронд байгаа эсэх — мангасууд энд л харагдаж, оногдоно */
export function inShulmasSpirit(state: GameState): boolean {
  return state.phase === "spirit";
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
  zurgaanNar: {
    hp: 28,
    posture: 999,
    radius: 34,
    speed: 12,
    damage: 6,
    aggroRange: 520,
    attackRange: 90,
    score: 12,
    xp: 10,
  },
  harMogoi: {
    hp: 140,
    posture: 70,
    radius: 38,
    speed: 88,
    damage: 16,
    aggroRange: 240,
    attackRange: 78,
    score: 60,
    xp: 48,
  },
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
    hp: 360,
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
  zurgaanNar: "Зургаан нар",
  harMogoi: "Хар могой",
  talynHaragch: "Талын харагч",
  shulmasynHuu: "Шулмасын хүү",
  shidetHarvaach: "Шидэт харваач",
  shulmasynZarts: "Шулмасын зарц",
  shulmasynBaatar: "Шулмасын баатар",
};

const ROUTE_ENEMY_COLORS: Record<RouteEnemyKind, string> = {
  zurgaanNar: "#e8a030",
  harMogoi: "#1a1218",
  talynHaragch: "#5a3a2e",
  shulmasynHuu: "#4a3834",
  shidetHarvaach: "#3d2a55",
  shulmasynZarts: "#3a322c",
  shulmasynBaatar: "#2a1c28",
};

export type RouteDamageSource = "melee" | "arrow" | "spiritBolt" | "other";

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
    engaged: kind === "zurgaanNar",
    walkPhase: Math.random() * Math.PI * 2,
    awaitingCrush: false,
  };
}

/** Таван сахиул: Зургаан нар(1) + могой(1) + үлдсэн 3 мангас */
const HELPER_TOTAL = 5;

type HelperSlot = {
  kind: RouteEnemyKind;
  y: number;
  margin: number;
};

function buildSunSlots(spawn: Vector2): HelperSlot[] {
  const sunSlots: HelperSlot[] = [];
  const sunMidY = clamp(spawn.y - 20, 160, WORLD_H - 160);
  for (let i = 0; i < 6; i++) {
    sunSlots.push({
      kind: "zurgaanNar",
      y: clamp(sunMidY + (i - 2.5) * 72, 120, WORLD_H - 120),
      margin: 110 + (i % 2) * 28,
    });
  }
  return sunSlots;
}

function buildSnakeSlot(spawn: Vector2): HelperSlot {
  return { kind: "harMogoi", y: spawn.y + 80, margin: 95 };
}

/** Өмнөх таван сахиулаас үлдээсэн гурав */
function buildTrioSlots(spawn: Vector2): HelperSlot[] {
  return [
    { kind: "shidetHarvaach", y: spawn.y + 160, margin: 70 },
    { kind: "shulmasynZarts", y: spawn.y + 280, margin: 110 },
    { kind: "talynHaragch", y: spawn.y + 400, margin: 65 },
  ];
}

function createEnemiesFromSlots(
  slots: HelperSlot[],
  idStart: number,
): RouteEnemy[] {
  return slots.map((slot, i) => {
    const y = clamp(slot.y, 100, WORLD_H - 100);
    return createEnemy(idStart + i, slot.kind, {
      x: eastOfRiver(y, slot.margin),
      y,
    });
  });
}

/** Эхний давалгаа — зөвхөн 6 нар */
function createHelperEnemies(spawn: Vector2): RouteEnemy[] {
  return createEnemiesFromSlots(buildSunSlots(spawn), 6001);
}

function nextEnemyId(route: FirstRoute): number {
  let maxId = 6000;
  for (const enemy of route.enemies) {
    if (enemy.id > maxId) maxId = enemy.id;
  }
  return maxId + 1;
}

function spawnHelperWave(
  state: GameState,
  slots: HelperSlot[],
  message: string,
): void {
  const route = routeOf(state);
  const spawned = createEnemiesFromSlots(slots, nextEnemyId(route));
  route.enemies.push(...spawned);
  setMessage(state, message, 4.5);
  state.fx.shake = Math.max(state.fx.shake, 4);
  sfx("levelup");
  const mid = spawned[Math.floor(spawned.length / 2)] ?? spawned[0];
  if (mid) {
    spawnParticles(state, mid.pos, 18, ROUTE_ENEMY_COLORS[mid.kind], {
      speed: 110,
      size: 2.8,
    });
  }
}

/**
 * Дараагийн давалгааг нээх:
 * нар дууссан → могой; могой дарсан → 3 мангас.
 */
function tryAdvanceHelperWave(state: GameState): void {
  const route = routeOf(state);
  if (!route.active || route.complete) return;
  const spawn = state.world.campPos;

  if (route.helperWave === 1) {
    const anySunAlive = route.enemies.some(
      (e) => e.kind === "zurgaanNar" && e.alive,
    );
    if (anySunAlive) return;
    // Нар аль хэдийн алга — могой гаргах
    if (route.enemies.some((e) => e.kind === "harMogoi")) {
      route.helperWave = 2;
      return;
    }
    route.helperWave = 2;
    // Халуун шар туяа арилга — сүнсний хөх бүүдгэр рүү буцна
    state.player.vitals.warmth = Math.min(state.player.vitals.warmth, 55);
    spawnHelperWave(
      state,
      [buildSnakeSlot(spawn)],
      "Зургаан нар унтарлаа. Хар могой гарч ирлээ — унагаад чулуугаар дар!",
    );
    return;
  }

  if (route.helperWave === 2) {
    const snakeAlive = route.enemies.some(
      (e) => e.kind === "harMogoi" && e.alive,
    );
    if (snakeAlive) return;
    if (
      route.enemies.some(
        (e) =>
          e.kind === "shidetHarvaach" ||
          e.kind === "shulmasynZarts" ||
          e.kind === "talynHaragch",
      )
    ) {
      route.helperWave = 3;
      return;
    }
    route.helperWave = 3;
    spawnHelperWave(
      state,
      buildTrioSlots(spawn),
      "Могой дарлаа. Таван сахиулын үлдсэн гурав гарч ирлээ!",
    );
  }
}

export function createFirstRoute(spawn: Vector2): FirstRoute {
  // Эхэнд зөвхөн 6 нар — дараагийн давалгаанууд хожим нээгдэнэ
  const enemies = createHelperEnemies(spawn);

  const gateY = clamp(spawn.y + 420, 120, WORLD_H - 140);
  const gateX = eastOfRiver(gateY, 140);
  const arenaY = clamp(WORLD_H - 380, 200, WORLD_H - 200);
  const arenaX = eastOfRiver(arenaY, 160);

  return {
    active: true,
    complete: false,
    introductionShown: false,
    gateMessageShown: false,
    startX: clamp(riverCenterX(spawn.y) - 40, 80, WORLD_W - 80),
    gatePos: { x: gateX, y: gateY },
    gateRadius: 74,
    arenaCenter: { x: arenaX, y: arenaY },
    arenaRadius: 225,
    bossStarted: false,
    bossDefeated: false,
    swordDrop: {
      pos: { x: arenaX, y: arenaY },
      visible: false,
      collected: false,
    },
    enemies,
    bolts: [],
    defeated: 0,
    total: HELPER_TOTAL,
    helperWave: 1,
    crushMonoliths: [],
  };
}

/**
 * Сүнс рүү орох бүрд туслах шулмасуудыг голын цаана дахин босгоно.
 * (Өмнө унасан / алга болсон бол сэргээнэ; mini-boss тусдаа үлдэнэ.)
 */
export function ensureShulmasHelpers(state: GameState): void {
  const route = state.world.firstRoute;
  const spawn = state.world.campPos;
  const helpers = createHelperEnemies(spawn);

  const boss = route.enemies.find((e) => e.kind === "shulmasynBaatar");
  const keepBoss =
    boss &&
    route.bossStarted &&
    !route.bossDefeated &&
    boss.alive;

  route.enemies = keepBoss && boss ? [...helpers, boss] : helpers;
  route.total = HELPER_TOTAL;
  route.defeated = 0;
  route.complete = false;
  route.helperWave = 1;
  route.bolts = [];
  route.crushMonoliths = [];
  route.active = true;
  route.introductionShown = false;
  route.gateMessageShown = false;

  // Хаалга/ареныйг одоогийн бууцтай уяна
  const gateY = clamp(spawn.y + 420, 120, WORLD_H - 140);
  route.gatePos = { x: eastOfRiver(gateY, 140), y: gateY };
  route.startX = clamp(riverCenterX(spawn.y) - 40, 80, WORLD_W - 80);
  if (!route.bossStarted) {
    const arenaY = clamp(WORLD_H - 380, 200, WORLD_H - 200);
    route.arenaCenter = { x: eastOfRiver(arenaY, 160), y: arenaY };
    route.swordDrop.pos = { ...route.arenaCenter };
    route.swordDrop.visible = false;
    route.swordDrop.collected = false;
  }
}

/** Эхний амьд туслахын дэргэд (гол дээр биш) байрлуулах */
export function placePlayerNearHelpers(state: GameState): void {
  const route = state.world.firstRoute;
  const suns = route.enemies.filter(
    (e) => e.alive && e.kind === "zurgaanNar",
  );
  if (suns.length > 0) {
    const mid = suns[Math.floor(suns.length / 2)]!;
    const bank = eastOfRiver(mid.spawnPos.y, 20);
    state.player.pos = {
      x: Math.max(80, bank - 40),
      y: mid.spawnPos.y,
    };
    state.player.facing = { x: 1, y: 0 };
    state.player.moving = false;
    return;
  }

  const anchor =
    route.enemies.find(
      (e) => e.alive && e.kind !== "shulmasynBaatar",
    ) ?? null;
  if (anchor) {
    const bank = eastOfRiver(anchor.spawnPos.y, 25);
    state.player.pos = {
      x: Math.max(bank, anchor.spawnPos.x - 55),
      y: anchor.spawnPos.y,
    };
  } else {
    state.player.pos = {
      x: route.gatePos.x - 90,
      y: route.gatePos.y + 40,
    };
  }
  state.player.facing = { x: 1, y: 0 };
  state.player.moving = false;
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
  const moving = Math.hypot(enemy.vel.x, enemy.vel.y) > 8;
  if (moving) enemy.walkPhase += dt * 9.5;
  setEnemyFacing(enemy, direction);
}

function stopEnemy(enemy: RouteEnemy): void {
  enemy.vel = { x: 0, y: 0 };
}

function resolvePlayerBodyContact(
  state: GameState,
  enemy: RouteEnemy,
): void {
  if (enemy.kind === "zurgaanNar") return;
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
  if (player.invuln > 0 || !inShulmasSpirit(state)) return false;

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
    setMessage(
      state,
      trFormat("{name}-д ялагдлаа…", { name: tr(routeEnemyLabel(enemy.kind)) }),
      99,
    );
  }
  return true;
}

export function isRouteEnemyParryThreat(enemy: RouteEnemy): boolean {
  if (!enemy.alive || enemy.awaitingCrush) return false;
  if (
    enemy.kind === "shulmasynHuu" ||
    enemy.kind === "shidetHarvaach" ||
    enemy.kind === "zurgaanNar"
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
  if (!inShulmasSpirit(state)) return false;
  if (!enemy.alive || amount <= 0 || enemy.phase === "stunned") return false;
  if (enemy.awaitingCrush || enemy.kind === "zurgaanNar") return false;

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
  // Дараагийн давалгаа үлдсэн бол хаалга бүү нээ
  if (route.helperWave < 3) return false;
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
  source: RouteDamageSource = "other",
): void {
  // Зөвхөн шулмасын сүнсний оронд оногдоно (харагдахтай ижил)
  if (!inShulmasSpirit(state)) return;
  if (!enemy.alive || damage <= 0) return;
  if (enemy.awaitingCrush) return;

  if (enemy.kind === "zurgaanNar" && source !== "arrow") {
    enemy.flash = 0.1;
    enemy.engaged = true;
    spawnText(
      state,
      zurgaanNarSkyWorldPos(state, enemy),
      "Нум сумаар харва!",
      "#ffe08a",
    );
    sfx("move");
    return;
  }

  enemy.hp -= damage;
  enemy.flash = 0.13;
  enemy.engaged = true;
  sfx("hit");
  const hitPos =
    enemy.kind === "zurgaanNar"
      ? zurgaanNarSkyWorldPos(state, enemy)
      : enemy.pos;
  spawnParticles(state, hitPos, 8, ROUTE_ENEMY_COLORS[enemy.kind], {
    speed: enemy.kind === "shulmasynBaatar" ? 130 : 100,
    size: enemy.kind === "shulmasynBaatar" ? 3.2 : 2.4,
  });
  if (enemy.hp > 0) return;

  // Хар могой — унасны дараа чулуугаар дарна
  if (enemy.kind === "harMogoi") {
    enemy.hp = 0;
    enemy.alive = true;
    enemy.awaitingCrush = true;
    enemy.engaged = true;
    stopEnemy(enemy);
    enemy.phase = "stunned";
    enemy.phaseTimer = 9999;
    enemy.vel = { x: 0, y: 0 };
    setMessage(
      state,
      `Могой унав! Ойртоод E дар — ${SNAKE_CRUSH_STONE_COST} чулуугаар дар.`,
      5,
    );
    sfx("levelup");
    spawnParticles(state, enemy.pos, 16, "#6a5840", {
      speed: 90,
      size: 3,
    });
    return;
  }

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
  } else if (enemy.kind === "zurgaanNar") {
    // 6 нар = 1 сахиул — зөвхөн сүүлийн нар унахад тоолно
    const sunsLeft = route.enemies.filter(
      (e) => e.kind === "zurgaanNar" && e.alive,
    ).length;
    if (sunsLeft === 0) {
      route.defeated += 1;
      tryAdvanceHelperWave(state);
      routeCompleted = completeRouteIfCleared(state);
    }
  } else {
    route.defeated += 1;
    tryAdvanceHelperWave(state);
    routeCompleted = completeRouteIfCleared(state);
  }

  const config = ROUTE_CONFIG[enemy.kind];
  state.score += config.score;
  gainXp(state, config.xp);
  sfx("kill");
  spawnSoulRelease(
    state,
    enemy.kind === "zurgaanNar"
      ? zurgaanNarSkyWorldPos(state, enemy)
      : enemy.pos,
    enemy.radius,
    isBoss
      ? "#f0e4ff"
      : enemy.kind === "zurgaanNar"
        ? "#ffd080"
        : enemy.kind === "shidetHarvaach"
          ? "#d9c8ff"
          : "#d8f4ff",
  );
  spawnParticles(
    state,
    enemy.kind === "zurgaanNar"
      ? zurgaanNarSkyWorldPos(state, enemy)
      : enemy.pos,
    isBoss ? 34 : 12,
    isBoss ? "#c9a6ff" : enemy.kind === "zurgaanNar" ? "#ffc050" : "#d8f4ff",
    {
      speed: isBoss ? 175 : 110,
      size: isBoss ? 3.6 : 2.6,
    },
  );
  spawnText(
    state,
    enemy.kind === "zurgaanNar"
      ? zurgaanNarSkyWorldPos(state, enemy)
      : enemy.pos,
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
  } else if (
    !routeCompleted &&
    !(enemy.kind === "zurgaanNar" && route.helperWave >= 2)
  ) {
    setMessage(
      state,
      trFormat("{name}-ын сүнс одлоо.", {
        name: tr(routeEnemyLabel(enemy.kind)),
      }),
      1.7,
    );
  }
}

/** Хар могойг 100 чулуугаар дарж алах */
export function tryCrushHarMogoi(state: GameState): boolean {
  if (!state.input.interact || !inShulmasSpirit(state)) return false;

  const snake = routeOf(state).enemies.find(
    (e) => e.kind === "harMogoi" && e.alive && e.awaitingCrush === true,
  );
  if (!snake) return false;

  // Унасан могой байхад E-г овоо буцаах бүү хулгайлаарай
  state.input.interact = false;

  const reach = snake.radius + 96;
  if (dist(state.player.pos, snake.pos) > reach) {
    setMessage(state, "Могой руу ойртоод E дар — чулуугаар дар.", 2.6);
    sfx("move");
    return true;
  }

  const stones = state.player.inventory.stone ?? 0;
  if (stones < SNAKE_CRUSH_STONE_COST) {
    setMessage(
      state,
      `Чулуу дутуу: ${stones}/${SNAKE_CRUSH_STONE_COST}. Хүний ертөнцөд түүж бэлд.`,
      3.5,
    );
    sfx("move");
    return true;
  }

  state.player.inventory.stone -= SNAKE_CRUSH_STONE_COST;
  snake.awaitingCrush = false;
  snake.alive = false;
  snake.deathTimer = 0.4;
  stopEnemy(snake);

  const route = routeOf(state);
  route.crushMonoliths = route.crushMonoliths ?? [];
  route.crushMonoliths.push({ pos: { ...snake.pos } });
  route.defeated += 1;
  tryAdvanceHelperWave(state);
  const routeCompleted = completeRouteIfCleared(state);

  const config = ROUTE_CONFIG.harMogoi;
  state.score += config.score;
  gainXp(state, config.xp);
  state.fx.shake = Math.max(state.fx.shake, 10);
  triggerHitStop(state, 0.14);
  sfx("stone");
  sfx("kill");
  spawnParticles(state, snake.pos, 28, "#6a6358", {
    speed: 120,
    size: 3.4,
    gravity: 40,
  });
  spawnText(
    state,
    snake.pos,
    `−${SNAKE_CRUSH_STONE_COST} чулуу`,
    "#c8c0b0",
  );
  setMessage(
    state,
    routeCompleted
      ? "Тайхар чулуу могойг дарж, зам нээгдэв."
      : "Тайхар чулуу могойг дарлаа.",
    4,
  );
  return true;
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

function updateZurgaanNar(
  state: GameState,
  enemy: RouteEnemy,
  dt: number,
): void {
  // Тэнгэрт хөвнө — газрын хажууд биш, ойрын цохилт байхгүй
  stopEnemy(enemy);
  enemy.engaged = true;
  enemy.walkPhase += dt * 1.6;
  enemy.pos.x = enemy.spawnPos.x;
  enemy.pos.y = enemy.spawnPos.y;
  if (enemy.phase === "recovery") {
    enemy.phaseTimer = Math.max(0, enemy.phaseTimer - dt);
    if (enemy.phaseTimer <= 0) enemy.phase = "idle";
    return;
  }
  enemy.phase = "idle";
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

  // Хуучин save — helperWave байхгүй бол сэргээнэ
  if (route.helperWave == null) {
    const hasTrio = route.enemies.some(
      (e) =>
        e.kind === "shidetHarvaach" ||
        e.kind === "shulmasynZarts" ||
        e.kind === "talynHaragch",
    );
    const hasSnake = route.enemies.some((e) => e.kind === "harMogoi");
    route.helperWave = hasTrio ? 3 : hasSnake ? 2 : 1;
  }

  tryAdvanceHelperWave(state);
  completeRouteIfCleared(state);

  // Туслахууд — сүнсний оронд
  if (!inShulmasSpirit(state)) return;

  if (
    !route.introductionShown &&
    state.player.pos.x >= route.startX
  ) {
    route.introductionShown = true;
    setMessage(
      state,
      "Зүүн тэнгэрт зургаан нар! Нум сумаар харва. Дараа нь могой, дараа нь бусад мангас гарч ирнэ.",
      5,
    );
  }

  updateRouteBolts(state, dt);

  // Зургаан нар амьд үед тэнгэрийн халуун — амь багасгана
  const sixSunsAlive = route.enemies.some(
    (e) => e.kind === "zurgaanNar" && e.alive && !e.awaitingCrush,
  );
  if (sixSunsAlive && !state.godMode) {
    const burn = 5.5 * dt;
    state.player.vitals.health = Math.max(
      0,
      state.player.vitals.health - burn,
    );
    state.player.vitals.warmth = Math.min(
      100,
      state.player.vitals.warmth + 12 * dt,
    );
    if (state.player.vitals.health <= 0) {
      handlePlayerDeath(state, "Зургаан нарын халуунд шатав…");
      return;
    }
  }

  for (const enemy of route.enemies) {
    if (!enemy.alive) {
      enemy.deathTimer = Math.max(0, enemy.deathTimer - dt);
      continue;
    }

    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    updatePosture(enemy, dt);

    if (enemy.awaitingCrush === true) {
      stopEnemy(enemy);
      enemy.phase = "stunned";
      continue;
    }

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
      continue;
    }

    const dPlayer = dist(enemy.pos, state.player.pos);
    const dHome = dist(enemy.pos, enemy.spawnPos);
    if (!enemy.engaged && dPlayer <= enemy.aggroRange) {
      enemy.engaged = true;
      enemy.phase = "chasing";
      if (enemy.kind === "zurgaanNar") {
        const alreadyTold = route.enemies.some(
          (e) =>
            e.kind === "zurgaanNar" &&
            e.id !== enemy.id &&
            e.engaged,
        );
        if (!alreadyTold) {
          setMessage(
            state,
            "Зүүн тэнгэрт зургаан нар! Нум сумаар нэг бүрчлэн харва.",
            3.5,
          );
        }
      } else if (enemy.kind === "harMogoi") {
        setMessage(
          state,
          "Хар могой мөлхөж ирлээ. Унагасны дараа чулуугаар дар.",
          2.2,
        );
      } else {
        setMessage(
          state,
          trFormat("{name} тулалдаанд орлоо.", {
            name: tr(routeEnemyLabel(enemy.kind)),
          }),
          1.5,
        );
      }
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
    } else if (enemy.kind === "zurgaanNar") {
      updateZurgaanNar(state, enemy, dt);
    } else {
      updateMeleeRouteEnemy(state, enemy, dt);
    }
    resolvePlayerBodyContact(state, enemy);
  }

  completeRouteIfCleared(state);
  confineMiniBossEncounter(state);
}

export function tryInteractFirstRoute(state: GameState): boolean {
  if (!state.input.interact) return false;

  const route = routeOf(state);
  const encounter = state.world.tumurShulmas;

  // Сүнсний ангал хасагдсан — бодит ертөнцөд хаалга байхгүй
  if (state.phase === "playing") return false;

  if (!inShulmasSpirit(state)) return false;

  if (tryCrushHarMogoi(state)) return true;

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
      "Хөх тэнгэрийн сэлмийг авлаа. Хар төмөр хаалга нээгдэв. 1: нударга · 2: сэлэм",
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
      trFormat("Хараалт хаалга түгжээтэй. Замын {n} дайсан үлдлээ.", {
        n: remaining,
      }),
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
  stoneCount = 0,
): void {
  if (enemy.kind === "shulmasynBaatar") return;
  // Нар — HP/шар зураас тэнгэрт бүү зур
  if (enemy.kind === "zurgaanNar") return;
  if (!enemy.engaged && enemy.hp >= enemy.maxHp) return;

  const width = enemy.kind === "shulmasynZarts" ? 62 : enemy.kind === "harMogoi" ? 56 : 48;
  const hpRatio = clamp(enemy.hp / enemy.maxHp, 0, 1);
  const showPosture = !enemy.awaitingCrush;
  const postureRatio = clamp(
    enemy.posture / enemy.maxPosture,
    0,
    1,
  );

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(x - width / 2, y, width, 5);
  ctx.fillStyle = enemy.awaitingCrush ? "#8a7a68" : "#c84242";
  ctx.fillRect(
    x - width / 2,
    y,
    width * (enemy.awaitingCrush ? 0 : hpRatio),
    5,
  );

  if (showPosture) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(x - width / 2, y + 7, width, 3);
    ctx.fillStyle = "#e2bd55";
    ctx.fillRect(x - width / 2, y + 7, width * postureRatio, 3);
  }

  if (enemy.kind === "harMogoi") {
    const have = Math.max(0, Math.floor(stoneCount));
    const hint = enemy.awaitingCrush
      ? `E · ${have}/${SNAKE_CRUSH_STONE_COST} чулуу`
      : `${have}/${SNAKE_CRUSH_STONE_COST} чулуу`;
    const tipY = y + (showPosture ? 22 : 16);
    ctx.textAlign = "center";
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.lineWidth = 3;
    ctx.strokeText(hint, x, tipY);
    ctx.fillStyle =
      have >= SNAKE_CRUSH_STONE_COST ? "#e8d4a0" : "#d8c8b0";
    ctx.fillText(hint, x, tipY);
    ctx.textAlign = "left";
  }
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

export function drawRouteEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  cam: Camera,
  time: number,
  stoneCount = 0,
): void {
  // Зургаан нар — тэнгэрийн overlay (drawSixSunsSky)
  if (enemy.kind === "zurgaanNar") return;
  if (!enemy.alive && enemy.deathTimer <= 0) return;

  const x = enemy.pos.x - cam.x;
  const y = enemy.pos.y - cam.y;
  const flash = enemy.flash > 0;
  if (typeof enemy.walkPhase !== "number") enemy.walkPhase = 0;
  const moving = Math.hypot(enemy.vel.x, enemy.vel.y) > 8;
  const bob = moving
    ? Math.abs(Math.sin(enemy.walkPhase)) * 1.2
    : Math.sin(time * 1.6 + enemy.id) * 0.35;

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
  ctx.translate(x, y + (enemy.kind === "harMogoi" ? 0 : bob));
  if (enemy.facing < 0 && enemy.kind !== "harMogoi") {
    ctx.scale(-1, 1);
  }
  ctx.fillStyle = "rgba(20,18,15,0.3)";
  ctx.beginPath();
  ctx.ellipse(
    0,
    10,
    enemy.kind === "harMogoi" ? enemy.radius + 14 : enemy.radius + 4,
    enemy.kind === "harMogoi" ? 9 : 7,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (enemy.kind === "harMogoi") {
    drawHarMogoiBody(ctx, enemy, flash, time);
  } else {
    drawOngodDemon(ctx, enemy, flash, time);
  }

  if (enemy.phase === "stunned" && !enemy.awaitingCrush) {
    ctx.fillStyle = "#ffe08a";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "✦",
      0,
      enemy.kind === "shulmasynBaatar" ? -78 : -52,
    );
  }
  ctx.restore();

  drawRouteTelegraph(ctx, enemy, x, y, time);
  const barY =
    y - enemy.radius - (enemy.kind === "harMogoi" ? 56 : 35);
  drawEnemyHealthBars(ctx, enemy, x, barY, stoneCount);
  if (
    enemy.engaged &&
    enemy.kind !== "shulmasynBaatar" &&
    enemy.kind !== "harMogoi"
  ) {
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

/** Нарны slot (0–5) — эхний 6 id-аар тогтвортой */
export function zurgaanNarSlotIndex(enemy: RouteEnemy): number {
  return clamp(enemy.id - 6001, 0, 5);
}

/**
 * Зургаан нар — дэлгэцийн дээд тэнгэрт (зүүн тийш).
 * Газрын entity биш, тэнгэрийн биет.
 */
export function zurgaanNarSkyScreenPos(
  slot: number,
  viewW: number,
  viewH: number,
  time: number,
): Vector2 {
  const i = clamp(slot, 0, 5);
  const bob = Math.sin(time * 1.35 + i * 0.9) * 4;
  return {
    // Дээд тэнгэр, зүүн зүг (дэлгэцийн баруун хагас)
    x: viewW * 0.58 + (i - 2.5) * (viewW * 0.075),
    y: viewH * 0.11 + (i % 2) * 16 + bob,
  };
}

function spiritPlayCamera(state: GameState): Camera {
  return {
    x: clamp(state.player.pos.x - VIEW_W / 2, 0, WORLD_W - VIEW_W),
    y: clamp(state.player.pos.y - VIEW_H / 2, 0, WORLD_H - VIEW_H),
  };
}

/** Тэнгэрийн нарын дэлгэц → дэлхийн цэг (сумны чиглэл/онох) */
export function zurgaanNarSkyWorldPos(
  state: GameState,
  enemy: RouteEnemy,
  time = state.world.elapsed,
): Vector2 {
  const cam = spiritPlayCamera(state);
  const screen = zurgaanNarSkyScreenPos(
    zurgaanNarSlotIndex(enemy),
    VIEW_W,
    VIEW_H,
    time,
  );
  return { x: cam.x + screen.x, y: cam.y + screen.y };
}

function drawZurgaanNarBody(
  ctx: CanvasRenderingContext2D,
  flash: boolean,
  time: number,
  walkPhase: number,
): void {
  const hover = Math.sin(walkPhase) * 2;
  ctx.translate(0, hover);
  const pulse = 1 + Math.sin(time * 2.1) * 0.04;

  // Зөөлөн ууссан дугуй гэрэл — цэцэг/туяа биш
  const outer = ctx.createRadialGradient(0, 0, 2, 0, 0, 58 * pulse);
  outer.addColorStop(
    0,
    flash ? "rgba(255,255,240,0.95)" : "rgba(255,248,200,0.85)",
  );
  outer.addColorStop(
    0.2,
    flash ? "rgba(255,236,140,0.7)" : "rgba(255,220,100,0.55)",
  );
  outer.addColorStop(0.5, "rgba(255,180,50,0.22)");
  outer.addColorStop(0.78, "rgba(255,140,30,0.08)");
  outer.addColorStop(1, "rgba(255,120,20,0)");
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(0, 0, 58 * pulse, 0, Math.PI * 2);
  ctx.fill();

  const core = ctx.createRadialGradient(-3, -4, 1, 0, 0, 20);
  core.addColorStop(0, flash ? "#ffffff" : "#fffef0");
  core.addColorStop(0.35, flash ? "#fff0a8" : "#ffe56a");
  core.addColorStop(0.75, "#ffc040");
  core.addColorStop(1, "rgba(240,150,30,0.35)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
}

/** Тайхар чулууны хэлбэртэй том хад */
export function drawCrushMonoliths(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  for (const mono of state.world.firstRoute.crushMonoliths ?? []) {
    const x = mono.pos.x - cam.x;
    const y = mono.pos.y - cam.y;
    if (x < -80 || x > VIEW_W + 80 || y < -120 || y > VIEW_H + 80) continue;
    drawTaikharMonolith(ctx, x, y);
  }
}

function drawTaikharMonolith(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  // Тайхар чулуу — нэг том босоо хад (зураг шиг)
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(16,12,8,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 56, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createLinearGradient(-40, -200, 45, 30);
  body.addColorStop(0, "#c4a878");
  body.addColorStop(0.25, "#a08860");
  body.addColorStop(0.55, "#7a6248");
  body.addColorStop(0.8, "#5a4834");
  body.addColorStop(1, "#3a2e22");
  ctx.fillStyle = body;
  ctx.beginPath();
  // Өндөр монолит — орой өргөн, суурь нарийн
  ctx.moveTo(-22, 20);
  ctx.lineTo(-32, -30);
  ctx.lineTo(-38, -90);
  ctx.lineTo(-34, -150);
  ctx.lineTo(-20, -200);
  ctx.lineTo(4, -220);
  ctx.lineTo(28, -205);
  ctx.lineTo(40, -155);
  ctx.lineTo(42, -90);
  ctx.lineTo(36, -25);
  ctx.lineTo(24, 20);
  ctx.closePath();
  ctx.fill();

  // Гүн босоо хагарлууд
  ctx.strokeStyle = "rgba(28,20,12,0.65)";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-6, 14);
  ctx.lineTo(-14, -70);
  ctx.lineTo(-10, -160);
  ctx.lineTo(-2, -210);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 12);
  ctx.lineTo(20, -50);
  ctx.lineTo(16, -140);
  ctx.lineTo(10, -195);
  ctx.stroke();

  // Нарны гэрэлтсэн хажуу
  ctx.fillStyle = "rgba(255,235,190,0.16)";
  ctx.beginPath();
  ctx.moveTo(4, -215);
  ctx.lineTo(26, -200);
  ctx.lineTo(36, -100);
  ctx.lineTo(20, -20);
  ctx.lineTo(8, -80);
  ctx.closePath();
  ctx.fill();

  // Оройн ирмэг
  ctx.strokeStyle = "rgba(230,210,170,0.4)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-18, -198);
  ctx.lineTo(4, -218);
  ctx.lineTo(26, -202);
  ctx.stroke();

  ctx.restore();
}

function drawHarMogoiBody(
  ctx: CanvasRenderingContext2D,
  enemy: RouteEnemy,
  flash: boolean,
  time: number,
): void {
  // Хар могой — кобра: ороосон бие, босоо хүзүү, дэлгэсэн бамбай
  const face = enemy.facing < 0 ? -1 : 1;
  const limp = enemy.awaitingCrush === true;
  const sway = limp ? 0 : Math.sin(time * 2.8) * 2;

  const scaleDark = flash ? "#3a3238" : "#121016";
  const scaleMid = flash ? "#4a4048" : "#1c181e";
  const belly = flash ? "#6a6058" : "#2a2420";
  const hoodEdge = flash ? "#504848" : "#0e0c10";

  ctx.save();
  ctx.scale(face, 1);
  if (limp) {
    ctx.rotate(0.55);
    ctx.translate(0, 8);
  }

  // Ороосон бие
  ctx.fillStyle = scaleDark;
  ctx.beginPath();
  ctx.ellipse(2, 18, 22, 11, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = scaleMid;
  ctx.beginPath();
  ctx.ellipse(-6, 14, 14, 8, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, 16, 12, 7, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Босоо хүзүү
  const neckH = limp ? 28 : 48;
  ctx.fillStyle = scaleDark;
  ctx.beginPath();
  ctx.moveTo(-7 + sway * 0.2, 10);
  ctx.quadraticCurveTo(-9 + sway, -neckH * 0.4, -6 + sway, -neckH);
  ctx.lineTo(7 + sway, -neckH);
  ctx.quadraticCurveTo(10 + sway, -neckH * 0.4, 8 + sway * 0.2, 10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = belly;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.quadraticCurveTo(sway * 0.5, -neckH * 0.5, sway, -neckH + 6);
  ctx.stroke();

  // Бамбай
  const hoodY = -neckH + 4;
  const hoodW = limp ? 22 : 34;
  const hoodH = limp ? 18 : 28;
  ctx.fillStyle = hoodEdge;
  ctx.beginPath();
  ctx.moveTo(-4 + sway, hoodY + 8);
  ctx.quadraticCurveTo(
    -hoodW + sway,
    hoodY - 2,
    -hoodW * 0.7 + sway,
    hoodY - hoodH,
  );
  ctx.quadraticCurveTo(sway, hoodY - hoodH - 6, hoodW * 0.7 + sway, hoodY - hoodH);
  ctx.quadraticCurveTo(hoodW + sway, hoodY - 2, 4 + sway, hoodY + 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.moveTo(-2 + sway, hoodY + 4);
  ctx.quadraticCurveTo(
    -hoodW * 0.55 + sway,
    hoodY - 2,
    -hoodW * 0.35 + sway,
    hoodY - hoodH * 0.75,
  );
  ctx.lineTo(hoodW * 0.35 + sway, hoodY - hoodH * 0.75);
  ctx.quadraticCurveTo(hoodW * 0.55 + sway, hoodY - 2, 2 + sway, hoodY + 4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const ty = hoodY - 6 - i * 6;
    ctx.beginPath();
    ctx.moveTo(-hoodW * 0.35 + sway, ty);
    ctx.lineTo(hoodW * 0.35 + sway, ty);
    ctx.stroke();
  }

  // Толгой + улаан нүд
  const hx = sway;
  const hy = hoodY - hoodH + 2;
  ctx.fillStyle = scaleDark;
  ctx.beginPath();
  ctx.ellipse(hx, hy - 4, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  const eyeA = limp ? 0.4 : 0.8 + Math.sin(time * 5) * 0.15;
  ctx.fillStyle = `rgba(220, 25, 35, ${eyeA})`;
  ctx.beginPath();
  ctx.ellipse(hx - 4, hy - 6, 3.2, 2.4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + 4, hy - 6, 3.2, 2.4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = limp ? "#501010" : "#ff7078";
  ctx.beginPath();
  ctx.arc(hx - 3.5, hy - 6, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx + 3.5, hy - 6, 1.2, 0, Math.PI * 2);
  ctx.fill();

  if (!limp) {
    ctx.strokeStyle = "#c02838";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 2);
    ctx.lineTo(hx + 10, hy + 4 + Math.sin(time * 9) * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/** Зургаан нар — дэлгэцийн дээд тэнгэрт зурна + халууны vignette */
export function drawSixSunsSky(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  viewW: number,
  viewH: number,
  time: number,
): void {
  if (!inShulmasSpirit(state)) return;
  const suns = state.world.firstRoute.enemies.filter(
    (e) => e.kind === "zurgaanNar" && e.alive,
  );
  if (suns.length === 0) return;

  const intensity = 0.05 + (suns.length / 6) * 0.12;
  ctx.save();
  ctx.fillStyle = `rgba(255, 130, 40, ${intensity})`;
  ctx.fillRect(0, 0, viewW, viewH);

  // Дээд тэнгэрийн зөөлөн гэрэл
  const skyGlow = ctx.createLinearGradient(0, 0, 0, viewH * 0.4);
  skyGlow.addColorStop(0, `rgba(255, 200, 80, ${0.12 + suns.length * 0.02})`);
  skyGlow.addColorStop(1, "rgba(255, 160, 40, 0)");
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, viewW, viewH * 0.4);

  for (const sun of suns) {
    const screen = zurgaanNarSkyScreenPos(
      zurgaanNarSlotIndex(sun),
      viewW,
      viewH,
      time,
    );
    ctx.save();
    ctx.translate(screen.x, screen.y);
    drawZurgaanNarBody(ctx, sun.flash > 0, time, sun.walkPhase);
    ctx.restore();
  }
  ctx.restore();
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
    trFormat("Амьдрал {hp} / {max}", {
      hp: Math.ceil(boss.hp),
      max: boss.maxHp,
    }),
    x + 5,
    y + 11,
  );
  ctx.fillStyle = "#ffe39a";
  ctx.fillText(
    trFormat("Биеийн тэнцвэр {hp} / {max}", {
      hp: Math.ceil(boss.posture),
      max: boss.maxPosture,
    }),
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

  if (!inShulmasSpirit(state)) return;

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
    : trFormat("E — Хараалт хаалга ({n} үлдсэн)", {
        n: route.enemies.filter((enemy) => enemy.alive).length,
      });
  ctx.textAlign = "center";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#ffe9a8";
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}
