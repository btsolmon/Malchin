import {
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  type Camera,
  type GameState,
  type TumurShulmasEncounter,
  type TumurShulmasPhase,
  type Vector2,
} from "./types";
import { sfx } from "./audio";
import { damagePlayer as damagePastoralPlayer } from "./enemies";
import {
  spawnImpactBurst,
  spawnParticles,
  spawnSoulRelease,
  spawnText,
  startCameraShake,
  startScreenPulse,
  triggerHitStop,
} from "./effects";
import { clamp, dist, normalize, setMessage } from "./utils";
import { enterShulmasSpirit, exitSpiritWorld } from "./spirit";
import {
  ensureShulmasHelpers,
  placePlayerNearHelpers,
} from "./firstRoute";
import { riverCenterX, RIVER_HALF_W } from "./biomes";

function eastArenaX(y: number, margin = 170): number {
  return Math.min(
    WORLD_W - 120,
    Math.max(120, riverCenterX(y) + RIVER_HALF_W + margin),
  );
}

export type TumurShulmasSpriteName =
  | "idle"
  | "walk"
  | "claw"
  | "needle"
  | "stagger"
  | "death"
  | "summon";

export type TumurShulmasSpriteSet = Record<
  TumurShulmasSpriteName,
  HTMLImageElement
>;

const SPRITE_PATHS: Record<TumurShulmasSpriteName, string> = {
  idle: "/assets/bosses/tumur-shulmas/idle.png",
  walk: "/assets/bosses/tumur-shulmas/walk.png",
  claw: "/assets/bosses/tumur-shulmas/claw.png",
  needle: "/assets/bosses/tumur-shulmas/needle.png",
  stagger: "/assets/bosses/tumur-shulmas/stagger.png",
  death: "/assets/bosses/tumur-shulmas/death.png",
  summon: "/assets/bosses/tumur-shulmas/summon.png",
};

interface BossAnimationSpec {
  frameCount: number;
  fps: number;
  loop: boolean;
}

const BOSS_ANIMATION_SPECS: Record<TumurShulmasSpriteName, BossAnimationSpec> =
  {
    idle: { frameCount: 4, fps: 4.5, loop: true },
    walk: { frameCount: 4, fps: 7, loop: true },
    claw: { frameCount: 4, fps: 4 / 0.9, loop: false },
    needle: { frameCount: 4, fps: 4 / 1.22, loop: false },
    stagger: { frameCount: 4, fps: 4 / 1.45, loop: false },
    death: { frameCount: 4, fps: 4 / 1.75, loop: false },
    summon: { frameCount: 4, fps: 4 / 1.45, loop: false },
  };

const FRAME_SIZE = 128;
const DRAW_SIZE = 166;
const BOSS_RADIUS = 38;
const BOSS_SPEED_PHASE_1 = 92;
const BOSS_SPEED_PHASE_2 = 118;
const CLAW_REACH = 98;
const CLAW_DAMAGE_PHASE_1 = 18;
const CLAW_DAMAGE_PHASE_2 = 25;
const NEEDLE_DAMAGE_PHASE_1 = 12;
const NEEDLE_DAMAGE_PHASE_2 = 16;

const PHASE_DURATION: Record<TumurShulmasPhase, number> = {
  sealed: 0,
  summoning: 1.1,
  idle: 0.28,
  walking: 2.4,
  claw: 0.9,
  needle: 1.1,
  ironBloom: 1.38,
  phaseShift: 1.55,
  stagger: 1.45,
  death: 1.75,
};

export function createTumurShulmasEncounter(): TumurShulmasEncounter {
  // Голын зүүн эрэг — Хараалт хаалгын цаана / урагш
  const gateY = WORLD_H * 0.58;
  const arenaY = WORLD_H - 360;
  const arenaCenter = {
    x: eastArenaX(arenaY, 180),
    y: arenaY,
  };
  return {
    gatePos: { x: eastArenaX(gateY, 155), y: gateY },
    gateRadius: 72,
    arenaCenter,
    arenaRadius: 285,
    exitPos: { x: arenaCenter.x, y: WORLD_H - 104 },
    unlocked: false,
    active: false,
    defeated: false,
    phase: "sealed",
    phaseTimer: 0,
    cycleIndex: 0,
    pos: { x: arenaCenter.x, y: arenaCenter.y - 45 },
    facing: { x: 0, y: 1 },
    attackDirection: { x: 0, y: 1 },
    attackHitDone: false,
    attackCooldown: 0,
    hp: 1200,
    maxHp: 1200,
    posture: 240,
    maxPosture: 240,
    postureRegenDelay: 0,
    bossPhase: 1,
    ward: 3,
    maxWard: 3,
    phaseShifted: false,
    flash: 0,
    needles: [],
  };
}

export function loadTumurShulmasSprites(): TumurShulmasSpriteSet {
  const load = (name: TumurShulmasSpriteName): HTMLImageElement => {
    const image = new Image();
    image.decoding = "async";
    image.src = SPRITE_PATHS[name];
    return image;
  };

  return {
    idle: load("idle"),
    walk: load("walk"),
    claw: load("claw"),
    needle: load("needle"),
    stagger: load("stagger"),
    death: load("death"),
    summon: load("summon"),
  };
}

function imageReady(image: HTMLImageElement): boolean {
  return image.complete && image.naturalWidth > 0;
}

function phaseSprite(phase: TumurShulmasPhase): TumurShulmasSpriteName {
  switch (phase) {
    case "summoning":
      return "summon";
    case "walking":
      return "walk";
    case "claw":
      return "claw";
    case "needle":
    case "ironBloom":
      return "needle";
    case "phaseShift":
    case "stagger":
      return "stagger";
    case "death":
      return "death";
    case "sealed":
    case "idle":
    default:
      return "idle";
  }
}

function phaseProgress(encounter: TumurShulmasEncounter): number {
  const duration = PHASE_DURATION[encounter.phase];
  if (duration <= 0) return 0;
  return clamp(1 - encounter.phaseTimer / duration, 0, 1);
}

