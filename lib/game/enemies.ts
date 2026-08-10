// Хүн 3 — дайсны AI: чоно, хулгайч, спавн/scaling, мал сүрэг

import {
  FENCE_BREAK_DPS,
  FENCE_CONTACT_DPS,
  FENCE_KNOCKBACK,
  PASTURE_RADIUS,
  WORLD_H,
  WORLD_W,
  type FenceTier,
  type GameState,
  type HerdAnimal,
  type Thief,
  type Vector2,
  type Wolf,
} from "./types";
import {
  allocId,
  animalIsOut,
  clamp,
  dist,
  fenceBlocksMovement,
  flockGatePos,
  isNight,
  normalize,
  pastureCenter,
  pastureFenceDefense,
  penCenterFor,
  penForLivestock,
  penRadiusFor,
  pushOutOfFences,
  pushOutOfGer,
  pushOutOfUrtz,
  randRange,
  setBannerAlert,
  setMessage,
} from "./utils";
import { spawnParticles, spawnText } from "./effects";
import { sfx } from "./audio";
import {
  animalInPen,
  threatIntervalMult,
  winterFenceBreakMult,
} from "./daycycle";
import {
  syncVisualFlock,
  addLivestock,
  killHerdVisual,
  loseLivestock,
  nearestHerdAnimal,
  checkFlockDefeat,
} from "./livestock";
import { updateWolves as updateCombatWolves } from "./combat/enemyBehaviors";
import { handlePlayerDeath } from "./spirit";
import { trFormat } from "./i18n";

function enemyCombatLocksMovement(
  phase: Wolf["combatPhase"] | Thief["combatPhase"] | undefined,
): boolean {
  return (
    phase === "windup" ||
    phase === "active" ||
    phase === "recovery" ||
    phase === "staggered"
  );
}

// Re-exports for other modules
export {
  syncVisualFlock,
  addLivestock,
  loseLivestock,
  killHerdVisual,
  nearestHerdAnimal,
};

/** Хуучин API — хонь нэмэх (өдөр тутмын өсөлт гэх мэт) */
export function addSheep(state: GameState, n: number): void {
  // Одоо байгаа төрлүүдэд пропорциональ хуваарилна
  const flock = state.world.flock;
  if (flock.total <= 0) {
    addLivestock(state, "sheep", n);
    return;
  }
  let left = n;
  const kinds = (["sheep", "goat", "cattle", "horse", "camel"] as const).filter(
    (k) => flock.counts[k] > 0,
  );
  for (let i = 0; i < kinds.length; i++) {
    const k = kinds[i];
    const share =
      i === kinds.length - 1
        ? left
        : Math.max(0, Math.round((flock.counts[k] / flock.total) * n));
    const give = Math.min(share, left);
    if (give > 0) addLivestock(state, k, give);
    left -= give;
  }
  if (left > 0) addLivestock(state, kinds[0] ?? "sheep", left);
}

export function loseSheep(
  state: GameState,
  n: number,
  opts?: { skipDefeatCheck?: boolean },
): number {
  return loseLivestock(state, n, opts);
}

export function killSheepVisual(state: GameState, sheep: HerdAnimal): void {
  killHerdVisual(state, sheep);
}

export function nearestSheep(
  from: Vector2,
  visuals: HerdAnimal[],
): HerdAnimal | null {
  return nearestHerdAnimal(from, visuals);
}

// ---------------------------------------------------------------------------
// World bootstrap
// ---------------------------------------------------------------------------

