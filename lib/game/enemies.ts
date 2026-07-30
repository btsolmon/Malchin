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
} from "../game/types";
import {
  allocId,
  clamp,
  dist,
  fenceBlocksMovement,
  isNight,
  normalize,
  pastureCenter,
  pastureFenceDefense,
  pushOutOfFences,
  randRange,
  setMessage,
  sheepFenceMitigation,
} from "./utils";
import { spawnParticles, spawnText } from "./effects";
import { sfx } from "./audio";
import {
  penCenter,
  PEN_RADIUS,
  threatIntervalMult,
  winterFenceBreakMult,
} from "./daycycle";
import {
  syncVisualFlock,
  addLivestock,
  killHerdVisual,
  loseLivestock,
  nearestHerdAnimal,
} from "./livestock";

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

export function loseSheep(state: GameState, n: number): number {
  return loseLivestock(state, n);
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
): void {
  const edge = Math.floor(Math.random() * 4);
  let pos: Vector2;
  if (edge === 0) pos = { x: randRange(40, WORLD_W - 40), y: 40 };
  else if (edge === 1)
    pos = { x: randRange(40, WORLD_W - 40), y: WORLD_H - 40 };
  else if (edge === 2) pos = { x: 40, y: randRange(40, WORLD_H - 40) };
  else pos = { x: WORLD_W - 40, y: randRange(40, WORLD_H - 40) };

  const night = isNight(state.world);
  const lvl = state.level - 1;
  const bear = kind === "bear";
  // Баавгай: чононоос 2 дахин их амь, 2 дахин их хүчтэй, том биетэй, удаан
  const baseHp = Math.round((night ? 45 : 30) * (1 + 0.12 * lvl));
  const hp = bear ? baseHp * 2 : baseHp;
  state.world.wolves.push({
    id: allocId(state),
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
    posture: 0,
    maxPosture: bear ? 140 : 100,
    postureRecoveryDelay: 0,
    combatPhase: "idle",
    combatTimer: 0,
    attackDirection: { x: 0, y: 1 },
    attackHitDone: false,
    knockbackResistance: bear ? 0.45 : 0.15,
  });
  sfx("howl");
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

  const stolen = stealWant > 0 ? loseSheep(state, stealWant) : 0;
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
    spawnText(state, pos, `−${stolen} мал!`, "#ff8080");
    setMessage(state, `Хулгайч ${stolen} мал авч зугтав! Гүйцэж ав!`, 4);
  } else if (defense.tier3Count < 5) {
    setMessage(state, "Хулгайч ойртлоо — хашаагаа шалга!", 3);
  }
}

// ---------------------------------------------------------------------------
// Update systems
// ---------------------------------------------------------------------------

