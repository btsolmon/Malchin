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
import { fadeOutTumurBossMusic, sfx, startTumurBossMusic } from "./audio";
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
import { riverCenterX, RIVER_HALF_W } from "./biomes";
import { trFormat } from "./lang";
import { drawFlameArenaRing, BLUE_FIRE } from "./render/arenaFire";
import { drawBossVitalsHud } from "./render/bossHud";

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
  // Хаалга хойд (дээшээ) — арена хуучин байрандаа өмнөд хэсэгт
  const gateY = WORLD_H * 0.3;
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
    pos: { x: arenaCenter.x, y: arenaCenter.y - 45 },
    facing: { x: 0, y: 1 },
    attackDirection: { x: 0, y: 1 },
    attackHitDone: false,
    attackCooldown: 0,
    hp: 950,
    maxHp: 950,
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
  fadeOutTumurBossMusic(4.2);
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
    setMessage(state, "Төмөр шулмаст ялагдлаа…", 99);
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
      "Төмөр биеийг зөвхөн Хөх тэнгэрийн сэлэм шархдуулна. Богцоос сэлмээ сонго.",
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
      trFormat("Ирсэн их аюулыг эгц өөд нь буцаав! −{dmg}", {
        dmg: counterDamage,
      }),
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
      trFormat("ХАЛХАВЧЛАХ ТӨМӨР {have}/{max}", {
        have: encounter.ward,
        max: encounter.maxWard,
      }),
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
    setMessage(state, "Төмөр шулмас нам дор сөхрөв.…", 3.5);
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
        "Төмөр Шулмас унав. Аав ээжийг буцаан өглөө. E — гэртээ буцаж, хамт амьдар.",
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
        "ТӨМӨР ШУЛМАС",
        "#ff8b7c",
      );
      setMessage(
        state,
        "Төмөр шулмасын төрөлх зан сэргэж, давшин дайрахаар зэхэв.",
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
      "Хар төмөр хаалгыг нээхийн тулд долоон толгойтой мангасыг ялж, Хөх тэнгэрийн сэлмийг ол.",
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
  startTumurBossMusic();

  spawnParticles(state, encounter.arenaCenter, 44, "#d63f39", {
    speed: 175,
    size: 3.3,
  });
  state.fx.shake = Math.max(state.fx.shake, 11);
  setMessage(state, "Доод тивд Хар төмөр хаалга нээгдэж, boss тулаан эхэллээ.", 4);
  sfx("levelup");
  return true;
}

/** Debug / cheat — 5 дарвал шууд Төмөр шулмасын тулаан эхэлнэ */
export function forceStartTumurShulmasBoss(state: GameState): void {
  if (state.phase !== "playing" && state.phase !== "spirit") return;

  const encounter = state.world.tumurShulmas;

  encounter.unlocked = true;
  encounter.defeated = false;
  state.player.hasSkySword = true;
  state.player.weapon = "staff";

  // Сүнсэнд байгаагүй бол аренад орох
  if (state.phase !== "spirit" || state.spiritMode !== "shulmas") {
    enterShulmasSpirit(state);
  }

  encounter.active = true;
  resetEncounter(encounter);
  resetBossFeedback(state);
  preparePlayerForArena(state);
  startTumurBossMusic();

  spawnParticles(state, encounter.arenaCenter, 44, "#d63f39", {
    speed: 175,
    size: 3.3,
  });
  state.fx.shake = Math.max(state.fx.shake, 11);
  setMessage(state, "Төмөр шулмасын тулаан эхэллээ!", 3.5);
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
  drawFlameArenaRing(ctx, x, y, encounter.arenaRadius, time, BLUE_FIRE, {
    heightScale: encounter.bossPhase === 2 ? 2.2 : 1.9,
    fierce: true,
    defeated: encounter.defeated,
  });
}