export function spawnWolf(
  state: GameState,
  kind: "wolf" | "bear" = "wolf",
  options: { pos?: Vector2; silent?: boolean; id?: number } = {},
): Wolf {
  let pos: Vector2;
  if (options.pos) {
    pos = { ...options.pos };
  } else {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) pos = { x: randRange(40, WORLD_W - 40), y: 40 };
    else if (edge === 1)
      pos = { x: randRange(40, WORLD_W - 40), y: WORLD_H - 40 };
    else if (edge === 2) pos = { x: 40, y: randRange(40, WORLD_H - 40) };
    else pos = { x: WORLD_W - 40, y: randRange(40, WORLD_H - 40) };
  }

  const night = isNight(state.world);
  const lvl = state.level - 1;
  const bear = kind === "bear";
  // Баавгай: чононоос 2 дахин их амь, 2 дахин их хүчтэй, том биетэй, удаан
  const baseHp = Math.round((night ? 38 : 30) * (1 + 0.12 * lvl));
  const hp = bear ? baseHp * 2 : baseHp;
  const wolf: Wolf = {
    id: options.id ?? allocId(state),
    kind,
    pos,
    vel: { x: 0, y: 0 },
    hp,
    maxHp: hp,
    radius: bear ? 17 : 14,
    speed: bear
      ? 80 + Math.min(20, lvl * 2)
      : (night ? 115 : 95) + Math.min(30, lvl * 3),
    attackCooldown: 0,
    damage: (12 + lvl * 2) * (bear ? 2 : 1),
    scale: bear
      ? Math.min(2.2, 1.45 + lvl * 0.07)
      : Math.min(1.8, 1 + lvl * 0.09),
    flash: 0,
    face: 1,
    alive: true,
    posture: bear ? 140 : 60,
    maxPosture: bear ? 140 : 60,
    postureRegenDelay: 0,
    postureRecoveryDelay: 0,
    attackPhase: "chasing",
    attackKind: "leap",
    attackTimer: 0,
    combatPhase: "idle",
    combatTimer: 0,
    attackDirection: { x: 0, y: 1 },
    attackHitDone: false,
    knockbackResistance: bear ? 0.45 : 0.15,
  };
  if (options.id !== undefined) {
    state.nextEntityId = Math.max(state.nextEntityId, options.id + 1);
  }
  state.world.wolves.push(wolf);
  if (!options.silent) {
    sfx("howl");
    setBannerAlert(
      state,
      bear
        ? "БААВГАЙ ИРЛЭЭ!"
        : night
          ? "ШӨНИЙН ЧОНО ИРЛЭЭ!"
          : "ЧОНО ОЙРТЛОО!",
      4.2,
      "threat",
    );
    setMessage(
      state,
      bear
        ? "Баавгай мал руу дайрлаа — маш аюултай!"
        : night
          ? "Шөнийн чоно мал руу дайрлаа!"
          : "Чоно ойртлоо — хамгаал!",
      3,
    );
  }
  return wolf;
}

