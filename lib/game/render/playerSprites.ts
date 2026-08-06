import type { Camera, Player, Vector2 } from "../types";
import { clamp, roundRectPath } from "../utils";
import {
  drawDodgeWindEffect,
  drawHorse,
  drawPlayer as drawProceduralPlayer,
  drawShadow,
} from "./entities";

export type PlayerSpriteName =
  | "idle"
  | "run"
  | "attack1"
  | "attack2"
  | "attack3"
  | "parry"
  | "dodge"
  | "hurt"
  | "swordIdle"
  | "swordRun"
  | "swordAttack"
  | "swordAttackEffect8";

export type PlayerSpriteSet = Record<PlayerSpriteName, HTMLImageElement>;

export interface PlayerSpriteSelection {
  name: Exclude<PlayerSpriteName, "swordAttackEffect8">;
  frame: number;
  row: number;
  flipX: boolean;
}

interface PlayerAnimationSpec {
  frameCount: number;
  fps: number;
  loop: boolean;
  drawSize: number;
  groundOffsetY: number;
}

const PLAYER_SPRITE_PATHS: Record<PlayerSpriteName, string> = {
  idle: "/assets/player/player-idle.png",
  run: "/assets/player/player-run.png",
  attack1: "/assets/player/player-attack1.png",
  attack2: "/assets/player/player-attack2.png",
  attack3: "/assets/player/player-attack3.png",
  parry: "/assets/player/player-parry.png",
  dodge: "/assets/player/player-dodge.png",
  hurt: "/assets/player/player-hurt.png",
  swordIdle: "/assets/player/player-sword-idle.png",
  swordRun: "/assets/player/player-sword-run.png",
  swordAttack: "/assets/player/player-sword-attack.png",
  swordAttackEffect8: "/assets/player/player-sword-attack-effect-8.png",
};

const PLAYER_SPRITE_FRAME_SIZE = 128;
const MELEE_STARTUP_SECONDS = 0.08;
const MELEE_ACTIVE_SECONDS = 0.07;
const MELEE_RECOVERY_SECONDS = 0.16;
const PARRY_STARTUP_SECONDS = 0.02;
const PARRY_ACTIVE_SECONDS = 0.5;
const PARRY_RECOVERY_SECONDS = 0.18;
const DODGE_ACTIVE_SECONDS = 0.28;
const DODGE_RECOVERY_SECONDS = 0.12;

const PLAYER_ANIMATION_SPECS: Record<
  PlayerSpriteName,
  PlayerAnimationSpec
> = {
  idle: {
    frameCount: 8,
    fps: 7,
    loop: true,
    drawSize: 72,
    groundOffsetY: 18,
  },
  run: {
    frameCount: 8,
    fps: 9,
    loop: true,
    drawSize: 72,
    groundOffsetY: 20,
  },
  attack1: {
    frameCount: 4,
    fps: 0,
    loop: false,
    drawSize: 72,
    groundOffsetY: 18,
  },
  attack2: {
    frameCount: 4,
    fps: 0,
    loop: false,
    drawSize: 72,
    groundOffsetY: 18,
  },
  attack3: {
    frameCount: 4,
    fps: 0,
    loop: false,
    drawSize: 72,
    groundOffsetY: 18,
  },
  parry: {
    frameCount: 4,
    fps: 0,
    loop: false,
    drawSize: 72,
    groundOffsetY: 18,
  },
  dodge: {
    frameCount: 4,
    fps: 0,
    loop: false,
    drawSize: 72,
    groundOffsetY: 18,
  },
  hurt: {
    frameCount: 4,
    fps: 0,
    loop: false,
    drawSize: 72,
    groundOffsetY: 18,
  },
  swordIdle: {
    frameCount: 8,
    fps: 7,
    loop: true,
    drawSize: 72,
    groundOffsetY: 18,
  },
  swordRun: {
    frameCount: 8,
    fps: 8,
    loop: true,
    drawSize: 72,
    groundOffsetY: 22,
  },
  swordAttack: {
    frameCount: 8,
    fps: 0,
    loop: false,
    drawSize: 70,
    groundOffsetY: 16,
  },
  swordAttackEffect8: {
    frameCount: 8,
    fps: 0,
    loop: false,
    drawSize: 88,
    groundOffsetY: 18,
  },
};