function smoothstep(progress: number): number {
  const value = clamp(progress, 0, 1);
  return value * value * (3 - 2 * value);
}

function nonLoopingFrame(progress: number, frameCount: number): number {
  return Math.min(
    frameCount - 1,
    Math.floor(smoothstep(progress) * frameCount),
  );
}

function spriteFrame(encounter: TumurShulmasEncounter, time: number): number {
  const spriteName = phaseSprite(encounter.phase);
  const spec = BOSS_ANIMATION_SPECS[spriteName];

  if (encounter.phase === "idle") {
    return Math.floor(time * spec.fps) % spec.frameCount;
  }
  if (encounter.phase === "walking") {
    const fps = encounter.bossPhase === 2 ? 9 : spec.fps;
    return Math.floor(time * fps) % spec.frameCount;
  }
  if (spec.loop) {
    return Math.floor(time * spec.fps) % spec.frameCount;
  }
  return nonLoopingFrame(phaseProgress(encounter), spec.frameCount);
}

function spriteRow(direction: Vector2): number {
  if (Math.abs(direction.y) >= Math.abs(direction.x)) {
    return direction.y < 0 ? 2 : 0;
  }
  return 1;
}

function safeDirection(from: Vector2, to: Vector2, fallback: Vector2): Vector2 {
  const direction = normalize({ x: to.x - from.x, y: to.y - from.y });
  if (Math.abs(direction.x) + Math.abs(direction.y) > 0.001) return direction;
  return fallback;
}

function setFacingTowardPlayer(state: GameState): void {
  const encounter = state.world.tumurShulmas;
  const facing = safeDirection(
    encounter.pos,
    state.player.pos,
    encounter.facing,
  );
  encounter.facing = facing;
}

function confineToArena(
  pos: Vector2,
  radius: number,
  center: Vector2,
  arenaRadius: number,
): void {
  const dx = pos.x - center.x;
  const dy = pos.y - center.y;
  const distance = Math.hypot(dx, dy);
  const maximum = Math.max(16, arenaRadius - radius);
  if (distance <= maximum || distance <= 0.001) return;

  const scale = maximum / distance;
  pos.x = center.x + dx * scale;
  pos.y = center.y + dy * scale;
}

function resetEncounter(encounter: TumurShulmasEncounter): void {
  encounter.defeated = false;
  encounter.phase = "summoning";
  encounter.phaseTimer = PHASE_DURATION.summoning;
  encounter.cycleIndex = 0;
  encounter.pos = {
    x: encounter.arenaCenter.x,
    y: encounter.arenaCenter.y - 27,
  };
  encounter.facing = { x: 0, y: 1 };
  encounter.attackDirection = { x: 0, y: 1 };
  encounter.attackHitDone = false;
  encounter.attackCooldown = 0.65;
  encounter.hp = encounter.maxHp;
  encounter.posture = encounter.maxPosture;
  encounter.postureRegenDelay = 0;
  encounter.bossPhase = 1;
  encounter.ward = encounter.maxWard;
  encounter.phaseShifted = false;
  encounter.flash = 0;
  encounter.needles = [];
}

function resetBossFeedback(state: GameState): void {
  state.fx.cameraShake = { remaining: 0, duration: 0, strength: 0 };
  state.fx.screenPulse = {
    remaining: 0,
    duration: 0,
    intensity: 0,
    color: "190,24,30",
  };
}

function preparePlayerForArena(state: GameState): void {
  const encounter = state.world.tumurShulmas;
  state.player.pos = {
    x: encounter.arenaCenter.x,
    y: encounter.arenaCenter.y + 172,
  };
  state.player.facing = { x: 0, y: -1 };
  state.player.moving = false;
  state.player.vitals.health = state.player.vitals.maxHealth;
  state.player.stamina = state.player.maxStamina;
  state.player.staminaRegenDelay = 0;
  state.player.combatPhase = "idle";
  state.player.combatTimer = 0;
  state.player.meleePhase = "idle";
  state.player.meleeTimer = 0;
  state.player.meleeHitDone = false;
  state.player.attackCooldown = 0;
  state.player.attackAnim = 0;
  state.player.attackMelee = false;
  state.player.attackHitDone = false;
  state.player.dodgePhase = "idle";
  state.player.dodgeTimer = 0;
  state.player.parryPhase = "idle";
  state.player.parryTimer = 0;
  state.player.parryArmed = false;
  state.combatMovementLocked = false;
  state.combatDodgeActive = false;
}

function enterPhase(
  encounter: TumurShulmasEncounter,
  phase: TumurShulmasPhase,
  duration = PHASE_DURATION[phase],
): void {
  encounter.phase = phase;
  encounter.phaseTimer = duration;
  encounter.attackHitDone = false;
}

function enterDeathPhase(state: GameState): void {
  const encounter = state.world.tumurShulmas;
  if (encounter.phase === "death") return;

  enterPhase(encounter, "death");
  encounter.needles = [];
  encounter.flash = 1;
  spawnImpactBurst(state, encounter.pos, {
    heavy: true,
    color: "#ef554e",
  });
  spawnParticles(state, encounter.pos, 30, "#ef554e", {
    speed: 175,
    life: 0.6,
    size: 3.4,
  });
  startCameraShake(state, 0.42, 11);
}

function moveTowardPlayer(state: GameState, dt: number): void {
  const encounter = state.world.tumurShulmas;
  const direction = safeDirection(
    encounter.pos,
    state.player.pos,
    encounter.facing,
  );
  const speed =
    encounter.bossPhase === 2 ? BOSS_SPEED_PHASE_2 : BOSS_SPEED_PHASE_1;
  encounter.pos.x += direction.x * speed * dt;
  encounter.pos.y += direction.y * speed * dt;
  encounter.facing = direction;
  confineToArena(
    encounter.pos,
    BOSS_RADIUS,
    encounter.arenaCenter,
    encounter.arenaRadius,
  );
}

