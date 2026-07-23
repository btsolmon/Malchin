// Хүн 4 — тулаан: довтолгоо, хохирол, сумнууд, хоньчин нохой

import {
  WORLD_H,
  WORLD_W,
  type GameState,
  type Thief,
  type Vector2,
  type Wolf,
} from "./types";
import { clamp, dist, normalize, setMessage } from "./utils";
import { spawnParticles, spawnText } from "./effects";
import { sfx } from "./audio";
import { gainXp } from "./player";
import { addSheep } from "./enemies";

export function damageWolf(state: GameState, wolf: Wolf, dmg: number): void {
  wolf.hp -= dmg;
  wolf.flash = 0.12;
  sfx("hit");
  spawnParticles(state, wolf.pos, 8, "#c03030", { speed: 100 });

  if (wolf.hp <= 0) {
    const bear = wolf.kind === "bear";
    wolf.alive = false;
    sfx("kill");
    state.score += bear ? 60 : 25;
    spawnParticles(state, wolf.pos, bear ? 22 : 16, "#909090", { speed: 130 });
    spawnText(state, wolf.pos, bear ? "+60" : "+25", "#ffd060");
    gainXp(state, bear ? 45 : 22, wolf.pos);
    setMessage(state, bear ? "Баавгай унагалаа!" : "Чоно устгагдлаа!", 2);
  }
}

/** Хулгайчид хохирол өгөх */
export function damageThief(state: GameState, thief: Thief, dmg: number): void {
  thief.hp -= dmg;
  thief.flash = 0.12;
  sfx("hit");
  spawnParticles(state, thief.pos, 8, "#7050a0", { speed: 100 });

  if (thief.hp <= 0) {
    thief.alive = false;
    sfx("kill");
    const recovered = thief.stolen;
    thief.stolen = 0;
    addSheep(state, recovered);
    state.score += recovered * 15;
    spawnText(state, thief.pos, `+${recovered} хонь!`, "#b8e8a0");
    gainXp(state, 30 + recovered * 2, thief.pos);
    setMessage(state, `Мал буцааж авлаа! +${recovered} хонь`, 3);
  }
}

export function tryAttack(state: GameState): void {
  const { player, world } = state;
  if (player.attackCooldown > 0 || !state.input.attack) return;

  // Холын зэвсэг: буу > нум сум > таяг
  if (player.gear.gun || player.gear.bow) {
    const gun = player.gear.gun;
    const range = gun ? 300 : 200;
    player.attackCooldown = (gun ? 0.8 : 0.55) * player.cooldownMult;
    player.attackAnim = 0.18;

    // Хамгийн ойрын бай руу онилно, байхгүй бол харсан зүг рүү буудна
    let dir = player.facing;
    let bestD = range;
    for (const w of world.wolves) {
      if (!w.alive) continue;
      const d = dist(player.pos, w.pos);
      if (d < bestD) {
        bestD = d;
        dir = normalize({ x: w.pos.x - player.pos.x, y: w.pos.y - player.pos.y });
      }
    }
    for (const t of world.thieves) {
      if (!t.alive) continue;
      const d = dist(player.pos, t.pos);
      if (d < bestD) {
        bestD = d;
        dir = normalize({ x: t.pos.x - player.pos.x, y: t.pos.y - player.pos.y });
      }
    }
    if (dir.x === 0 && dir.y === 0) dir = { x: 1, y: 0 };

    const speed = gun ? 540 : 400;
    world.projectiles.push({
      pos: { x: player.pos.x + dir.x * 14, y: player.pos.y - 8 + dir.y * 14 },
      vel: { x: dir.x * speed, y: dir.y * speed },
      dmg: (gun ? 40 : 24) * player.damageMult,
      life: range / speed + 0.15,
      kind: gun ? "bullet" : "arrow",
    });
    sfx(gun ? "gunshot" : "shoot");
    return;
  }

  // Таяг — ойрын тулаан
  player.attackCooldown = 0.4 * player.cooldownMult;
  player.attackAnim = 0.22;
  sfx("swing");
  const reach = 42 * player.reachMult;

  for (const wolf of world.wolves) {
    if (!wolf.alive || dist(player.pos, wolf.pos) > reach) continue;
    const away = normalize({
      x: wolf.pos.x - player.pos.x,
      y: wolf.pos.y - player.pos.y,
    });
    wolf.pos.x += away.x * 28;
    wolf.pos.y += away.y * 28;
    state.fx.shake = Math.max(state.fx.shake, 2.5);
    damageWolf(state, wolf, 18 * player.damageMult);
    return;
  }
  for (const thief of world.thieves) {
    if (!thief.alive || dist(player.pos, thief.pos) > reach) continue;
    const away = normalize({
      x: thief.pos.x - player.pos.x,
      y: thief.pos.y - player.pos.y,
    });
    thief.pos.x += away.x * 32;
    thief.pos.y += away.y * 32;
    state.fx.shake = Math.max(state.fx.shake, 2.5);
    damageThief(state, thief, 20 * player.damageMult);
    return;
  }
}

