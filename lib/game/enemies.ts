// Хүн 3 — дайсны AI: чоно, хулгайч, спавн/scaling, мал сүрэг

import {
  MAX_VISUAL_SHEEP,
  PASTURE_RADIUS,
  WIN_SHEEP,
  WORLD_H,
  WORLD_W,
  type GameState,
  type Sheep,
  type Vector2,
} from "./types";
import {
  allocId,
  clamp,
  dist,
  isNight,
  normalize,
  pastureCenter,
  randRange,
  setMessage,
} from "./utils";
import { spawnParticles, spawnText } from "./effects";
import { sfx } from "./audio";

export function createVisualSheep(id: number, around: Vector2): Sheep {
  const ang = Math.random() * Math.PI * 2;
  const r = randRange(20, PASTURE_RADIUS * 0.7);
  return {
    id,
    pos: {
      x: around.x + Math.cos(ang) * r,
      y: around.y + Math.sin(ang) * r,
    },
    vel: { x: 0, y: 0 },
    radius: 10,
    grazeSeed: Math.random() * 10,
    hp: 3,
    flash: 0,
    face: 1,
  };
}

export function syncVisualFlock(state: GameState): void {
  const { flock } = state.world;
  const center = pastureCenter(state.world);
  const want = Math.min(MAX_VISUAL_SHEEP, flock.total);

  while (flock.visuals.length < want) {
    flock.visuals.push(createVisualSheep(allocId(state), center));
  }
  while (flock.visuals.length > want) {
    flock.visuals.pop();
  }
}

export function addSheep(state: GameState, n: number): void {
  state.world.flock.total = Math.min(WIN_SHEEP, state.world.flock.total + n);
  syncVisualFlock(state);
  checkWin(state);
}

export function loseSheep(state: GameState, n: number): number {
  const lost = Math.min(n, state.world.flock.total);
  state.world.flock.total -= lost;
  syncVisualFlock(state);
  if (state.world.flock.total <= 0) {
    state.phase = "lost";
    setMessage(state, "Бүх мал үгүй болов… Ялагдлаа.", 99);
  }
  return lost;
}

/** Тодорхой нэг хонь чонод идэгдэх */
export function killSheepVisual(state: GameState, sheep: Sheep): void {
  const flock = state.world.flock;
  flock.total = Math.max(0, flock.total - 1);
  const i = flock.visuals.indexOf(sheep);
  if (i >= 0) flock.visuals.splice(i, 1);
  syncVisualFlock(state);
  if (flock.total <= 0) {
    state.phase = "lost";
    setMessage(state, "Бүх мал үгүй болов… Ялагдлаа.", 99);
  }
}

export function checkWin(state: GameState): void {
  if (state.world.flock.total >= WIN_SHEEP) {
    state.phase = "won";
    setMessage(state, `Ялалт! ${WIN_SHEEP} хоньтой болоо!`, 99);
  }
}

export function nearestSheep(from: Vector2, visuals: Sheep[]): Sheep | null {
  let best: Sheep | null = null;
  let bestD = Infinity;
  for (const s of visuals) {
    const d = dist(from, s.pos);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
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
  else if (edge === 1) pos = { x: randRange(40, WORLD_W - 40), y: WORLD_H - 40 };
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

  const stealWant = clamp(2 + Math.floor(Math.random() * 4), 1, 8);
  const stolen = loseSheep(state, stealWant);
  if (stolen <= 0) return;

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
  });
  sfx("alert");

  spawnText(state, pos, `−${stolen} хонь!`, "#ff8080");
  setMessage(state, `Хулгайч ${stolen} хонь авч зугтав! Гүйцэж ав!`, 4);
}

// ---------------------------------------------------------------------------
// Update systems
// ---------------------------------------------------------------------------