function damagePlayer(
  state: GameState,
  damage: number,
  knockback: number,
): boolean {
  const player = state.player;
  const encounter = state.world.tumurShulmas;
  // Boss зөвхөн сүнсний оронд байдаг — playing шалгалт тулааныг унтраадаг байсан
  if (
    player.invuln > 0 ||
    (state.phase !== "playing" && state.phase !== "spirit")
  ) {
    return false;
  }

  const healthBefore = player.vitals.health;
  damagePastoralPlayer(state, damage);
  const healthDamage = Math.max(0, healthBefore - player.vitals.health);
  player.invuln = 0.58;
  state.fx.hurtFlash = 1;
  state.fx.shake = Math.max(state.fx.shake, 9);
  startCameraShake(state, 0.3, 12);
  startScreenPulse(state, 0.22, 0.24);
  const away = safeDirection(encounter.pos, player.pos, { x: 0, y: 1 });
  player.pos.x += away.x * knockback;
  player.pos.y += away.y * knockback;
  confineToArena(
    player.pos,
    player.radius,
    encounter.arenaCenter,
    encounter.arenaRadius,
  );
  spawnImpactBurst(state, player.pos, { heavy: true, color: "#d64045" });
  spawnParticles(state, player.pos, 14, "#d64045", { speed: 130, size: 3 });
  spawnText(
    state,
    player.pos,
    healthDamage > 0
      ? `−${Math.round(healthDamage)}`
      : "Морь хамгаалав",
    healthDamage > 0 ? "#ff7b73" : "#d7bf86",
  );
  triggerHitStop(state, 0.07);
  sfx("hurt");

  if (player.vitals.health <= 0) {
    state.phase = "lost";
    setMessage(state, "Наян есөн шидтэй төмөр шулмаст ялагдлаа…", 99);
  }
  return true;
}

function spawnNeedle(
  state: GameState,
  direction: Vector2,
  speed: number,
  damage: number,
): void {
  const encounter = state.world.tumurShulmas;
  encounter.needles.push({
    pos: {
      x: encounter.pos.x + direction.x * 44,
      y: encounter.pos.y + direction.y * 30 - 18,
    },
    vel: { x: direction.x * speed, y: direction.y * speed },
    radius: 6,
    damage,
    life: 2.4,
  });
}

function rotate(direction: Vector2, angle: number): Vector2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: direction.x * c - direction.y * s,
    y: direction.x * s + direction.y * c,
  };
}

function releaseNeedleFan(state: GameState): void {
  const encounter = state.world.tumurShulmas;
  const base = safeDirection(encounter.pos, state.player.pos, encounter.facing);
  const phase2 = encounter.bossPhase === 2;
  const count = phase2 ? 7 : 5;
  const spread = phase2 ? 0.72 : 0.5;
  const damage = phase2 ? NEEDLE_DAMAGE_PHASE_2 : NEEDLE_DAMAGE_PHASE_1;
  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 0.5 : i / (count - 1);
    const angle = (t - 0.5) * spread;
    spawnNeedle(state, rotate(base, angle), phase2 ? 270 : 235, damage);
  }
  spawnParticles(state, encounter.pos, 18, "#ef554e", {
    speed: 140,
    size: 2.8,
  });
  sfx("shoot");
}

function releaseIronBloom(state: GameState): void {
  const encounter = state.world.tumurShulmas;
  const count = 14;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    spawnNeedle(
      state,
      { x: Math.cos(angle), y: Math.sin(angle) },
      220,
      NEEDLE_DAMAGE_PHASE_2,
    );
  }
  state.fx.shake = Math.max(state.fx.shake, 10);
  spawnParticles(state, encounter.pos, 34, "#ff5048", {
    speed: 190,
    size: 3.2,
  });
  sfx("alert");
}

function updateNeedles(state: GameState, dt: number): void {
  const encounter = state.world.tumurShulmas;
  for (let i = encounter.needles.length - 1; i >= 0; i -= 1) {
    const needle = encounter.needles[i];
    needle.life -= dt;
    needle.pos.x += needle.vel.x * dt;
    needle.pos.y += needle.vel.y * dt;

    const outside =
      dist(needle.pos, encounter.arenaCenter) > encounter.arenaRadius + 45;
    if (needle.life <= 0 || outside) {
      encounter.needles.splice(i, 1);
      continue;
    }

    if (
      dist(needle.pos, state.player.pos) <=
      needle.radius + state.player.radius
    ) {
      damagePlayer(state, needle.damage, 17);
      encounter.needles.splice(i, 1);
    }
  }
}

function chooseAttack(state: GameState): void {
  const encounter = state.world.tumurShulmas;
  const distance = dist(encounter.pos, state.player.pos);
  encounter.attackDirection = safeDirection(
    encounter.pos,
    state.player.pos,
    encounter.facing,
  );

  const meleeRange = CLAW_REACH + state.player.radius + BOSS_RADIUS;

  // Ойрхон бол үргэлж сарвуу
  if (distance <= meleeRange + 8) {
    enterPhase(encounter, "claw");
    return;
  }

  // Хэт хол бол гүйж ойрт
  if (distance > 260) {
    enterPhase(encounter, "walking");
    return;
  }

  if (encounter.bossPhase === 2 && Math.random() < 0.34) {
    enterPhase(encounter, "ironBloom");
    return;
  }

  // Дунд зай — зүү эсвэл ойртоод сарвуу
  if (Math.random() < 0.55) {
    enterPhase(encounter, "needle");
  } else {
    enterPhase(encounter, "walking");
  }
}