/** Load the ZIP-authored player sheets from `public/assets/player`. */
export function loadPlayerSprites(): PlayerSpriteSet {
  const load = (name: PlayerSpriteName): HTMLImageElement => {
    const image = new Image();
    image.decoding = "async";
    image.src = PLAYER_SPRITE_PATHS[name];
    return image;
  };

  return {
    idle: load("idle"),
    run: load("run"),
    attack1: load("attack1"),
    attack2: load("attack2"),
    attack3: load("attack3"),
    parry: load("parry"),
    dodge: load("dodge"),
    hurt: load("hurt"),
    swordIdle: load("swordIdle"),
    swordRun: load("swordRun"),
    swordAttack: load("swordAttack"),
    swordAttackEffect8: load("swordAttackEffect8"),
  };
}

function imageReady(image: HTMLImageElement): boolean {
  return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
}

function smoothStep(progress: number): number {
  const value = clamp(progress, 0, 1);
  return value * value * (3 - 2 * value);
}

function frameFromProgress(progress: number, frameCount: number): number {
  return Math.min(
    frameCount - 1,
    Math.floor(smoothStep(progress) * frameCount),
  );
}

function frameFromTime(
  time: number,
  name: PlayerSpriteName,
): number {
  const spec = PLAYER_ANIMATION_SPECS[name];
  if (!spec.loop || spec.fps <= 0) return 0;
  return Math.floor(time * spec.fps) % spec.frameCount;
}

function meleeProgress(player: Player): number {
  const multiplier = Math.max(0.05, player.cooldownMult);

  switch (player.combatPhase) {
    case "startup": {
      const duration = MELEE_STARTUP_SECONDS * multiplier;
      const progress = 1 - player.combatTimer / duration;
      return clamp(progress * 0.28, 0, 0.28);
    }
    case "active": {
      const duration = MELEE_ACTIVE_SECONDS * multiplier;
      const progress = 1 - player.combatTimer / duration;
      return clamp(0.28 + progress * 0.44, 0.28, 0.72);
    }
    case "recovery": {
      const duration = MELEE_RECOVERY_SECONDS * multiplier;
      const progress = 1 - player.combatTimer / duration;
      return clamp(0.72 + progress * 0.28, 0.72, 1);
    }
    case "idle":
      return 0;
  }
}

function parryProgress(player: Player): number {
  switch (player.parryPhase) {
    case "startup": {
      const progress = 1 - player.parryTimer / PARRY_STARTUP_SECONDS;
      return clamp(progress * 0.2, 0, 0.2);
    }
    case "active": {
      const progress = 1 - player.parryTimer / PARRY_ACTIVE_SECONDS;
      return clamp(0.2 + progress * 0.55, 0.2, 0.75);
    }
    case "recovery": {
      const progress = 1 - player.parryTimer / PARRY_RECOVERY_SECONDS;
      return clamp(0.75 + progress * 0.25, 0.75, 1);
    }
    case "idle":
      return 0;
  }
}

function dodgeProgress(player: Player): number {
  switch (player.dodgePhase) {
    case "dodging": {
      const progress = 1 - player.dodgeTimer / DODGE_ACTIVE_SECONDS;
      return clamp(progress * 0.78, 0, 0.78);
    }
    case "recovery": {
      const progress = 1 - player.dodgeTimer / DODGE_RECOVERY_SECONDS;
      return clamp(0.78 + progress * 0.22, 0.78, 1);
    }
    case "idle":
      return 0;
  }
}

function spriteDirection(
  player: Player,
  name: PlayerSpriteSelection["name"] | "swordAttackEffect8",
): Vector2 {
  if (
    name === "attack1" ||
    name === "attack2" ||
    name === "attack3" ||
    name === "swordAttack" ||
    name === "swordAttackEffect8"
  ) {
    return player.attackFacing;
  }
  if (name === "dodge") return player.dodgeDirection;
  return player.facing;
}

function spriteRow(direction: Vector2): number {
  if (Math.abs(direction.y) >= Math.abs(direction.x)) {
    return direction.y < 0 ? 2 : 0;
  }
  return 1;
}

function spriteFlipX(direction: Vector2): boolean {
  return (
    Math.abs(direction.x) > Math.abs(direction.y) &&
    direction.x < 0
  );
}