export function updateFlock(state: GameState, dt: number): void {
  const center = pastureCenter(state.world);
  const pen = penCenter(state.world);
  const { player, world } = state;
  const herding = state.input.herd;
  const drive = normalize(player.facing);
  const dog = world.dog;
  const out = world.flockOut;

  for (const sheep of world.flock.visuals) {
    const home = out ? center : pen;
    const homeR = out ? PASTURE_RADIUS : PEN_RADIUS * 0.85;
    const toCenter = normalize({
      x: home.x - sheep.pos.x,
      y: home.y - sheep.pos.y,
    });
    const toPlayer = normalize({
      x: player.pos.x - sheep.pos.x,
      y: player.pos.y - sheep.pos.y,
    });
    const wander = {
      x: Math.sin(world.elapsed * 0.7 + sheep.id) * (out ? 0.4 : 0.15),
      y: Math.cos(world.elapsed * 0.5 + sheep.id * 1.3) * (out ? 0.4 : 0.15),
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

    // Нохойноос зугтана — нохой ард байрлаж туухад ашиглагдана
    if (dog) {
      const dDog = dist(sheep.pos, dog.pos);
      const dogRange = herding ? 130 : 70;
      if (dDog < dogRange && dDog > 1) {
        const w = (dogRange - dDog) / dogRange;
        const push = herding ? 4.2 : 1.4;
        fleeX += ((sheep.pos.x - dog.pos.x) / dDog) * w * push;
        fleeY += ((sheep.pos.y - dog.pos.y) / dDog) * w * push;
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
    // Бэлчээрт гарсан үед гэрийн дэргэд биш, бэлчээрийн тойрогт тарана
    let pull: number;
    let steerX = toCenter.x;
    let steerY = toCenter.y;
    if (herding) {
      pull = dCenter > homeR * 1.4 ? 0.35 : 0.05;
    } else if (!out) {
      pull = dCenter > homeR ? 2.4 : 0.6;
    } else {
      // Бэлчих цэг — гэрийн эргэн тойронд тархана
      const ang =
        world.elapsed * 0.12 + sheep.id * 1.91 + sheep.grazeSeed;
      const rad =
        PASTURE_RADIUS * (0.35 + ((sheep.id * 17) % 7) * 0.08);
      const spot = {
        x: center.x + Math.cos(ang) * rad,
        y: center.y + Math.sin(ang * 0.85) * rad * 0.8,
      };
      const toSpot = normalize({
        x: spot.x - sheep.pos.x,
        y: spot.y - sheep.pos.y,
      });
      steerX = toSpot.x;
      steerY = toSpot.y;
      const dSpot = dist(sheep.pos, spot);
      pull = dSpot > 28 ? 1.1 : 0.2;
      // Гэрт хэт ойртохыг түлхэнэ
      const dGer = dist(sheep.pos, center);
      if (dGer < 70) {
        steerX += (sheep.pos.x - center.x) / Math.max(1, dGer) * 1.5;
        steerY += (sheep.pos.y - center.y) / Math.max(1, dGer) * 1.5;
        pull = Math.max(pull, 1.2);
      }
    }
    const playerPull = herding ? 0 : out ? 0.05 : 0.05;

    sheep.vel.x +=
      (steerX * pull +
        toPlayer.x * playerPull +
        wander.x +
        fleeX +
        herdX) *
      40 *
      dt;
    sheep.vel.y +=
      (steerY * pull +
        toPlayer.y * playerPull +
        wander.y +
        fleeY +
        herdY) *
      40 *
      dt;
    sheep.vel.x *= 0.92;
    sheep.vel.y *= 0.92;
    sheep.pos.x += sheep.vel.x * dt;
    sheep.pos.y += sheep.vel.y * dt;
    sheep.pos.x = clamp(sheep.pos.x, 30, WORLD_W - 30);
    sheep.pos.y = clamp(sheep.pos.y, 30, WORLD_H - 30);
    pushOutOfFences(sheep.pos, sheep.radius, world.fences);

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
  const player = state.player;
  if (player.gear.horse && player.horseHp > 0) {
    const horseShare = Math.round(dmg * 0.6);
    player.horseHp -= horseShare;
    dmg -= horseShare;
    if (player.horseHp <= 0) {
      player.horseHp = 0;
      player.gear.horse = false;
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
        state.world.campfire.pos = { x: pos.x + 52, y: pos.y + 14 };
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
  return { contactDps, knockback, hitTier };
}

export function updateWolves(state: GameState, dt: number): void {
  const { wolves, flock } = state.world;
  const player = state.player;

  for (const wolf of wolves) {
    if (!wolf.alive) continue;
    wolf.attackCooldown = Math.max(0, wolf.attackCooldown - dt);
    wolf.flash = Math.max(0, wolf.flash - dt);

    const prey = nearestSheep(wolf.pos, flock.visuals);
    const target = prey?.pos ?? pastureCenter(state.world);

    const dPlayer = dist(wolf.pos, player.pos);
    let dir: Vector2;
    if (dPlayer < 50 && wolf.hp < wolf.maxHp * 0.4) {
      dir = normalize({
        x: wolf.pos.x - player.pos.x,
        y: wolf.pos.y - player.pos.y,
      });
    } else {
      dir = normalize({ x: target.x - wolf.pos.x, y: target.y - wolf.pos.y });
    }

    wolf.vel = dir;
    // Харах чигийг зөөлөн солино — олз дээрээ чичрэхгүй
    if (Math.abs(dir.x) > 0.25) wolf.face = dir.x < 0 ? -1 : 1;

    const dPrey = prey ? dist(wolf.pos, prey.pos) : Infinity;
    const biteRange = wolf.radius * wolf.scale + (prey ? prey.radius : 0) + 4;

    // Олзондоо хүрсэн бол зогсож хазна (мөргөлдөж анивчихгүй)
    const combatLocked = enemyCombatLocksMovement(wolf.combatPhase);
    if (!combatLocked && dPrey > biteRange - 3) {
      wolf.pos.x += dir.x * wolf.speed * dt;
      wolf.pos.y += dir.y * wolf.speed * dt;
    }
    const contact = collideEntityWithFences(
      state,
      wolf.pos,
      wolf.radius * wolf.scale,
      wolf.kind === "bear" ? "bear" : "wolf",
      dt,
    );
    if (contact.contactDps > 0 && wolf.alive) {
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

    // Чоно 3, баавгай 2 хазалтаар хонь унагана — ойролцоох хашаа хамгаална
    if (
      prey &&
      !combatLocked &&
      dPrey < biteRange + 4 &&
      wolf.attackCooldown <= 0
    ) {
      wolf.attackCooldown = wolf.kind === "bear" ? 1.5 : 1.3;
      const mitigate = sheepFenceMitigation(prey.pos, state.world.fences);
      const block =
        contact.hitTier >= 3 ? 0.08 : contact.hitTier >= 2 ? 0.55 : 1;
      const dmg = (wolf.kind === "bear" ? 1.5 : 1) * mitigate * block;
      if (dmg < 0.12) {
        spawnText(state, prey.pos, "Хашаа хамгааллаа", "#a8d8ff");
        spawnParticles(state, wolf.pos, 3, "#90c8e8", { speed: 40 });
      } else {
        prey.hp -= dmg;
        prey.flash = 0.18;
        sfx("baa");
        spawnParticles(state, prey.pos, 5, "#f0ebe3", { speed: 70 });
        if (prey.hp <= 0) {
          spawnParticles(state, prey.pos, 12, "#f0ebe3", { speed: 100 });
          spawnText(state, prey.pos, "−1 мал", "#ff8080");
          killSheepVisual(state, prey);
          setMessage(
            state,
            wolf.kind === "bear" ? "Баавгай мал барив!" : "Чоно мал барив!",
            2,
          );
        }
      }
    }

    // Тоглогч руу цохилт — advanced combat (windup/parry/dodge) хариуцна
  }

  state.world.wolves = wolves.filter((w) => w.alive);
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
      // Тоглогч руу цохилт — advanced combat хариуцна
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
          recovered > 0 ? `+${recovered} мал · +${xp} XP` : `+${xp} XP`,
          "#b8e8a0",
        );
        setMessage(
          state,
          recovered > 0
            ? `Хашаа хулгайчийг зогсоов! +${recovered} мал`
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
          ? `Хулгайч зугтав… ${lost} мал үгүй болов.`
          : "Хулгайч зугтав.",
        3,
      );
    }
  }

  state.world.thieves = state.world.thieves.filter((t) => t.alive);
}

export function updateThreatTimers(state: GameState, dt: number): void {
  const world = state.world;
  world.nextWolfIn -= dt;
  world.nextThiefIn -= dt;

  const mult = threatIntervalMult(world) * 2;
  const night = isNight(world) || world.dayPhase === "night";
  if (world.nextWolfIn <= 0) {
    const bear = state.level >= 2 && Math.random() < 0.12;
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