function resolveClaw(state: GameState): void {
  const encounter = state.world.tumurShulmas;
  if (encounter.attackHitDone) return;
  const progress = phaseProgress(encounter);
  if (progress < 0.52) return;

  encounter.attackHitDone = true;
  const distance = dist(encounter.pos, state.player.pos);
  if (distance > CLAW_REACH + state.player.radius + 20) return;

  const toPlayer = safeDirection(
    encounter.pos,
    state.player.pos,
    encounter.attackDirection,
  );
  const dot =
    toPlayer.x * encounter.attackDirection.x +
    toPlayer.y * encounter.attackDirection.y;
  if (dot < 0.25) return;

  if (state.player.parryPhase === "active" && state.player.parryArmed) {
    state.player.parryArmed = false;
    encounter.posture = Math.max(0, encounter.posture - 70);
    encounter.postureRegenDelay = 2.6;
    state.fx.shake = Math.max(state.fx.shake, 11);
    triggerHitStop(state, 0.1);
    spawnImpactBurst(state, encounter.pos, { heavy: true, color: "#fff0a8" });
    spawnText(state, encounter.pos, "ТӨГС ХААЛТ!", "#fff0a8");
    sfx("parry");
    if (encounter.posture <= 0) {
      enterPhase(encounter, "stagger");
      setMessage(
        state,
        "Төмөр шулмасын тэнцвэр алдагдлаа. J — сөрөг цохилт.",
        2.6,
      );
    } else {
      enterPhase(encounter, "idle", 0.7);
      encounter.attackCooldown = 0.9;
    }
    return;
  }

  damagePlayer(
    state,
    encounter.bossPhase === 2 ? CLAW_DAMAGE_PHASE_2 : CLAW_DAMAGE_PHASE_1,
    32,
  );
}

function updateBossPosture(encounter: TumurShulmasEncounter, dt: number): void {
  encounter.postureRegenDelay = Math.max(0, encounter.postureRegenDelay - dt);
  if (
    encounter.postureRegenDelay <= 0 &&
    encounter.phase !== "stagger" &&
    encounter.phase !== "phaseShift" &&
    encounter.phase !== "death" &&
    encounter.posture < encounter.maxPosture
  ) {
    encounter.posture = Math.min(
      encounter.maxPosture,
      encounter.posture + 24 * dt,
    );
  }
}

export function isTumurShulmasParryThreat(state: GameState): boolean {
  const encounter = state.world.tumurShulmas;
  return (
    encounter.active &&
    !encounter.defeated &&
    encounter.phase === "claw" &&
    phaseProgress(encounter) >= 0.24 &&
    phaseProgress(encounter) < 0.65
  );
}

export function damageTumurShulmasFromPlayer(
  state: GameState,
  damage: number,
  postureDamage: number,
  heavy: boolean,
): boolean {
  const encounter = state.world.tumurShulmas;
  if (
    !encounter.active ||
    encounter.defeated ||
    encounter.phase === "summoning" ||
    encounter.phase === "phaseShift" ||
    encounter.phase === "death"
  ) {
    return false;
  }

  if (!state.player.hasSkySword || state.player.weapon !== "skySword") {
    spawnText(
      state,
      encounter.pos,
      "Энэ төмөр биеийг энгийн зэвсгээр сүлбэшгүй",
      "#c9c2c9",
    );
    setMessage(
      state,
      "Төмөр биеийг зөвхөн Хөх тэнгэрийн сэлэм шархдуулна.",
      2.3,
    );
    sfx("hit");
    return true;
  }

  if (encounter.phase === "stagger") {
    const counterDamage = Math.max(150, Math.round(encounter.maxHp * 0.18));
    encounter.hp = Math.max(0, encounter.hp - counterDamage);
    encounter.posture = Math.max(1, encounter.maxPosture * 0.5);
    encounter.postureRegenDelay = 2.2;
    spawnImpactBurst(state, encounter.pos, { heavy: true, color: "#d8f5ff" });
    spawnParticles(state, encounter.pos, 30, "#d8f5ff", {
      speed: 190,
      size: 3.6,
    });
    spawnText(
      state,
      encounter.pos,
      `Ирсэн их аюулыг эгц өөд нь буцаав! −${counterDamage}`,
      "#d8f5ff",
    );
    state.fx.shake = Math.max(state.fx.shake, 13);
    startCameraShake(state, 0.34, 9);
    triggerHitStop(state, 0.12);
    sfx("parry");
    if (encounter.hp <= 0) {
      enterDeathPhase(state);
    } else {
      enterPhase(encounter, "idle", 0.9);
      encounter.attackCooldown = 1.2;
    }
    return true;
  }

  if (encounter.ward > 0) {
    encounter.ward -= 1;
    encounter.flash = 1;
    spawnImpactBurst(state, encounter.pos, { heavy: true, color: "#89ddff" });
    spawnParticles(state, encounter.pos, 24, "#89ddff", {
      speed: 180,
      size: 3.2,
    });
    spawnText(
      state,
      encounter.pos,
      `ХАЛХАВЧЛАХ ТӨМӨР ${encounter.ward}/${encounter.maxWard}`,
      "#bdefff",
    );
    state.fx.shake = Math.max(state.fx.shake, 9);
    startCameraShake(state, 0.24, 6.5);
    triggerHitStop(state, 0.085);
    sfx("hit");
    if (encounter.ward <= 0) {
      setMessage(state, "Эгэлгүй энэ төмөр хуягийг илд жадаар сүлбэшгүй.", 2.8);
    }
    return true;
  }

  encounter.hp = Math.max(0, encounter.hp - damage);
  encounter.posture = Math.max(0, encounter.posture - postureDamage);
  encounter.postureRegenDelay = 2.5;
  encounter.flash = 1;
  spawnImpactBurst(state, encounter.pos, {
    heavy,
    color: "#b9eaff",
  });
  spawnParticles(state, encounter.pos, heavy ? 22 : 14, "#b9eaff", {
    speed: heavy ? 175 : 125,
    size: heavy ? 3.2 : 2.6,
  });
  spawnText(state, encounter.pos, `−${Math.round(damage)}`, "#d9f4ff");
  triggerHitStop(state, heavy ? 0.085 : 0.055);
  startCameraShake(state, heavy ? 0.28 : 0.2, heavy ? 7.5 : 4.5);
  sfx("hit");

  if (encounter.hp <= 0) {
    enterDeathPhase(state);
    setMessage(state, "Наян есөн шидтэй шулмас нам дор сөхрөв.…", 3.5);
    return true;
  }

  if (encounter.posture <= 0) {
    enterPhase(encounter, "stagger");
    setMessage(state, "Төмөр шулмасын тэнхэл барагдав  J — Сөрөг цохилт", 2.6);
  }
  return true;
}