export function spawnThief(state: GameState): void {
  if (state.world.flock.total <= 0) return;

  const center = pastureCenter(state.world);
  const ang = Math.random() * Math.PI * 2;
  const pos: Vector2 = {
    x: center.x + Math.cos(ang) * (PASTURE_RADIUS + 40),
    y: center.y + Math.sin(ang) * (PASTURE_RADIUS + 40),
  };

  const escapeAng = Math.atan2(pos.y - center.y, pos.x - center.x);
  const escapeTarget: Vector2 = {
    x: clamp(center.x + Math.cos(escapeAng) * 1400, 20, WORLD_W - 20),
    y: clamp(center.y + Math.sin(escapeAng) * 1400, 20, WORLD_H - 20),
  };

  const defense = pastureFenceDefense(state.world);
  let stealWant = clamp(2 + Math.floor(Math.random() * 4), 1, 8);

  // Дээд хашаа — хулгайч хонь авч чадахгүй
  if (defense.tier3Count >= 5) {
    stealWant = 0;
    setMessage(state, "Цахилгаан хашаа хулгайчийг няцаалаа!", 3);
    spawnText(state, pos, "Хашаа хамгааллаа!", "#7ec8ff");
  } else if (defense.tier2Plus >= 4) {
    stealWant = Math.max(1, Math.floor(stealWant * 0.4));
  } else if (defense.count >= 4) {
    stealWant = Math.max(1, Math.floor(stealWant * 0.8));
  }

  const stolen = stealWant > 0 ? loseSheep(state, stealWant, { skipDefeatCheck: true }) : 0;
  if (stealWant > 0 && stolen <= 0) return;

  const lvl = state.level - 1;
  const thiefHp = 40 + lvl * 8;
  state.world.thieves.push({
    id: allocId(state),
    pos,
    vel: { x: 0, y: 0 },
    hp: thiefHp,
    maxHp: thiefHp,
    radius: 13,
    speed: 88 + Math.min(20, lvl * 2),
    stolen,
    escapeTarget,
    damage: 8 + lvl * 2,
    attackCooldown: 0,
    flash: 0,
    face: 1,
    alive: true,
    posture: 0,
    maxPosture: 100,
    postureRecoveryDelay: 0,
    combatPhase: "idle",
    combatTimer: 0,
    attackDirection: { x: 0, y: 1 },
    attackHitDone: false,
    knockbackResistance: 0.2,
  });
  sfx("alert");

  if (stolen > 0) {
    spawnText(state, pos, trFormat("−{n} мал!", { n: stolen }), "#ff8080");
    setBannerAlert(state, "ХУЛГАЙЧ ИРЛЭЭ!", 4.2, "threat");
    setMessage(
      state,
      trFormat("Хулгайч {n} мал авч зугтав! Гүйцэж ав!", { n: stolen }),
      4,
    );
  } else if (defense.tier3Count < 5) {
    setBannerAlert(state, "ХУЛГАЙЧ ОЙРТЛОО!", 4.0, "threat");
    setMessage(state, "Хулгайч ойртлоо — хашаагаа шалга!", 3);
  }
}

// ---------------------------------------------------------------------------
// Update systems
// ---------------------------------------------------------------------------