/** Сумнуудын хөдөлгөөн ба мөргөлт */
export function updateProjectiles(state: GameState, dt: number): void {
  const { world } = state;
  for (const p of world.projectiles) {
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.life -= dt;
    if (p.life <= 0) continue;

    let consumed = false;
    for (const w of world.wolves) {
      if (!w.alive) continue;
      if (dist(p.pos, w.pos) < w.radius * w.scale + 5) {
        damageWolf(state, w, p.dmg);
        consumed = true;
        break;
      }
    }
    if (!consumed) {
      for (const t of world.thieves) {
        if (!t.alive) continue;
        if (dist(p.pos, t.pos) < t.radius + 6) {
          damageThief(state, t, p.dmg);
          consumed = true;
          break;
        }
      }
    }
    if (consumed) p.life = 0;
  }
  world.projectiles = world.projectiles.filter((p) => p.life > 0);
}

/** Хоньчин нохой — чоно хөөж, тоглогчийг дагана; хазуулж үхэж болно */
export function updateDog(state: GameState, dt: number): void {
  const dog = state.world.dog;
  if (!dog) return;
  dog.attackCooldown = Math.max(0, dog.attackCooldown - dt);
  dog.flash = Math.max(0, dog.flash - dt);
  // Тайван үедээ аажмаар амиа нөхнө
  if (dog.hp < dog.maxHp) {
    dog.hp = Math.min(dog.maxHp, dog.hp + dt * 1.2);
  }

  let prey: Wolf | null = null;
  let bestD = 320;
  for (const w of state.world.wolves) {
    if (!w.alive) continue;
    const d = dist(dog.pos, w.pos);
    if (d < bestD) {
      bestD = d;
      prey = w;
    }
  }

  let target: Vector2 | null = null;
  if (prey) {
    target = prey.pos;
  } else {
    const follow = { x: state.player.pos.x + 26, y: state.player.pos.y + 12 };
    if (dist(dog.pos, follow) > 34) target = follow;
  }

  if (target) {
    const dir = normalize({ x: target.x - dog.pos.x, y: target.y - dog.pos.y });
    dog.vel = dir;
    if (Math.abs(dir.x) > 0.25) dog.face = dir.x < 0 ? -1 : 1;
    const speed = prey ? 165 : 140;
    const stopRange = prey ? prey.radius * prey.scale + 10 : 0;
    if (!prey || dist(dog.pos, prey.pos) > stopRange) {
      dog.pos.x += dir.x * speed * dt;
      dog.pos.y += dir.y * speed * dt;
    }
  } else {
    dog.vel = { x: 0, y: 0 };
  }

  if (
    prey &&
    dog.attackCooldown <= 0 &&
    dist(dog.pos, prey.pos) < prey.radius * prey.scale + 14
  ) {
    dog.attackCooldown = 0.9;
    sfx("bark");
    damageWolf(state, prey, 10);

    // Араатан эргүүлж хаздаг — баавгай нохойд илүү аюултай
    if (prey.alive) {
      dog.hp -= prey.kind === "bear" ? 14 : 5;
      dog.flash = 0.15;
      spawnParticles(state, dog.pos, 5, "#c03030", { speed: 70 });
      if (dog.hp <= 0) {
        state.world.dog = null;
        state.player.gear.dog = false;
        sfx("hurt");
        spawnParticles(state, dog.pos, 16, "#7a5c38", { speed: 120 });
        spawnText(state, dog.pos, "Нохой үхэв!", "#ff8080");
        setMessage(state, "Нохой чинь үхлээ… Дэлгүүрээс шинийг ав.", 3);
        return;
      }
    }
  }

  dog.pos.x = clamp(dog.pos.x, 20, WORLD_W - 20);
  dog.pos.y = clamp(dog.pos.y, 20, WORLD_H - 20);
}