export function updateTumurShulmasEncounter(
  state: GameState,
  dt: number,
): void {
  const encounter = state.world.tumurShulmas;
  // Зөвхөн сүнсний оронд идэвхтэй
  if (!encounter.active || state.phase !== "spirit") return;
  if (state.spiritMode !== "shulmas") return;

  confineToArena(
    state.player.pos,
    state.player.radius,
    encounter.arenaCenter,
    encounter.arenaRadius,
  );
  confineToArena(
    encounter.pos,
    BOSS_RADIUS,
    encounter.arenaCenter,
    encounter.arenaRadius,
  );
  if (encounter.phase === "death") {
    encounter.needles = [];
  } else {
    updateNeedles(state, dt);
    if (state.phase !== "spirit") return;
  }
  encounter.flash = Math.max(0, encounter.flash - dt * 4.5);
  encounter.attackCooldown = Math.max(0, encounter.attackCooldown - dt);
  updateBossPosture(encounter, dt);

  encounter.phaseTimer = Math.max(0, encounter.phaseTimer - dt);

  if (encounter.phase === "death") {
    if (encounter.phaseTimer <= 0 && !encounter.defeated) {
      encounter.defeated = true;
      encounter.needles = [];
      spawnSoulRelease(state, encounter.pos, 54, "#f4d8ff");
      spawnParticles(state, encounter.pos, 52, "#ef554e", {
        speed: 210,
        size: 3.6,
      });
      state.fx.shake = Math.max(state.fx.shake, 14);
      startCameraShake(state, 0.48, 12);
      state.score += 1200;
      state.spiritCleared = true;
      setMessage(
        state,
        "Наян есөн шидтэй Төмөр Шулмасын тамир барагдаж, гол тасрав. E — бодит ертөнц рүү буцах.",
        8,
      );
    }
    return;
  }

  if (encounter.phase === "summoning") {
    const progress = phaseProgress(encounter);
    encounter.pos.y = encounter.arenaCenter.y - 45 + (1 - progress) * 18;
    if (encounter.phaseTimer <= 0) {
      enterPhase(encounter, "idle", 0.2);
      encounter.attackCooldown = 0.15;
      spawnText(
        state,
        encounter.pos,
        "НАЯН ЕСӨН ШИДТЭЙ ТӨМӨР ШУЛМАС",
        "#ff8b7c",
      );
      setMessage(
        state,
        "Төмөр Шулмасын төрөлх зан сэргэж, наян есөн хар шидээр давшин дайрахаар зэхэв.",
        5.5,
      );
      sfx("alert");
    }
    return;
  }

  if (!encounter.phaseShifted && encounter.hp <= encounter.maxHp * 0.5) {
    encounter.phaseShifted = true;
    encounter.bossPhase = 2;
    encounter.ward = 2;
    encounter.maxWard = 2;
    encounter.posture = encounter.maxPosture;
    encounter.needles = [];
    enterPhase(encounter, "phaseShift");
    spawnParticles(state, encounter.pos, 48, "#ff4038", {
      speed: 220,
      size: 3.8,
    });
    spawnParticles(state, encounter.arenaCenter, 36, "#64142b", {
      speed: 155,
      life: 0.75,
      size: 4.2,
      gravity: 35,
    });
    encounter.flash = 1;
    state.fx.shake = Math.max(state.fx.shake, 14);
    startCameraShake(state, 0.55, 14);
    setMessage(state, "Төмөр шулмасын жинхэнэ хүч сэргэв", 3.8);
    sfx("levelup");
    return;
  }

  if (encounter.phase === "phaseShift") {
    if (encounter.phaseTimer <= 0) {
      enterPhase(encounter, "ironBloom");
    }
    return;
  }

  if (encounter.phase === "stagger") {
    if (encounter.phaseTimer <= 0) {
      encounter.posture = Math.max(encounter.maxPosture * 0.45, 1);
      encounter.postureRegenDelay = 1.5;
      enterPhase(encounter, "idle", 0.7);
      encounter.attackCooldown = 0.8;
    }
    return;
  }

  setFacingTowardPlayer(state);

  if (encounter.phase === "claw") {
    resolveClaw(state);
    if (encounter.phaseTimer <= 0) {
      enterPhase(encounter, "idle", 0.42);
      encounter.attackCooldown = encounter.bossPhase === 2 ? 0.36 : 0.56;
    }
    return;
  }

  if (encounter.phase === "needle") {
    if (!encounter.attackHitDone && phaseProgress(encounter) >= 0.52) {
      encounter.attackHitDone = true;
      releaseNeedleFan(state);
    }
    if (encounter.phaseTimer <= 0) {
      enterPhase(encounter, "idle", 0.45);
      encounter.attackCooldown = encounter.bossPhase === 2 ? 0.38 : 0.65;
    }
    return;
  }

  if (encounter.phase === "ironBloom") {
    if (!encounter.attackHitDone && phaseProgress(encounter) >= 0.58) {
      encounter.attackHitDone = true;
      releaseIronBloom(state);
    }
    if (encounter.phaseTimer <= 0) {
      enterPhase(encounter, "idle", 0.55);
      encounter.attackCooldown = 0.7;
    }
    return;
  }

  const distanceToPlayer = dist(encounter.pos, state.player.pos);
  const meleeRange = CLAW_REACH + state.player.radius + BOSS_RADIUS;

  if (encounter.phase === "walking") {
    moveTowardPlayer(state, dt);
    // Ойртсон эсвэл алхах хугацаа дууссан бол дайрна
    if (distanceToPlayer <= meleeRange + 6 || encounter.phaseTimer <= 0) {
      chooseAttack(state);
    }
    return;
  }

  if (encounter.phase === "idle") {
    // Idle-д зогсохгүй — шууд ойртох эсвэл дайрах
    if (encounter.phaseTimer <= 0 && encounter.attackCooldown <= 0) {
      if (distanceToPlayer > meleeRange + 4) {
        enterPhase(encounter, "walking");
      } else {
        chooseAttack(state);
      }
    }
  }
}