export function updateFlock(state: GameState, dt: number): void {
  const center = pastureCenter(state.world);
  const { player, world } = state;
  const herding = state.input.herd;
  const drive = normalize(player.facing);
  const dog = world.dog;
  const flock = world.flock.visuals;

  for (const sheep of flock) {
    const penKind = penForLivestock(sheep.kind);
    const pen = penCenterFor(world, penKind);
    const out = animalIsOut(world, sheep.kind);
    const home = out ? center : pen;
    const homeR = out ? PASTURE_RADIUS : penRadiusFor(penKind) * 0.92;
    const toCenter = normalize({
      x: home.x - sheep.pos.x,
      y: home.y - sheep.pos.y,
    });
    const toPlayer = normalize({
      x: player.pos.x - sheep.pos.x,
      y: player.pos.y - sheep.pos.y,
    });
    // Илүү том тэнэх — бөөгнөрөхгүй
    const wander = {
      x: Math.sin(world.elapsed * 0.55 + sheep.id * 1.7 + sheep.grazeSeed) * (out ? 0.7 : 0.55),
      y: Math.cos(world.elapsed * 0.42 + sheep.id * 2.1 + sheep.grazeSeed * 0.8) * (out ? 0.7 : 0.55),
    };

    // Чононоос зугтана
    let fleeX = 0;
    let fleeY = 0;
    for (const wolf of world.wolves) {
      const d = dist(sheep.pos, wolf.pos);
      if (d < 140 && d > 1) {
        const w = (140 - d) / 140;
        fleeX += ((sheep.pos.x - wolf.pos.x) / d) * w * 3.5;
        fleeY += ((sheep.pos.y - wolf.pos.y) / d) * w * 3.5;
      }
    }

    // Ойр малаас түлхэлт — тарж бэлчээрлэнэ
    let sepX = 0;
    let sepY = 0;
    const sepRange = out ? 42 : 36;
    for (const other of flock) {
      if (other.id === sheep.id) continue;
      const d = dist(sheep.pos, other.pos);
      if (d < sepRange && d > 0.5) {
        const w = (sepRange - d) / sepRange;
        sepX += ((sheep.pos.x - other.pos.x) / d) * w;
        sepY += ((sheep.pos.y - other.pos.y) / d) * w;
      }
    }
    const sepLen = Math.hypot(sepX, sepY);
    if (sepLen > 1e-4) {
      sepX = (sepX / sepLen) * Math.min(sepLen, 2.4);
      sepY = (sepY / sepLen) * Math.min(sepLen, 2.4);
    }

    // Нохойноос зугтана — N үед туух чигтэй ижил зүгт түлхэнэ (хажуу тийш биш)
    if (dog && herding) {
      const dDog = dist(sheep.pos, dog.pos);
      const dogRange = 120;
      if (dDog < dogRange && dDog > 1) {
        const w = (dogRange - dDog) / dogRange;
        const push = 4.0;
        const awayX = (sheep.pos.x - dog.pos.x) / dDog;
        const awayY = (sheep.pos.y - dog.pos.y) / dDog;
        fleeX += (drive.x * 0.75 + awayX * 0.35) * w * push;
        fleeY += (drive.y * 0.75 + awayY * 0.35) * w * push;
      }
    }

    // N барих — ойрхон хонийг нүүрний чигт тууна
    let herdX = 0;
    let herdY = 0;
    if (herding) {
      const dPlayer = dist(sheep.pos, player.pos);
      if (dPlayer < 180) {
        const away =
          dPlayer > 1
            ? {
                x: (sheep.pos.x - player.pos.x) / dPlayer,
                y: (sheep.pos.y - player.pos.y) / dPlayer,
              }
            : drive;
        const strength = 1.2 + ((180 - dPlayer) / 180) * 2.8;
        herdX = (drive.x * 2.2 + away.x * 0.9) * strength;
        herdY = (drive.y * 2.2 + away.y * 0.9) * strength;
      }
    }

    const dCenter = dist(sheep.pos, home);
    let pull: number;
    let steerX = toCenter.x;
    let steerY = toCenter.y;
    let routingGate = false;

    // Хашаанаас гарах/орох — зөвхөн өөрийн хаалгаар
    const gate = flockGatePos(world, penKind);
    const insidePen = animalInPen(sheep.pos, world, sheep.kind);
    const exitDir = normalize({
      x: gate.x - pen.x,
      y: gate.y - pen.y,
    });
    if (out && insidePen) {
      routingGate = true;
      const dGate = dist(sheep.pos, gate);
      if (dGate > 30) {
        const toGate = normalize({
          x: gate.x - sheep.pos.x,
          y: gate.y - sheep.pos.y,
        });
        steerX = toGate.x;
        steerY = toGate.y;
        pull = 3.4;
      } else {
        // Хаалганы гадна тал руу гарна
        const target = {
          x: gate.x + exitDir.x * 48,
          y: gate.y + exitDir.y * 48,
        };
        const toOut = normalize({
          x: target.x - sheep.pos.x,
          y: target.y - sheep.pos.y,
        });
        steerX = toOut.x;
        steerY = toOut.y;
        pull = 3.6;
      }
    } else if (!out && !insidePen) {
      routingGate = true;
      const dGate = dist(sheep.pos, gate);
      if (dGate > 26) {
        const toGate = normalize({
          x: gate.x - sheep.pos.x,
          y: gate.y - sheep.pos.y,
        });
        steerX = toGate.x;
        steerY = toGate.y;
        pull = 3.2;
      } else {
        // Хаалгаар орж төв рүү
        const toPen = normalize({
          x: pen.x - sheep.pos.x,
          y: pen.y - sheep.pos.y,
        });
        steerX = toPen.x;
        steerY = toPen.y;
        pull = 3.4;
      }
    } else if (herding) {
      pull = dCenter > homeR * 1.4 ? 0.35 : 0.05;
    } else if (!out) {
      // Хашаан дотор — хувийн бэлчих цэг рүү тэнэнэ
      const ang =
        world.elapsed * 0.18 + sheep.id * 2.17 + sheep.grazeSeed;
      const rad =
        homeR * (0.25 + ((sheep.id * 19) % 9) * 0.07);
      const spot = {
        x: home.x + Math.cos(ang) * rad,
        y: home.y + Math.sin(ang * 0.9) * rad,
      };
      const toSpot = normalize({
        x: spot.x - sheep.pos.x,
        y: spot.y - sheep.pos.y,
      });
      steerX = toSpot.x;
      steerY = toSpot.y;
      const dSpot = dist(sheep.pos, spot);
      pull = dSpot > 22 ? 0.9 : 0.15;
      if (dCenter > homeR) {
        steerX += toCenter.x * 0.8;
        steerY += toCenter.y * 0.8;
        pull = Math.max(pull, 1.6);
      }
    } else {
      // Бэлчих цэг — гэрийн эргэн тойронд тархана
      const ang =
        world.elapsed * 0.14 + sheep.id * 1.91 + sheep.grazeSeed;
      const rad =
        PASTURE_RADIUS * (0.4 + ((sheep.id * 17) % 9) * 0.06);
      const spot = {
        x: center.x + Math.cos(ang) * rad,
        y: center.y + Math.sin(ang * 0.85) * rad * 0.85,
      };
      const toSpot = normalize({
        x: spot.x - sheep.pos.x,
        y: spot.y - sheep.pos.y,
      });
      steerX = toSpot.x;
      steerY = toSpot.y;
      const dSpot = dist(sheep.pos, spot);
      pull = dSpot > 32 ? 1.0 : 0.18;
      const dGer = dist(sheep.pos, center);
      if (dGer < 70) {
        steerX += ((sheep.pos.x - center.x) / Math.max(1, dGer)) * 1.5;
        steerY += ((sheep.pos.y - center.y) / Math.max(1, dGer)) * 1.5;
        pull = Math.max(pull, 1.2);
      }
    }
    const playerPull = herding ? 0 : 0.02;
    const sepScale = routingGate ? 0.25 : 1.8;
    const wanderScale = routingGate ? 0.15 : 1;

    sheep.vel.x +=
      (steerX * pull +
        toPlayer.x * playerPull +
        wander.x * wanderScale +
        fleeX +
        herdX +
        sepX * sepScale) *
      40 *
      dt;
    sheep.vel.y +=
      (steerY * pull +
        toPlayer.y * playerPull +
        wander.y * wanderScale +
        fleeY +
        herdY +
        sepY * sepScale) *
      40 *
      dt;
    sheep.vel.x *= 0.92;
    sheep.vel.y *= 0.92;

    // Жжиг алхмаар хөдөлнө — хашаа нэвтрэхгүй
    const stepDist = Math.hypot(sheep.vel.x, sheep.vel.y) * dt;
    const steps = Math.max(1, Math.min(6, Math.ceil(stepDist / 3)));
    const inv = 1 / steps;
    for (let s = 0; s < steps; s++) {
      sheep.pos.x += sheep.vel.x * dt * inv;
      sheep.pos.y += sheep.vel.y * dt * inv;
      pushOutOfFences(sheep.pos, sheep.radius, world.fences);
      pushOutOfGer(sheep.pos, sheep.radius, world);
      pushOutOfUrtz(sheep.pos, sheep.radius, world);
    }
    sheep.pos.x = clamp(sheep.pos.x, 30, WORLD_W - 30);
    sheep.pos.y = clamp(sheep.pos.y, 30, WORLD_H - 30);

    if (sheep.flash > 0) sheep.flash -= dt;
    // Хазуулсан хонь аажмаар амиа нөхнө (~12с тутамд 1 амь)
    if (sheep.hp < 3) sheep.hp = Math.min(3, sheep.hp + dt * 0.08);
    // Харах чигийг зөвхөн мэдэгдэхүйц хөдөлгөөнд солино (анивчилт арилгана)
    if (Math.abs(sheep.vel.x) > 8) sheep.face = sheep.vel.x < 0 ? -1 : 1;
  }
}