export function updateFlock(state: GameState, dt: number): void {
  const center = pastureCenter(state.world);
  const { player, world } = state;

  for (const sheep of world.flock.visuals) {
    const toCenter = normalize({
      x: center.x - sheep.pos.x,
      y: center.y - sheep.pos.y,
    });
    const toPlayer = normalize({
      x: player.pos.x - sheep.pos.x,
      y: player.pos.y - sheep.pos.y,
    });
    const wander = {
      x: Math.sin(world.elapsed * 0.7 + sheep.id) * 0.4,
      y: Math.cos(world.elapsed * 0.5 + sheep.id * 1.3) * 0.4,
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

    const dCenter = dist(sheep.pos, center);
    const pull = dCenter > PASTURE_RADIUS ? 1.2 : 0.25;

    sheep.vel.x +=
      (toCenter.x * pull + toPlayer.x * 0.15 + wander.x + fleeX) * 40 * dt;
    sheep.vel.y +=
      (toCenter.y * pull + toPlayer.y * 0.15 + wander.y + fleeY) * 40 * dt;
    sheep.vel.x *= 0.92;
    sheep.vel.y *= 0.92;
    sheep.pos.x += sheep.vel.x * dt;
    sheep.pos.y += sheep.vel.y * dt;
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
      setMessage(state, "Морь чинь үхлээ… Дэлгүүрээс шинийг ав.", 3);
    }
  }
  player.vitals.health = clamp(
    player.vitals.health - dmg,
    0,
    player.vitals.maxHealth,
  );
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
    if (dPrey > biteRange - 3) {
      wolf.pos.x += dir.x * wolf.speed * dt;
      wolf.pos.y += dir.y * wolf.speed * dt;
    }

    // Чоно 3, баавгай 2 хазалтаар хонь унагана
    if (prey && dPrey < biteRange + 4 && wolf.attackCooldown <= 0) {
      wolf.attackCooldown = wolf.kind === "bear" ? 1.5 : 1.3;
      prey.hp -= wolf.kind === "bear" ? 1.5 : 1;
      prey.flash = 0.18;
      sfx("baa");
      spawnParticles(state, prey.pos, 5, "#f0ebe3", { speed: 70 });
      if (prey.hp <= 0) {
        spawnParticles(state, prey.pos, 12, "#f0ebe3", { speed: 100 });
        spawnText(state, prey.pos, "−1 хонь", "#ff8080");
        killSheepVisual(state, prey);
        setMessage(
          state,
          wolf.kind === "bear" ? "Баавгай хонь барив!" : "Чоно хонь барив!",
          2,
        );
      }
    }

    if (
      dPlayer < wolf.radius * wolf.scale + player.radius + 2 &&
      wolf.attackCooldown <= 0 &&
      player.invuln <= 0
    ) {
      wolf.attackCooldown = 1.1;
      player.invuln = 0.6;
      damagePlayer(state, wolf.damage);
      const knock = normalize({
        x: player.pos.x - wolf.pos.x,
        y: player.pos.y - wolf.pos.y,
      });
      player.pos.x += knock.x * 24;
      player.pos.y += knock.y * 24;
      state.fx.shake = Math.max(state.fx.shake, 5);
      state.fx.hurtFlash = 1;
      sfx("hurt");
      spawnParticles(state, player.pos, 8, "#d64545", { speed: 90 });
      spawnText(state, player.pos, `−${wolf.damage}`, "#ff6060");
      if (player.vitals.health <= 0) {
        state.phase = "lost";
        setMessage(
          state,
          wolf.kind === "bear" ? "Баавгайд ялагдлаа…" : "Чононд ялагдлаа…",
          99,
        );
      }
    }
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
      thief.pos.x += dir.x * thief.speed * 0.45 * dt;
      thief.pos.y += dir.y * thief.speed * 0.45 * dt;

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
        if (player.vitals.health <= 0 && state.phase === "playing") {
          state.phase = "lost";
          setMessage(state, "Хулгайчид зодуулж ялагдлаа…", 99);
        }
      }
    } else {
      if (Math.abs(dir.x) > 0.25) thief.face = dir.x < 0 ? -1 : 1;
      thief.pos.x += dir.x * thief.speed * dt;
      thief.pos.y += dir.y * thief.speed * dt;
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
          ? `Хулгайч зугтав… ${lost} хонь үгүй болов.`
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

  const night = isNight(world);
  if (world.nextWolfIn <= 0) {
    // 2-р түвшнээс эхлэн заримдаа чонын оронд баавгай гарна
    const bear = state.level >= 2 && Math.random() < 0.25;
    spawnWolf(state, bear ? "bear" : "wolf");
    world.nextWolfIn = night ? randRange(10, 18) : randRange(22, 38);
  }

  if (world.nextThiefIn <= 0) {
    if (!night || Math.random() < 0.35) {
      spawnThief(state);
    }
    world.nextThiefIn = randRange(28, 50);
  }
}