export function tryInteractTumurShulmasGate(state: GameState): boolean {
  if (!state.input.interact) return false;

  const encounter = state.world.tumurShulmas;

  if (encounter.active) {
    if (
      dist(state.player.pos, encounter.exitPos) <=
      encounter.gateRadius + 28
    ) {
      state.input.interact = false;
      if (!encounter.defeated) {
        setMessage(state, "Төмөр хаалга тулаан дуусах хүртэл түгжээтэй.", 2.4);
        sfx("move");
        return true;
      }
      encounter.active = false;
      encounter.phase = "sealed";
      encounter.phaseTimer = 0;
      exitSpiritWorld(state, "Төмөр шулмасын ордноос буцлаа.");
      return true;
    }
    return false;
  }

  if (dist(state.player.pos, encounter.gatePos) > encounter.gateRadius + 28) {
    return false;
  }

  state.input.interact = false;

  if (!encounter.unlocked || !state.player.hasSkySword) {
    setMessage(
      state,
      "Хар төмөр хаалгыг нээхийн тулд Шулмасын баатрыг ялж, Хөх тэнгэрийн сэлмийг ол.",
      3.2,
    );
    sfx("move");
    return true;
  }

  enterShulmasSpirit(state);
  encounter.active = true;
  resetEncounter(encounter);
  resetBossFeedback(state);
  preparePlayerForArena(state);

  spawnParticles(state, encounter.arenaCenter, 44, "#d63f39", {
    speed: 175,
    size: 3.3,
  });
  state.fx.shake = Math.max(state.fx.shake, 11);
  setMessage(state, "Сүнсний оронд Хар төмөр хаалга нээгдэж, boss тулаан эхэллээ.", 4);
  sfx("levelup");
  return true;
}

/** Debug / cheat — 5 дарвал шулмасын сүнс рүү орно; дахин 5 = босс тулаан */
export function forceStartTumurShulmasBoss(state: GameState): void {
  if (state.phase !== "playing" && state.phase !== "spirit") return;

  const encounter = state.world.tumurShulmas;
  const inShulmas =
    state.phase === "spirit" && state.spiritMode === "shulmas";

  // Аль хэдийн босс тулаан үргэлжилж байвал аренад аваачина
  if (
    inShulmas &&
    encounter.active &&
    !encounter.defeated &&
    encounter.phase !== "death" &&
    encounter.phase !== "sealed"
  ) {
    preparePlayerForArena(state);
    setMessage(state, "Төмөр шулмасын аренад буцлаа.", 2);
    return;
  }

  // Сүнсэнд байгаа үед 5 дахин дарвал шууд босс эхэлнэ
  if (inShulmas) {
    encounter.unlocked = true;
    encounter.defeated = false;
    encounter.active = true;
    state.player.hasSkySword = true;
    state.player.weapon = "skySword";
    resetEncounter(encounter);
    resetBossFeedback(state);
    preparePlayerForArena(state);
    spawnParticles(state, encounter.arenaCenter, 44, "#d63f39", {
      speed: 175,
      size: 3.3,
    });
    state.fx.shake = Math.max(state.fx.shake, 11);
    setMessage(state, "5 · Төмөр шулмасын тулаан эхэллээ!", 3.5);
    sfx("levelup");
    return;
  }

  // Бодит ертөнцөөс 5 — сүнс рүү орж туслах + хаалгануудтай замд аваачина
  encounter.unlocked = true;
  encounter.defeated = false;
  encounter.active = false;
  encounter.phase = "sealed";
  state.player.hasSkySword = true;
  state.player.weapon = "skySword";

  ensureShulmasHelpers(state);
  enterShulmasSpirit(state);
  placePlayerNearHelpers(state);

  state.player.vitals.health = state.player.vitals.maxHealth;
  resetBossFeedback(state);

  spawnParticles(state, state.player.pos, 28, "#a8d4ff", {
    speed: 140,
    size: 2.8,
  });
  setMessage(
    state,
    "Шулмасын сүнсний орон · туслахууд ба хаалганууд голын цаана. 5 дахин — шууд босс.",
    5,
  );
  sfx("levelup");
}