/**
 * Тоглогчид хохирол өгөх нэгдсэн функц.
 * Морьтой бол цохилтын 60%-ийг морь өөр дээрээ авна — морь үхэж болно.
 */
export function damagePlayer(state: GameState, dmg: number): void {
  if (state.godMode) return;
  const player = state.player;
  if (player.riding && player.horseHp > 0) {
    const horseShare = Math.round(dmg * 0.6);
    player.horseHp -= horseShare;
    dmg -= horseShare;
    if (player.horseHp <= 0) {
      player.horseHp = 0;
      player.gear.horse = false;
      player.riding = false;
      state.world.mountHorse = null;
      spawnParticles(state, player.pos, 14, "#6b4a26", { speed: 110 });
      spawnText(state, player.pos, "Морь үхэв!", "#ff8080");
      if (state.world.gerPacked) {
        // Гэр унана — одоогийн байранд буулгана
        const pos = {
          x: clamp(player.pos.x, 120, state.world.width - 120),
          y: clamp(player.pos.y, 120, state.world.height - 120),
        };
        state.world.campPos = { ...pos };
        state.world.gerPacked = false;
        state.world.feeder.pos = { x: pos.x - 70, y: pos.y + 48 };
        setMessage(
          state,
          "Морь үхэж гэр унав! Энд буулаа — шинийг авч нүү.",
          4,
        );
      } else {
        setMessage(state, "Морь чинь үхлээ… Дэлгүүрээс шинийг ав.", 3);
      }
    }
  }
  player.vitals.health = clamp(
    player.vitals.health - dmg,
    0,
    player.vitals.maxHealth,
  );
}