export function selectPlayerSprite(
  player: Player,
  time: number,
  hurtFlash: number,
  sprites?: PlayerSpriteSet,
): PlayerSpriteSelection {
  const swordEquipped =
    player.hasSkySword && player.weapon === "skySword";
  const useSwordSheet =
    swordEquipped &&
    !!sprites &&
    imageReady(sprites.swordIdle) &&
    imageReady(sprites.swordRun) &&
    imageReady(sprites.swordAttack);

  let name: PlayerSpriteSelection["name"];
  let frame: number;

  if (hurtFlash > 0.08) {
    name = "hurt";
    frame = frameFromProgress(
      1 - clamp(hurtFlash, 0, 1),
      PLAYER_ANIMATION_SPECS[name].frameCount,
    );
  } else if (player.dodgePhase !== "idle") {
    name = "dodge";
    frame = frameFromProgress(
      dodgeProgress(player),
      PLAYER_ANIMATION_SPECS[name].frameCount,
    );
  } else if (player.parryPhase !== "idle") {
    name = "parry";
    frame = frameFromProgress(
      parryProgress(player),
      PLAYER_ANIMATION_SPECS[name].frameCount,
    );
  } else if (player.combatPhase !== "idle") {
    if (useSwordSheet) {
      name = "swordAttack";
    } else if (!player.moving || player.riding) {
      name =
        player.attackVariant === 0
          ? "attack1"
          : player.attackVariant === 1
            ? "attack2"
            : "attack3";
    } else {
      name = "run";
    }
    frame =
      name === "run"
        ? frameFromTime(time, name)
        : frameFromProgress(
            meleeProgress(player),
            PLAYER_ANIMATION_SPECS[name].frameCount,
          );
  } else if (player.moving && !player.riding) {
    name = useSwordSheet ? "swordRun" : "run";
    frame = frameFromTime(time, name);
  } else {
    name = useSwordSheet ? "swordIdle" : "idle";
    frame = frameFromTime(time, name);
  }

  const direction = spriteDirection(player, name);
  return {
    name,
    frame,
    row: spriteRow(direction),
    flipX: spriteFlipX(direction),
  };
}

function drawHorseHealth(
  ctx: CanvasRenderingContext2D,
  player: Player,
  x: number,
  y: number,
): void {
  if (player.horseHp >= player.horseMaxHp || player.horseMaxHp <= 0) return;

  const width = 30;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRectPath(ctx, x - width / 2, y + 18, width, 4, 2);
  ctx.fill();
  ctx.fillStyle = "#c98a3a";
  roundRectPath(
    ctx,
    x - width / 2,
    y + 18,
    (width * Math.max(0, player.horseHp)) / player.horseMaxHp,
    4,
    2,
  );
  ctx.fill();
}

function drawSelectedSprite(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
  sprites: PlayerSpriteSet,
  selection: PlayerSpriteSelection,
  gerPacked: boolean,
): void {
  const x = player.pos.x - cam.x;
  const y = player.pos.y - cam.y;
  const riding = player.riding;

  if (riding) {
    const horseFlip = player.facing.x < 0 ? -1 : 1;
    drawHorse(
      ctx,
      x,
      y + 2,
      horseFlip,
      time,
      player.moving,
      gerPacked,
    );
    drawHorseHealth(ctx, player, x, y);
  } else {
    drawShadow(ctx, x, y + 12, 15, 5.5);
  }

  const image = sprites[selection.name];
  const spec = PLAYER_ANIMATION_SPECS[selection.name];
  const availableFrames = Math.max(
    1,
    Math.floor(image.naturalWidth / PLAYER_SPRITE_FRAME_SIZE),
  );
  const availableRows = Math.max(
    1,
    Math.floor(image.naturalHeight / PLAYER_SPRITE_FRAME_SIZE),
  );
  const frame = Math.min(
    selection.frame,
    spec.frameCount - 1,
    availableFrames - 1,
  );
  const row = Math.min(selection.row, availableRows - 1);
  const offsetY = riding ? -14 : 0;

  ctx.save();
  ctx.translate(x, y + offsetY);
  ctx.imageSmoothingEnabled = false;
  if (selection.flipX) ctx.scale(-1, 1);
  ctx.drawImage(
    image,
    frame * PLAYER_SPRITE_FRAME_SIZE,
    row * PLAYER_SPRITE_FRAME_SIZE,
    PLAYER_SPRITE_FRAME_SIZE,
    PLAYER_SPRITE_FRAME_SIZE,
    -spec.drawSize / 2,
    -spec.drawSize + spec.groundOffsetY,
    spec.drawSize,
    spec.drawSize,
  );
  ctx.restore();
}