export function drawTumurShulmasArena(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  const encounter = state.world.tumurShulmas;
  if (!encounter.active) return;

  const x = encounter.arenaCenter.x - cam.x;
  const y = encounter.arenaCenter.y - cam.y;
  const pulse = 0.5 + Math.sin(time * 2.2) * 0.08;

  ctx.save();
  const ground = ctx.createRadialGradient(
    x,
    y,
    30,
    x,
    y,
    encounter.arenaRadius,
  );
  ground.addColorStop(
    0,
    encounter.bossPhase === 2 ? "rgba(55,8,13,0.9)" : "rgba(38,15,18,0.86)",
  );
  ground.addColorStop(0.62, "rgba(18,12,15,0.7)");
  ground.addColorStop(1, "rgba(5,5,7,0.12)");
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.arc(x, y, encounter.arenaRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(215,60,52,${pulse})`;
  ctx.lineWidth = 4;
  ctx.setLineDash([13, 10]);
  ctx.lineDashOffset = -time * (encounter.bossPhase === 2 ? 34 : 20);
  ctx.beginPath();
  ctx.arc(x, y, encounter.arenaRadius - 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawGateShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  open: boolean,
  time: number,
): void {
  const glow = open ? 0.38 + Math.sin(time * 4) * 0.08 : 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = `rgba(210,50,43,${glow})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, 62, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#20191d";
  ctx.fillRect(-48, -55, 18, 66);
  ctx.fillRect(30, -55, 18, 66);
  ctx.fillRect(-48, -58, 96, 18);
  ctx.strokeStyle = open ? "#db6256" : "#6d626b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-27, 8);
  ctx.lineTo(-27, -35);
  ctx.quadraticCurveTo(0, -58, 27, -35);
  ctx.lineTo(27, 8);
  ctx.stroke();
  for (let i = -2; i <= 2; i += 1) {
    ctx.strokeStyle = open ? "rgba(255,112,90,0.72)" : "rgba(130,120,130,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(i * 11, -40);
    ctx.lineTo(i * 11, 5);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTumurShulmasGate(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  const encounter = state.world.tumurShulmas;
  const x = encounter.gatePos.x - cam.x;
  const y = encounter.gatePos.y - cam.y;
  drawGateShape(
    ctx,
    x,
    y,
    encounter.unlocked || encounter.defeated,
    time,
  );
  ctx.textAlign = "center";
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.82)";
  ctx.lineWidth = 4;
  ctx.strokeText("ХАР ТӨМӨР ХААЛГА", x, y - 72);
  ctx.fillStyle = encounter.unlocked ? "#ffaca0" : "#9d919b";
  ctx.fillText("ХАР ТӨМӨР ХААЛГА", x, y - 72);
  ctx.textAlign = "left";
}

export function drawTumurShulmasExit(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  const encounter = state.world.tumurShulmas;
  if (!encounter.active) return;
  drawGateShape(
    ctx,
    encounter.exitPos.x - cam.x,
    encounter.exitPos.y - cam.y,
    encounter.defeated,
    time,
  );
}

function drawFallbackBoss(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
): void {
  const pulse = 1 + Math.sin(time * 4) * 0.025;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "#171318";
  ctx.beginPath();
  ctx.ellipse(0, -37, 44, 65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b83e36";
  ctx.lineWidth = 5;
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 10, -75);
    ctx.lineTo(i * 17, -108);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTumurShulmasTelegraphs(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  const encounter = state.world.tumurShulmas;
  if (!encounter.active || encounter.phase === "death") return;

  const x = encounter.pos.x - cam.x;
  const y = encounter.pos.y - cam.y;
  const progress = phaseProgress(encounter);

  if (
    encounter.phase === "claw" &&
    progress < 0.52 &&
    !encounter.attackHitDone
  ) {
    const angle = Math.atan2(
      encounter.attackDirection.y,
      encounter.attackDirection.x,
    );
    const readiness = smoothstep(progress / 0.52);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = `rgba(255,55,45,${0.1 + readiness * 0.28})`;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.arc(0, 0, 125, -0.55, 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255,190,135,${0.45 + readiness * 0.5})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, 105, -0.52, 0.52);
    ctx.stroke();
    ctx.restore();
  }

  if (
    encounter.phase === "needle" &&
    progress < 0.52 &&
    !encounter.attackHitDone
  ) {
    const readiness = smoothstep(progress / 0.52);
    const direction = encounter.facing;
    const length = 78 + readiness * 54;
    const endX = x + direction.x * length;
    const endY = y - 22 + direction.y * length;
    const glow = ctx.createRadialGradient(x, y - 28, 5, x, y - 28, 58);
    glow.addColorStop(0, `rgba(255,92,78,${0.28 + readiness * 0.4})`);
    glow.addColorStop(1, "rgba(255,55,45,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 28, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,170,145,${0.4 + readiness * 0.5})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(x + direction.x * 34, y - 22 + direction.y * 34);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffb09f";
    ctx.beginPath();
    ctx.arc(endX, endY, 3 + readiness * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (encounter.phase === "summoning") {
    const ritualProgress = smoothstep(progress);
    const pulse = 0.82 + Math.sin(time * 9) * 0.08;
    const radius = (52 + ritualProgress * 74) * pulse;
    ctx.save();
    ctx.strokeStyle = `rgba(225,65,58,${0.35 + ritualProgress * 0.48})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -time * 34;
    ctx.beginPath();
    ctx.arc(x, y + 10, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,165,125,${0.22 + ritualProgress * 0.35})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + 10, radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (
    encounter.phase === "ironBloom" &&
    progress < 0.58 &&
    !encounter.attackHitDone
  ) {
    ctx.strokeStyle = `rgba(255,70,58,${0.35 + progress * 0.45})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, 70 + progress * 80, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (encounter.phase === "phaseShift") {
    const arenaX = encounter.arenaCenter.x - cam.x;
    const arenaY = encounter.arenaCenter.y - cam.y;
    const wave = smoothstep(progress);
    const radius = 40 + wave * (encounter.arenaRadius - 24);
    ctx.save();
    ctx.strokeStyle = `rgba(220,45,70,${0.75 * (1 - wave * 0.45)})`;
    ctx.lineWidth = 8 - wave * 4;
    ctx.beginPath();
    ctx.arc(arenaX, arenaY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(65,8,24,${0.16 * (1 - wave)})`;
    ctx.beginPath();
    ctx.arc(arenaX, arenaY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawTumurShulmas(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  time: number,
  sprites: TumurShulmasSpriteSet,
): void {
  const encounter = state.world.tumurShulmas;
  if (!encounter.active) return;

  const x = encounter.pos.x - cam.x;
  const y = encounter.pos.y - cam.y;
  const spriteName = phaseSprite(encounter.phase);
  const image = sprites[spriteName];

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.48)";
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 54, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!imageReady(image)) {
    drawFallbackBoss(ctx, x, y, time);
    ctx.restore();
    return;
  }

  const row = spriteRow(encounter.facing);
  const frame = spriteFrame(encounter, time);
  const flipX =
    Math.abs(encounter.facing.x) > Math.abs(encounter.facing.y) &&
    encounter.facing.x < 0;
  const summonAlpha =
    encounter.phase === "summoning"
      ? clamp(phaseProgress(encounter) * 1.5, 0, 1)
      : encounter.phase === "death"
        ? clamp(encounter.phaseTimer / 0.35, 0, 1)
        : 1;
  const bob = Math.sin(time * (encounter.bossPhase === 2 ? 6.2 : 4.5)) * 1.5;
  const clawPullback =
    encounter.phase === "claw" && phaseProgress(encounter) < 0.52
      ? smoothstep(phaseProgress(encounter) / 0.52) * 10
      : 0;

  ctx.translate(
    x - encounter.attackDirection.x * clawPullback,
    y + bob - encounter.attackDirection.y * clawPullback,
  );
  if (flipX) ctx.scale(-1, 1);
  ctx.globalAlpha = summonAlpha;
  if (encounter.flash > 0 || encounter.phase === "phaseShift") {
    const phasePulse =
      encounter.phase === "phaseShift" ? 0.72 + Math.sin(time * 28) * 0.2 : 1;
    ctx.globalAlpha *= 0.65 + Math.sin(time * 40) * 0.25;
    ctx.globalAlpha *= phasePulse;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    image,
    frame * FRAME_SIZE,
    row * FRAME_SIZE,
    FRAME_SIZE,
    FRAME_SIZE,
    -DRAW_SIZE / 2,
    -DRAW_SIZE + 36,
    DRAW_SIZE,
    DRAW_SIZE,
  );
  ctx.restore();

  if (encounter.ward > 0 && encounter.phase !== "death") {
    ctx.save();
    ctx.strokeStyle = "rgba(130,220,255,0.64)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 7]);
    ctx.lineDashOffset = -time * 28;
    ctx.beginPath();
    ctx.arc(x, y - 32, 68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawTumurShulmasNeedles(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  const encounter = state.world.tumurShulmas;
  if (!encounter.active) return;
  ctx.save();
  ctx.lineCap = "round";
  for (const needle of encounter.needles) {
    const speed = Math.hypot(needle.vel.x, needle.vel.y) || 1;
    const nx = needle.vel.x / speed;
    const ny = needle.vel.y / speed;
    const x = needle.pos.x - cam.x;
    const y = needle.pos.y - cam.y;
    ctx.strokeStyle = "rgba(255,68,60,0.45)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - nx * 14, y - ny * 14);
    ctx.lineTo(x + nx * 8, y + ny * 8);
    ctx.stroke();
    ctx.strokeStyle = "#ffaca0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - nx * 10, y - ny * 10);
    ctx.lineTo(x + nx * 9, y + ny * 9);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTumurShulmasHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const encounter = state.world.tumurShulmas;
  if (!encounter.active || encounter.phase === "summoning") return;

  const width = 430;
  const height = 18;
  const x = (VIEW_W - width) / 2;
  const y = VIEW_H - 68;
  const hpRatio = clamp(encounter.hp / encounter.maxHp, 0, 1);
  const postureRatio = clamp(encounter.posture / encounter.maxPosture, 0, 1);
  const deathFade =
    encounter.phase === "death"
      ? clamp(encounter.phaseTimer / (PHASE_DURATION.death * 0.65), 0, 1)
      : 1;

  ctx.save();
  ctx.globalAlpha = deathFade;
  ctx.textAlign = "center";
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.lineWidth = 4;
  ctx.strokeText("НАЯН ЕСӨН ШИДТЭЙ ТӨМӨР ШУЛМАС", VIEW_W / 2, y - 12);
  ctx.fillStyle = encounter.bossPhase === 2 ? "#ff6d63" : "#ffaaa0";
  ctx.fillText("НАЯН ЕСӨН ШИДТЭЙ ТӨМӨР ШУЛМАС", VIEW_W / 2, y - 12);

  ctx.fillStyle = "rgba(8,6,8,0.85)";
  ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
  ctx.fillStyle = "#55191f";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = encounter.bossPhase === 2 ? "#dc2f38" : "#a9323a";
  ctx.fillRect(x, y, width * hpRatio, height);

  ctx.fillStyle = "rgba(8,6,8,0.88)";
  ctx.fillRect(x, y + 24, width, 7);
  ctx.fillStyle = "#e6bd58";
  ctx.fillRect(x, y + 24, width * postureRatio, 7);

  ctx.textAlign = "left";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.fillStyle = "#cceeff";
  ctx.fillText(`Төмөр хаалт: ${encounter.ward}`, x, y - 12);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd6d1";
  ctx.fillText(`Үе ${encounter.bossPhase}`, x + width, y - 12);
  ctx.restore();
}

export function drawTumurShulmasHint(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  const encounter = state.world.tumurShulmas;

  if (encounter.active) {
    if (dist(state.player.pos, encounter.exitPos) > encounter.gateRadius + 38) {
      return;
    }
    const x = encounter.exitPos.x - cam.x;
    const y = encounter.exitPos.y - cam.y - 78;
    const text = encounter.defeated
      ? "E — Ордноос буцах"
      : "Хаалга тулаан дуустал түгжээтэй";
    drawHintText(ctx, text, x, y, encounter.defeated ? "#ffd4cd" : "#ff8a7d");
    return;
  }

  if (dist(state.player.pos, encounter.gatePos) > encounter.gateRadius + 38) {
    return;
  }

  const x = encounter.gatePos.x - cam.x;
  const y = encounter.gatePos.y - cam.y - 94;
  drawHintText(
    ctx,
    encounter.unlocked
      ? "E — Төмөр шулмасын ордонд орох"
      : "E — Түгжээтэй · эхлээд Шулмасын баатрыг ял",
    x,
    y,
    encounter.unlocked ? "#ffb4a8" : "#b9adb7",
  );
}

function drawHintText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
): void {
  if (x < -180 || x > VIEW_W + 180 || y < -80 || y > VIEW_H + 80) return;
  ctx.textAlign = "center";
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = 4;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}