/** Дайсныг хашаанаас түлхэж, шатаас хамааран хохирол өгнө / авна */
function collideEntityWithFences(
  state: GameState,
  pos: Vector2,
  radius: number,
  attacker: "wolf" | "bear" | "thief",
  dt: number,
): { contactDps: number; knockback: number; hitTier: FenceTier | 0 } {
  const fences = state.world.fences;
  if (fences.length === 0) return { contactDps: 0, knockback: 0, hitTier: 0 };
  const hit = pushOutOfFences(pos, radius, fences);
  if (!hit) return { contactDps: 0, knockback: 0, hitTier: 0 };

  let contactDps = 0;
  let knockback = 0;
  let hitTier: FenceTier | 0 = 0;
  let pushFrom: Vector2 | null = null;
  for (const fence of fences) {
    if (!fenceBlocksMovement(fence)) continue;
    if (dist(pos, fence.pos) > radius + fence.radius + 2) continue;
    const tier = fence.tier as FenceTier;
    if (tier > hitTier) hitTier = tier;
    const breakDps = FENCE_BREAK_DPS[tier][attacker] * winterFenceBreakMult(state.world);
    if (breakDps > 0) {
      fence.hp -= breakDps * dt;
      if (fence.hp <= 0) {
        const colors: Record<FenceTier, string> = {
          1: "#8a6a3a",
          2: "#909090",
          3: "#6a8aaa",
        };
        spawnParticles(state, fence.pos, 10, colors[tier], { speed: 90 });
        spawnText(state, fence.pos, "Хашаа эвдэрлээ", "#c49a6c");
        sfx("woodChop");
      }
    }
    contactDps = Math.max(contactDps, FENCE_CONTACT_DPS[tier]);
    const kb = FENCE_KNOCKBACK[tier];
    if (kb >= knockback) {
      knockback = kb;
      pushFrom = fence.pos;
    }
  }
  if (pushFrom && knockback > 0) {
    const away = normalize({
      x: pos.x - pushFrom.x,
      y: pos.y - pushFrom.y,
    });
    pos.x += away.x * knockback * dt;
    pos.y += away.y * knockback * dt;
  }
  state.world.fences = fences.filter((f) => f.hp > 0);
  pushOutOfGer(pos, radius, state.world);
  pushOutOfUrtz(pos, radius, state.world);
  return { contactDps, knockback, hitTier };
}