/** Аргаль гавал — зурагтай адил урд харагдах, хоёр том эвэртэй */
function drawArgaliSkull(
  ctx: CanvasRenderingContext2D,
  scale = 1,
): void {
  const bone = "#e8e0d4";
  const boneMid = "#d0c4b4";
  const boneDark = "#a89888";
  const socket = "#1a1410";
  const horn = "#2a2018";
  const hornMid = "#3a3028";
  const hornLite = "#4a4038";

  ctx.save();
  ctx.scale(scale, scale);

  // —— Хоёр эвэр (гавлын ард/дээр эхлээд) ——
  const drawHorn = (side: 1 | -1) => {
    ctx.save();
    ctx.scale(side, 1);
    // Үндэс
    ctx.fillStyle = horn;
    ctx.beginPath();
    ctx.ellipse(7, -10, 7, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Гол муруй — гадагш → дээш → доош урагш
    ctx.strokeStyle = horn;
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(6, -8);
    ctx.bezierCurveTo(18, -22, 32, -18, 34, 2);
    ctx.bezierCurveTo(35, 14, 28, 22, 18, 24);
    ctx.stroke();
    ctx.strokeStyle = hornMid;
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(6, -8);
    ctx.bezierCurveTo(17, -20, 30, -16, 32, 2);
    ctx.bezierCurveTo(33, 12, 27, 19, 19, 21);
    ctx.stroke();
    // Өсөлтийн цагираг
    ctx.strokeStyle = hornLite;
    ctx.lineWidth = 1.15;
    ctx.globalAlpha = 0.55;
    const rings: Array<[number, number, number, number]> = [
      [10, -12, 14, -16],
      [16, -18, 22, -14],
      [24, -12, 28, -4],
      [30, 2, 32, 8],
      [30, 12, 26, 18],
      [22, 20, 18, 22],
    ];
    for (const [ax, ay, bx, by] of rings) {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx) * 0.5 + 2, (ay + by) * 0.5, bx, by);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Үзүүр
    ctx.fillStyle = hornLite;
    ctx.beginPath();
    ctx.moveTo(16, 22);
    ctx.lineTo(14, 28);
    ctx.lineTo(20, 24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  drawHorn(-1);
  drawHorn(1);

  // —— Гавал ——
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.ellipse(0, -2, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Духан
  ctx.fillStyle = boneMid;
  ctx.beginPath();
  ctx.ellipse(0, -8, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Хошуу / хамар
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.quadraticCurveTo(-5, 16, -2.5, 20);
  ctx.lineTo(2.5, 20);
  ctx.quadraticCurveTo(5, 16, 6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = boneMid;
  ctx.beginPath();
  ctx.ellipse(0, 14, 4.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Хамрын нүх
  ctx.fillStyle = socket;
  ctx.beginPath();
  ctx.ellipse(-1.8, 16, 1.6, 2.8, -0.15, 0, Math.PI * 2);
  ctx.ellipse(1.8, 16, 1.6, 2.8, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Нүдний нүх
  ctx.fillStyle = socket;
  ctx.beginPath();
  ctx.ellipse(-5.2, -1, 3.4, 4.0, -0.2, 0, Math.PI * 2);
  ctx.ellipse(5.2, -1, 3.4, 4.0, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Нүдний гүн сүүдэр
  ctx.fillStyle = "#0c0a08";
  ctx.beginPath();
  ctx.ellipse(-5.0, 0.2, 2.0, 2.4, -0.15, 0, Math.PI * 2);
  ctx.ellipse(5.0, 0.2, 2.0, 2.4, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Ясны оёдол
  ctx.strokeStyle = boneDark;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 8);
  ctx.moveTo(-8, -6);
  ctx.quadraticCurveTo(0, -4, 8, -6);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Шүд (дээд)
  ctx.fillStyle = "#f4efe6";
  for (const tx of [-3.2, -1.0, 1.0, 3.2] as const) {
    ctx.beginPath();
    ctx.moveTo(tx - 0.7, 19);
    ctx.lineTo(tx, 22.5);
    ctx.lineTo(tx + 0.7, 19);
    ctx.closePath();
    ctx.fill();
  }

  // Эврийн суурь (гавлын орой)
  ctx.fillStyle = horn;
  ctx.beginPath();
  ctx.ellipse(-7, -11, 5, 4, -0.3, 0, Math.PI * 2);
  ctx.ellipse(7, -11, 5, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGateShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  open: boolean,
  time: number,
): void {
  // Хар төмөр хаалга — төмөр багана + аргаль гавал
  const pulse = 0.5 + Math.sin(time * 3.2) * 0.12;
  const iron = open ? "#3a3236" : "#1a1618";
  const ironMid = open ? "#4a4246" : "#2a2428";
  const ironLite = open ? "#6a6068" : "#3a3438";
  const ironDark = "#0c0a0c";
  const rivet = "#5a5058";
  const glow = open
    ? `rgba(255,90,60,${0.28 + pulse * 0.18})`
    : `rgba(60,40,70,${0.14 + pulse * 0.08})`;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(6,4,6,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 74, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-30, 12);
  ctx.lineTo(-30, -50);
  ctx.quadraticCurveTo(0, -78, 30, -50);
  ctx.lineTo(30, 12);
  ctx.closePath();
  ctx.fill();

  // Зүүн төмөр багана
  ctx.fillStyle = ironDark;
  ctx.fillRect(-54, -58, 20, 78);
  ctx.fillStyle = iron;
  ctx.fillRect(-51, -55, 14, 72);
  ctx.fillStyle = ironLite;
  ctx.fillRect(-49, -53, 3, 68);
  // Тав
  ctx.fillStyle = rivet;
  for (const ry of [-48, -32, -16, 0, 12] as const) {
    ctx.beginPath();
    ctx.arc(-44, ry, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Баруун төмөр багана
  ctx.fillStyle = ironDark;
  ctx.fillRect(34, -58, 20, 78);
  ctx.fillStyle = ironMid;
  ctx.fillRect(37, -55, 14, 72);
  ctx.fillStyle = ironLite;
  ctx.fillRect(46, -53, 3, 68);
  for (const ry of [-48, -32, -16, 0, 12] as const) {
    ctx.beginPath();
    ctx.arc(44, ry, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Төмөр нуман орой
  ctx.fillStyle = ironDark;
  ctx.beginPath();
  ctx.moveTo(-56, -52);
  ctx.lineTo(-34, -76);
  ctx.lineTo(34, -76);
  ctx.lineTo(56, -52);
  ctx.lineTo(50, -48);
  ctx.lineTo(32, -68);
  ctx.lineTo(-32, -68);
  ctx.lineTo(-50, -48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = ironLite;
  ctx.beginPath();
  ctx.moveTo(-50, -54);
  ctx.lineTo(-32, -72);
  ctx.lineTo(32, -72);
  ctx.lineTo(50, -54);
  ctx.lineTo(46, -52);
  ctx.lineTo(30, -66);
  ctx.lineTo(-30, -66);
  ctx.lineTo(-46, -52);
  ctx.closePath();
  ctx.fill();

  // Хаалганы хавтан
  if (!open) {
    ctx.fillStyle = "#121014";
    ctx.beginPath();
    ctx.moveTo(-28, 12);
    ctx.lineTo(-28, -48);
    ctx.quadraticCurveTo(0, -70, 28, -48);
    ctx.lineTo(28, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ironMid;
    ctx.lineWidth = 3.2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 11, -44);
      ctx.lineTo(i * 11, 8);
      ctx.stroke();
    }
    ctx.strokeStyle = ironDark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-26, -20);
    ctx.lineTo(26, -20);
    ctx.moveTo(-26, -2);
    ctx.lineTo(26, -2);
    ctx.stroke();
    // Төв төмөр цэг
    ctx.fillStyle = ironMid;
    ctx.beginPath();
    ctx.arc(0, -12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rivet;
    ctx.beginPath();
    ctx.arc(0, -12, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const voidG = ctx.createRadialGradient(0, -22, 4, 0, -10, 42);
    voidG.addColorStop(0, `rgba(255,70,45,${0.4 + pulse * 0.2})`);
    voidG.addColorStop(0.5, "rgba(35,8,12,0.88)");
    voidG.addColorStop(1, "rgba(6,2,4,0.96)");
    ctx.fillStyle = voidG;
    ctx.beginPath();
    ctx.moveTo(-28, 12);
    ctx.lineTo(-28, -48);
    ctx.quadraticCurveTo(0, -70, 28, -48);
    ctx.lineTo(28, 12);
    ctx.closePath();
    ctx.fill();
  }

  // Суурь төмөр
  ctx.fillStyle = ironDark;
  ctx.fillRect(-58, 10, 116, 8);
  ctx.fillStyle = iron;
  ctx.fillRect(-54, 12, 108, 4);

  // —— Аргаль гавал — хаалганы дээр ——
  ctx.save();
  ctx.translate(0, -78);
  drawArgaliSkull(ctx, 1.15);
  ctx.restore();

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
  ctx.strokeText("ХАР ТӨМӨР ХААЛГА", x, y - 118);
  ctx.fillStyle = encounter.unlocked ? "#ffaca0" : "#c8b8a8";
  ctx.fillText("ХАР ТӨМӨР ХААЛГА", x, y - 118);
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
    const critical = readiness > 0.78;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const radius = 125;
    const half = 0.55;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -half, half);
    ctx.closePath();
    ctx.fillStyle = critical
      ? `rgba(80,190,255,${0.12 + readiness * 0.22})`
      : `rgba(30,90,180,${0.1 + readiness * 0.2})`;
    ctx.fill();
    const inner = radius * (0.2 + readiness * 0.8);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, inner, -half * 0.9, half * 0.9);
    ctx.closePath();
    ctx.fillStyle = `rgba(70,180,255,${0.06 + readiness * 0.14})`;
    ctx.fill();
    ctx.strokeStyle = critical
      ? `rgba(180,230,255,${0.5 + readiness * 0.4})`
      : `rgba(120,200,255,${0.4 + readiness * 0.45})`;
    ctx.lineWidth = critical ? 2.8 : 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, -half, half);
    ctx.stroke();
    ctx.strokeStyle = `rgba(140,210,255,${0.25 + readiness * 0.3})`;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(radius - 6, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (
    encounter.phase === "needle" &&
    progress < 0.52 &&
    !encounter.attackHitDone
  ) {
    const readiness = smoothstep(progress / 0.52);
    const critical = readiness > 0.78;
    const direction = encounter.facing;
    const length = 78 + readiness * 54;
    const endX = x + direction.x * length;
    const endY = y - 22 + direction.y * length;
    const glow = ctx.createRadialGradient(x, y - 28, 5, x, y - 28, 58);
    glow.addColorStop(0, `rgba(70,180,255,${0.22 + readiness * 0.35})`);
    glow.addColorStop(1, "rgba(40,120,220,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 28, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = critical
      ? `rgba(190,235,255,${0.55 + readiness * 0.35})`
      : `rgba(130,200,255,${0.4 + readiness * 0.45})`;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -time * 40;
    ctx.beginPath();
    ctx.moveTo(x + direction.x * 34, y - 22 + direction.y * 34);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = critical ? "#d8f4ff" : "#9ed2ff";
    ctx.beginPath();
    ctx.arc(endX, endY, 3 + readiness * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(160,220,255,${0.35 + readiness * 0.4})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(endX, endY, 8 + readiness * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (encounter.phase === "summoning") {
    const ritualProgress = smoothstep(progress);
    const pulse = 0.82 + Math.sin(time * 9) * 0.08;
    const radius = (52 + ritualProgress * 74) * pulse;
    ctx.save();
    const fill = ctx.createRadialGradient(x, y + 10, 8, x, y + 10, radius);
    fill.addColorStop(0, `rgba(30,90,180,${0.12 + ritualProgress * 0.16})`);
    fill.addColorStop(1, "rgba(20,50,120,0)");
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y + 10, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(70,170,255,${0.35 + ritualProgress * 0.48})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -time * 34;
    ctx.beginPath();
    ctx.arc(x, y + 10, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(120,200,255,${0.22 + ritualProgress * 0.35})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y + 10, radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(160,220,255,${0.4 + ritualProgress * 0.4})`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(
      x,
      y + 10,
      radius + 5,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * ritualProgress,
    );
    ctx.stroke();
    ctx.restore();
  }

  if (
    encounter.phase === "ironBloom" &&
    progress < 0.58 &&
    !encounter.attackHitDone
  ) {
    const readiness = smoothstep(progress / 0.58);
    const radius = 70 + readiness * 80;
    const fill = ctx.createRadialGradient(x, y, 10, x, y, radius);
    fill.addColorStop(0, `rgba(40,100,200,${0.14 + readiness * 0.16})`);
    fill.addColorStop(1, "rgba(20,50,120,0)");
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(80,180,255,${0.4 + readiness * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(140,210,255,${0.3 + readiness * 0.35})`;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      radius + 6,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * readiness,
    );
    ctx.stroke();
  }

  if (encounter.phase === "phaseShift") {
    const arenaX = encounter.arenaCenter.x - cam.x;
    const arenaY = encounter.arenaCenter.y - cam.y;
    const wave = smoothstep(progress);
    const radius = 40 + wave * (encounter.arenaRadius - 24);
    ctx.save();
    ctx.strokeStyle = `rgba(60,150,255,${0.75 * (1 - wave * 0.45)})`;
    ctx.lineWidth = 6 - wave * 3;
    ctx.beginPath();
    ctx.arc(arenaX, arenaY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(10,30,70,${0.16 * (1 - wave)})`;
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

  const deathFade =
    encounter.phase === "death"
      ? clamp(encounter.phaseTimer / (PHASE_DURATION.death * 0.65), 0, 1)
      : 1;

  drawBossVitalsHud(ctx, {
    name: "Төмөр шулмас",
    nameColor: encounter.bossPhase === 2 ? "#ff7a72" : "#ffc0b8",
    hpRatio: clamp(encounter.hp / encounter.maxHp, 0, 1),
    postureRatio: clamp(encounter.posture / encounter.maxPosture, 0, 1),
    hpFill: encounter.bossPhase === 2 ? "#e03842" : "#c44a5c",
    leftMeta: trFormat("Хаалт {n}", { n: encounter.ward }),
    rightMeta: trFormat("Үе {n}", { n: encounter.bossPhase }),
    alpha: deathFade,
  });
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
      : "E — Түгжээтэй · эхлээд долоон толгойтой мангасыг ял",
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