/**
 * Draw the authored player animation when its selected sheet is ready.
 * Ranged attacks and loading failures retain the established procedural
 * renderer, including horse/ger rendering and the current combat overlays.
 *
 * Returns true when a sprite sheet was used.
 */
export function drawPlayerWithSprites(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
  sprites?: PlayerSpriteSet,
  hurtFlash = 0,
  gerPacked = false,
  lightingFire = 0,
): boolean {
  if (lightingFire > 0) {
    drawProceduralPlayer(ctx, player, cam, time, gerPacked, lightingFire);
    return false;
  }

  const selection = sprites
    ? selectPlayerSprite(player, time, hurtFlash, sprites)
    : null;
  const rangedAttackActive =
    player.attackAnim > 0 && !player.attackMelee;
  const swordEquipped =
    player.hasSkySword && player.weapon === "skySword";
  const integratedSwordSheet =
    !!selection &&
    (selection.name === "swordIdle" ||
      selection.name === "swordRun" ||
      selection.name === "swordAttack");
  // Алхаж цохих — зөвхөн нударга
  const walkPunching =
    !swordEquipped &&
    player.attackMelee &&
    player.combatPhase !== "idle" &&
    player.moving;
  // Сэлэмтэй боловч sword sheet байхгүй → procedural (гарт зурна)
  const forceProceduralSword =
    swordEquipped &&
    !!selection &&
    !integratedSwordSheet &&
    (selection.name === "idle" ||
      selection.name === "run" ||
      selection.name === "attack1" ||
      selection.name === "attack2" ||
      selection.name === "attack3");

  if (
    !sprites ||
    !selection ||
    !imageReady(sprites[selection.name]) ||
    rangedAttackActive ||
    walkPunching ||
    forceProceduralSword
  ) {
    drawProceduralPlayer(ctx, player, cam, time, gerPacked);
    return false;
  }

  drawSelectedSprite(
    ctx,
    player,
    cam,
    time,
    sprites,
    selection,
    gerPacked,
  );
  if (player.dodgePhase === "dodging" || player.dodgePhase === "recovery") {
    drawDodgeWindEffect(ctx, player, cam, time);
  }
  // swordIdle/Run/Attack sheet дээр сэлэм аль хэдийн шингэсэн — overlay хэрэггүй
  if (swordEquipped && selection.name === "swordAttack") {
    drawPlayerSwordAttackEffect(ctx, player, cam, sprites);
  }
  return true;
}

/**
 * Optional clean 8-frame sword trail. The ZIP's current sword attack sheet
 * already contains its own slash, so the main renderer deliberately does not
 * call this helper automatically.
 */
export function drawPlayerSwordAttackEffect(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  sprites: PlayerSpriteSet,
): boolean {
  if (
    !player.hasSkySword ||
    player.weapon !== "skySword" ||
    player.combatPhase === "idle" ||
    !player.attackMelee
  ) {
    return false;
  }

  const image = sprites.swordAttackEffect8;
  if (!imageReady(image)) return false;

  const spec = PLAYER_ANIMATION_SPECS.swordAttackEffect8;
  const direction = spriteDirection(player, "swordAttackEffect8");
  const availableFrames = Math.max(
    1,
    Math.floor(image.naturalWidth / PLAYER_SPRITE_FRAME_SIZE),
  );
  const availableRows = Math.max(
    1,
    Math.floor(image.naturalHeight / PLAYER_SPRITE_FRAME_SIZE),
  );
  const frame = frameFromProgress(
    meleeProgress(player),
    Math.min(spec.frameCount, availableFrames),
  );
  const row = Math.min(spriteRow(direction), availableRows - 1);
  const x = player.pos.x - cam.x;
  const y =
    player.pos.y - cam.y + (player.riding ? -14 : 0);

  ctx.save();
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;
  if (spriteFlipX(direction)) ctx.scale(-1, 1);
  ctx.drawImage(
    image,
    frame * PLAYER_SPRITE_FRAME_SIZE,
    row * PLAYER_SPRITE_FRAME_SIZE,
    PLAYER_SPRITE_FRAME_SIZE,
    PLAYER_SPRITE_FRAME_SIZE,
    -spec.drawSize / 2,
    -spec.drawSize + spec.groundOffsetY,
    spec.drawSize,
    spec.drawSize,
  );
  ctx.restore();
  return true;
}