export function updateWolves(
  state: GameState,
  dt: number,
  onlyWolfId?: number,
): void {
  for (const wolf of state.world.wolves) {
    if (!wolf.alive || (onlyWolfId !== undefined && wolf.id !== onlyWolfId)) {
      continue;
    }
    const contact = collideEntityWithFences(
      state,
      wolf.pos,
      wolf.radius * wolf.scale,
      wolf.kind === "bear" ? "bear" : "wolf",
      0,
    );
    if (contact.hitTier >= 2) {
      wolf.attackCooldown = Math.max(wolf.attackCooldown, 0.2);
    }
  }

  updateCombatWolves(state, dt, onlyWolfId);

  for (const wolf of state.world.wolves) {
    if (!wolf.alive || (onlyWolfId !== undefined && wolf.id !== onlyWolfId)) {
      continue;
    }
    const storyProtected =
      state.story.temporaryLivestockProtectionActive &&
      state.story.storyWolfId === wolf.id;
    const contact = collideEntityWithFences(
      state,
      wolf.pos,
      wolf.radius * wolf.scale,
      wolf.kind === "bear" ? "bear" : "wolf",
      storyProtected ? 0 : dt,
    );
    if (!storyProtected && contact.contactDps > 0 && wolf.alive) {
      const before = wolf.hp;
      wolf.hp -= contact.contactDps * dt;
      wolf.flash = Math.max(wolf.flash, 0.05);
      if (Math.random() < dt * 2.2) {
        spawnParticles(state, wolf.pos, 2, "#b0c8d8", { speed: 50 });
      }
      if (before > 0 && wolf.hp <= 0) {
        wolf.hp = 0;
        wolf.alive = false;
        sfx("kill");
        const bear = wolf.kind === "bear";
        const score = bear ? 60 : 25;
        const xp = bear ? 45 : 22;
        state.score += score;
        state.xp += xp;
        spawnParticles(state, wolf.pos, bear ? 22 : 16, "#909090", {
          speed: 130,
        });
        spawnText(state, wolf.pos, `+${score} · +${xp} XP`, "#ffd060");
        setMessage(
          state,
          bear ? "Хашаанд баавгай унав!" : "Хашаанд чоно унав!",
          2,
        );
      }
    }
  }

  // Үхсэн сэгийг шууд арилгана (story wolf орно)
  state.world.wolves = state.world.wolves.filter((wolf) => wolf.alive);
}

export function updateThieves(state: GameState, dt: number): void {
  const player = state.player;
  for (const thief of state.world.thieves) {
    if (!thief.alive) continue;
    thief.flash = Math.max(0, thief.flash - dt);
    thief.attackCooldown = Math.max(0, thief.attackCooldown - dt);

    const dPlayer = dist(thief.pos, player.pos);
    const dir = normalize({
      x: thief.escapeTarget.x - thief.pos.x,
      y: thief.escapeTarget.y - thief.pos.y,
    });
    thief.vel = dir;

    if (dPlayer < 70) {
      // Тоглогч ойртвол эргэж зөрүүлж зодолдоно — удаан зугтана
      thief.face = player.pos.x < thief.pos.x ? -1 : 1;
      if (!enemyCombatLocksMovement(thief.combatPhase)) {
        thief.pos.x += dir.x * thief.speed * 0.45 * dt;
        thief.pos.y += dir.y * thief.speed * 0.45 * dt;
      }
      if (
        dPlayer < thief.radius + player.radius + 6 &&
        thief.attackCooldown <= 0 &&
        player.invuln <= 0
      ) {
        thief.attackCooldown = 1.1;
        player.invuln = 0.5;
        damagePlayer(state, thief.damage);
        const knock = normalize({
          x: player.pos.x - thief.pos.x,
          y: player.pos.y - thief.pos.y,
        });
        player.pos.x += knock.x * 20;
        player.pos.y += knock.y * 20;
        state.fx.shake = Math.max(state.fx.shake, 4);
        state.fx.hurtFlash = 1;
        sfx("hurt");
        spawnParticles(state, player.pos, 6, "#d64545", { speed: 80 });
        spawnText(state, player.pos, `−${thief.damage}`, "#ff6060");
        if (player.vitals.health <= 0) {
          handlePlayerDeath(state, "Хулгайчид зодуулж ялагдлаа…");
        }
      }
    } else {
      if (Math.abs(dir.x) > 0.25) thief.face = dir.x < 0 ? -1 : 1;
      if (!enemyCombatLocksMovement(thief.combatPhase)) {
        thief.pos.x += dir.x * thief.speed * dt;
        thief.pos.y += dir.y * thief.speed * dt;
      }
    }
    const contact = collideEntityWithFences(
      state,
      thief.pos,
      thief.radius,
      "thief",
      dt,
    );
    if (contact.contactDps > 0 && thief.alive) {
      const before = thief.hp;
      thief.hp -= contact.contactDps * dt;
      thief.flash = Math.max(thief.flash, 0.05);
      if (Math.random() < dt * 2.2) {
        spawnParticles(state, thief.pos, 2, "#90e0ff", { speed: 50 });
      }
      if (before > 0 && thief.hp <= 0) {
        thief.hp = 0;
        thief.alive = false;
        sfx("kill");
        const recovered = thief.stolen;
        thief.stolen = 0;
        if (recovered > 0) addSheep(state, recovered);
        const xp = 30 + recovered * 2;
        state.score += recovered * 15;
        state.xp += xp;
        spawnText(
          state,
          thief.pos,
          recovered > 0
            ? trFormat("+{n} мал · +{xp} XP", { n: recovered, xp })
            : `+${xp} XP`,
          "#b8e8a0",
        );
        setMessage(
          state,
          recovered > 0
            ? trFormat("Хашаа хулгайчийг зогсоов! +{n} мал", { n: recovered })
            : "Хашаа хулгайчийг зогсоов!",
          3,
        );
      }
    }

    const atEdge =
      thief.pos.x <= 30 ||
      thief.pos.x >= WORLD_W - 30 ||
      thief.pos.y <= 30 ||
      thief.pos.y >= WORLD_H - 30 ||
      dist(thief.pos, thief.escapeTarget) < 40;

    if (atEdge) {
      const lost = thief.stolen;
      thief.stolen = 0;
      thief.alive = false;
      setMessage(
        state,
        lost > 0
          ? trFormat("Хулгайч зугтав… {n} мал үгүй болов.", { n: lost })
          : "Хулгайч зугтав.",
        3,
      );
      // Барьж чадалгүй алдсан — сүрэг хоосорсон бол ялагдал
      checkFlockDefeat(state);
    }
  }

  state.world.thieves = state.world.thieves.filter((t) => t.alive);
}

export function updateThreatTimers(state: GameState, dt: number): void {
  const world = state.world;
  // Эцэг эхээ аварсны дараа баавгай/чоно/хулгайчийн дайралт 2 дахин олширно
  const raidRate = state.parentsReturned ? 2 : 1;
  world.nextWolfIn -= dt * raidRate;
  world.nextThiefIn -= dt * raidRate;

  const mult = threatIntervalMult(world) * 2;
  const night = isNight(world) || world.dayPhase === "night";
  if (world.nextWolfIn <= 0) {
    const bearChance = state.parentsReturned ? 0.24 : 0.12;
    const bear = state.level >= 2 && Math.random() < bearChance;
    spawnWolf(state, bear ? "bear" : "wolf");
    const base = night ? randRange(20, 36) : randRange(44, 76);
    world.nextWolfIn = base * mult;
  }

  if (world.nextThiefIn <= 0) {
    if (!night || Math.random() < 0.18) {
      spawnThief(state);
    }
    world.nextThiefIn = randRange(56, 100) * mult;
  }
}
