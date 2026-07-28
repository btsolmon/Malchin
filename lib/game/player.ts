// Хүн 2 — малчин: хөдөлгөөн, амьдрах механик, XP/ур чадвар, цаг агаар

import {
  FENCE_COST,
  FENCE_GRID,
  FENCE_MAX_HP_BY_TIER,
  FENCE_RADIUS,
  FENCE_TIER_NAMES,
  FENCE_UPGRADE_COST,
  type BerryBush,
  type Fence,
  type FenceTier,
  type GameState,
  type Player,
  type Skill,
  type Tree,
  type Vector2,
} from "./types";
import {
  allocId,
  clamp,
  collidePlayerWithGates,
  dist,
  fenceOrientFromFacing,
  fencePlacePos,
  fencesOverlap,
  normalize,
  pastureCenter,
  randRange,
  seasonForDay,
  setMessage,
  wouldCloseFenceLoop,
} from "./utils";
import { spawnParticles, spawnText } from "./effects";
import { sfx } from "./audio";
import { addSheep } from "./enemies";

export const SKILL_POOL: Skill[] = [
  {
    id: "power",
    name: "Хүчтэй цохилт",
    desc: "Цохилтын хүч +30%",
    apply: (s) => {
      s.player.damageMult *= 1.3;
    },
  },
  {
    id: "swift",
    name: "Хурдан цохилт",
    desc: "Цохилт хоорондын зай −25%",
    apply: (s) => {
      s.player.cooldownMult *= 0.75;
    },
  },
  {
    id: "speed",
    name: "Хурдан хөл",
    desc: "Гүйх хурд +12%",
    apply: (s) => {
      s.player.speed *= 1.12;
    },
  },
  {
    id: "vitality",
    name: "Их амь",
    desc: "Дээд амь +25, бүрэн эдгэрнэ",
    apply: (s) => {
      s.player.vitals.maxHealth += 25;
      s.player.vitals.health = s.player.vitals.maxHealth;
    },
  },
  {
    id: "reach",
    name: "Урт таяг",
    desc: "Цохилтын хүрээ +20%",
    apply: (s) => {
      s.player.reachMult *= 1.2;
    },
  },
  {
    id: "warm",
    name: "Дулаан дээл",
    desc: "Хүйтэнд 2 дахин тэсвэртэй",
    apply: (s) => {
      s.player.warmthResist *= 0.5;
    },
  },
];

export function pickSkillChoices(): Skill[] {
  const pool = [...SKILL_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function maybeLevelUp(state: GameState): void {
  if (state.phase !== "playing") return;
  if (state.xp < state.xpNext) return;
  state.xp -= state.xpNext;
  state.level += 1;
  state.xpNext = 60 + state.level * 30;
  state.skillChoices = pickSkillChoices();
  state.menuIndex = 0;
  state.phase = "levelup";
}

export function gainXp(state: GameState, n: number, at?: Vector2): void {
  state.xp += n;
  if (at) spawnText(state, at, `+${n} XP`, "#c0a0ff");
  maybeLevelUp(state);
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

export function updateWeatherCycle(state: GameState, dt: number): void {
  const world = state.world;
  const prevDay = Math.floor(world.timeOfDay);
  world.timeOfDay = (world.timeOfDay + dt * 0.4) % 24;
  world.elapsed += dt;

  const curDay = Math.floor(world.timeOfDay);
  if (curDay < prevDay) {
    world.dayNumber += 1;
    const growth = Math.max(
      1,
      Math.floor(world.flock.total * randRange(0.08, 0.15)),
    );
    addSheep(state, growth);
    state.score += growth;
    gainXp(state, 12);
    spawnText(state, pastureCenter(world), `+${growth} хонь`, "#b8e8a0");
    if (state.phase === "playing") {
      setMessage(
        state,
        `Өдөр ${world.dayNumber}: сүрэг +${growth} (нийт ${world.flock.total})`,
        3.5,
      );
    }
  }

  world.season = seasonForDay(world.dayNumber);

  const t = world.elapsed;
  if (world.season === "winter") {
    world.weather = t % 40 < 18 ? "snow" : "wind";
  } else if (world.season === "summer") {
    world.weather = t % 60 > 50 ? "wind" : "clear";
  } else if (t % 55 > 40) {
    world.weather = "storm";
  } else if (t % 55 > 28) {
    world.weather = "wind";
  } else {
    world.weather = "clear";
  }
}

export function updatePlayerMovement(state: GameState, dt: number): void {
  const { player, input, world } = state;
  const dir: Vector2 = {
    x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    y: (input.down ? 1 : 0) - (input.up ? 1 : 0),
  };
  const n = normalize(dir);
  player.moving = n.x !== 0 || n.y !== 0;

  if (player.moving) {
    player.facing = n;
    const spd = player.speed * (player.gear.horse ? 1.5 : 1);
    player.pos.x += n.x * spd * dt;
    player.pos.y += n.y * spd * dt;
  }

  player.pos.x = clamp(
    player.pos.x,
    player.radius,
    world.width - player.radius,
  );
  player.pos.y = clamp(
    player.pos.y,
    player.radius,
    world.height - player.radius,
  );

  collidePlayerWithGates(state);
}

export function nearestAliveTree(player: Player, trees: Tree[]): Tree | null {
  let best: Tree | null = null;
  let bestD = Infinity;
  for (const tree of trees) {
    if (tree.hp <= 0) continue;
    const d = dist(player.pos, tree.pos);
    if (d < bestD) {
      bestD = d;
      best = tree;
    }
  }
  return bestD < player.radius + 36 ? best : null;
}

export function nearestBerryBush(
  player: Player,
  bushes: BerryBush[],
): BerryBush | null {
  let best: BerryBush | null = null;
  let bestD = Infinity;
  for (const bush of bushes) {
    if (bush.berries <= 0) continue;
    const d = dist(player.pos, bush.pos);
    if (d < bestD) {
      bestD = d;
      best = bush;
    }
  }
  return bestD < player.radius + 34 ? best : null;
}

export function tryInteract(state: GameState): void {
  const { player, world } = state;
  if (player.chopCooldown > 0 || !state.input.interact) return;

  // Гэрийн дэргэд — гэрт орно
  const center = pastureCenter(world);
  const gerPos = { x: center.x, y: center.y - 20 };
  if (dist(player.pos, gerPos) < 62) {
    state.phase = "ger";
    state.shopOpen = false;
    state.menuIndex = 0;
    state.gerPlayer = { x: 480, y: 435 };
    state.input.interact = false;
    sfx("select");
    return;
  }

  const bush = nearestBerryBush(player, world.bushes);
  if (bush) {
    bush.berries -= 1;
    player.inventory.berries += 1;
    player.chopCooldown = 0.35;
    state.score += 2;
    gainXp(state, 1);
    sfx("berry");
    spawnParticles(state, bush.pos, 5, "#e04070", { speed: 60, size: 2.5 });
    spawnText(state, bush.pos, "+1 жимс", "#ff9fbf");
    if (bush.berries <= 0) {
      bush.respawnIn = 18 + Math.random() * 12;
    }
    return;
  }

  const tree = nearestAliveTree(player, world.trees);
  if (!tree) {
    setMessage(state, "Ойрхон мод/жимс алга.", 1.5);
    return;
  }

  tree.hp -= player.gear.axe ? tree.hp : 1;
  player.chopCooldown = player.gear.axe ? 0.35 : 0.45;
  spawnParticles(state, { x: tree.pos.x, y: tree.pos.y - 8 }, 6, "#a0733d", {
    speed: 80,
    size: 3,
  });
  state.fx.shake = Math.max(state.fx.shake, 1.2);
  sfx("chop");

  if (tree.hp <= 0) {
    const gained = 1 + Math.floor(Math.random() * 2);
    player.inventory.wood += gained;
    state.score += gained * 5;
    gainXp(state, 3);
    tree.respawnIn = 25 + Math.random() * 15;
    spawnParticles(state, tree.pos, 10, "#8a6a3a", { speed: 110 });
    spawnText(state, tree.pos, `+${gained} түлээ`, "#e8c56a");
  }
}

export function tryEatBerry(state: GameState): void {
  const { player } = state;
  if (!state.input.eat || player.eatCooldown > 0) return;

  if (player.inventory.berries <= 0) {
    setMessage(state, "Жимс алга. Бутнаас E-ээр түү.", 2);
    state.input.eat = false;
    return;
  }

  player.inventory.berries -= 1;
  player.vitals.hunger = clamp(
    player.vitals.hunger + 28,
    0,
    player.vitals.maxHunger,
  );
  player.vitals.health = clamp(
    player.vitals.health + 4,
    0,
    player.vitals.maxHealth,
  );
  player.eatCooldown = 0.5;
  state.input.eat = false;
  sfx("eat");
  spawnParticles(
    state,
    { x: player.pos.x, y: player.pos.y - 16 },
    4,
    "#e04070",
    {
      speed: 40,
      gravity: -20,
      size: 2,
    },
  );
  spawnText(state, player.pos, "+28 хоол", "#ffd080");
}

export function tryLightCampfire(state: GameState): void {
  if (!state.input.lightFire) return;

  const { player, world } = state;
  const fire = world.campfire;
  if (dist(player.pos, fire.pos) >= fire.radius) {
    setMessage(state, "Гал руу ойрт (F).", 1.5);
    state.input.lightFire = false;
    return;
  }

  const cost = 3;
  if (!state.unlimitedWood && player.inventory.wood < cost) {
    setMessage(state, `Галд ${cost} түлээ хэрэгтэй.`, 2);
    state.input.lightFire = false;
    return;
  }

  if (!state.unlimitedWood) player.inventory.wood -= cost;
  fire.lit = true;
  fire.fuel = Math.max(fire.fuel, 0) + 18;
  state.input.lightFire = false;
  sfx("fire");
  spawnParticles(state, fire.pos, 14, "#ffb347", { speed: 70, gravity: -40 });
  setMessage(state, "Гал асаалаа.", 2);
}

function tryUpgradeFence(state: GameState, fence: Fence): void {
  const { player } = state;
  if (fence.tier >= 3) {
    setMessage(state, "Хамгийн дээд шатны хашаа байна.", 1.5);
    return;
  }
  const from = fence.tier as 1 | 2;
  const cost = FENCE_UPGRADE_COST[from];
  const next = (fence.tier + 1) as FenceTier;
  const nextName = FENCE_TIER_NAMES[next];

  if (state.level < cost.minLevel) {
    setMessage(
      state,
      `${nextName} — түвшин ${cost.minLevel}+ хэрэгтэй.`,
      2,
    );
    return;
  }
  if (!state.unlimitedWood && player.inventory.wood < cost.wood) {
    setMessage(state, `${nextName} болгоход ${cost.wood} мод хэрэгтэй.`, 2);
    return;
  }
  if (state.score < cost.score) {
    setMessage(state, `${nextName} — ${cost.score} оноо хэрэгтэй.`, 2);
    return;
  }
  if (player.inventory.berries < cost.berries) {
    setMessage(
      state,
      `${nextName} — ${cost.berries} жимс хэрэгтэй.`,
      2,
    );
    return;
  }

  if (!state.unlimitedWood) player.inventory.wood -= cost.wood;
  state.score -= cost.score;
  player.inventory.berries -= cost.berries;
  player.chopCooldown = 0.28;
  fence.tier = next;
  fence.maxHp = FENCE_MAX_HP_BY_TIER[next];
  fence.hp = fence.maxHp;
  sfx("chop");
  const color = next === 3 ? "#7ec8ff" : "#a8a8a8";
  spawnParticles(state, fence.pos, 12, color, { speed: 80, size: 2.5 });
  const spent: string[] = state.unlimitedWood
    ? []
    : [`−${cost.wood} мод`];
  if (cost.score > 0) spent.push(`−${cost.score} оноо`);
  if (cost.berries > 0) spent.push(`−${cost.berries} жимс`);
  if (spent.length) spawnText(state, fence.pos, spent.join(" · "), "#e8c56a");
  setMessage(state, `${nextName} болголоо!`, 1.6);
}

export function tryBuildFence(state: GameState): void {
  if (!state.input.buildFence) return;
  state.input.buildFence = false;

  const { player, world } = state;
  if (player.chopCooldown > 0) return;

  // Эхний B — цагаан preview; хоёр дахь B — барих/шинэчлэх
  if (!state.fencePreview) {
    state.fencePreview = true;
    setMessage(state, "Байршлыг хар. Дахин B дарж барина (P = цуцлах).", 2.5);
    return;
  }

  state.fencePreview = false;

  const pos = fencePlacePos(player.pos, player.facing, FENCE_GRID);

  // Ойролцоо/ижил цэг дээрх хашааг шинэчлэнэ
  const existing = world.fences.find((f) => fencesOverlap(pos, f.pos));
  if (existing) {
    tryUpgradeFence(state, existing);
    return;
  }

  if (!state.unlimitedWood && player.inventory.wood < FENCE_COST) {
    setMessage(state, `Модон хашаанд ${FENCE_COST} мод хэрэгтэй.`, 2);
    return;
  }

  const center = pastureCenter(world);
  const gerPos = { x: center.x, y: center.y - 20 };

  if (dist(pos, gerPos) < 78) {
    setMessage(state, "Гэрийн дэргэд хашаа барихгүй.", 2);
    return;
  }
  if (dist(pos, world.campfire.pos) < 40) {
    setMessage(state, "Галын дэргэд хашаа барихгүй.", 2);
    return;
  }
  if (
    pos.x < FENCE_RADIUS + 8 ||
    pos.y < FENCE_RADIUS + 8 ||
    pos.x > world.width - FENCE_RADIUS - 8 ||
    pos.y > world.height - FENCE_RADIUS - 8
  ) {
    setMessage(state, "Энд хашаа барихгүй.", 1.5);
    return;
  }
  for (const tree of world.trees) {
    if (tree.hp > 0 && dist(pos, tree.pos) < tree.radius + FENCE_RADIUS) {
      setMessage(state, "Модны дээр хашаа барихгүй.", 1.5);
      return;
    }
  }

  if (!state.unlimitedWood) player.inventory.wood -= FENCE_COST;
  player.chopCooldown = 0.28;
  const orient = fenceOrientFromFacing(player.facing);
  const isGate = wouldCloseFenceLoop(pos, orient, world.fences);
  world.fences.push({
    id: allocId(state),
    pos,
    radius: FENCE_RADIUS,
    orient,
    tier: 1,
    hp: FENCE_MAX_HP_BY_TIER[1],
    maxHp: FENCE_MAX_HP_BY_TIER[1],
    isGate,
    gateOpen: 0,
    gateCloseIn: 0,
  });
  state.score += 2;
  sfx("chop");
  spawnParticles(state, pos, 8, "#8a6a3a", { speed: 70, size: 2.5 });
  if (!state.unlimitedWood) {
    spawnText(state, pos, `−${FENCE_COST} мод`, "#e8c56a");
  }
  if (isGate) {
    setMessage(state, "Хаалга босголоо — түлхэж нээнэ.", 2);
  } else {
    setMessage(state, `${FENCE_TIER_NAMES[1]} босголоо.`, 1.2);
  }
}

/** Чононд хохирол өгөх — цохилт, сум, нохойн хазалт бүгд эндээс */

export function updateSurvival(state: GameState, dt: number): void {
  const { player, world } = state;
  const fire = world.campfire;

  if (fire.lit) {
    fire.fuel -= dt;
    if (fire.fuel <= 0) {
      fire.lit = false;
      fire.fuel = 0;
    }
  }

  const nearFire = fire.lit && dist(player.pos, fire.pos) < fire.radius;
  const night = world.timeOfDay < 6 || world.timeOfDay > 20;
  const coldWeather =
    world.weather === "snow" ||
    world.weather === "storm" ||
    world.season === "winter";

  let warmthDelta = 0;
  if (night || coldWeather) {
    warmthDelta = -2.5 * dt * player.warmthResist;
    if (coldWeather && night) warmthDelta -= 1.5 * dt * player.warmthResist;
  } else {
    warmthDelta = 6 * dt;
  }
  if (nearFire) warmthDelta = 14 * dt;

  player.vitals.warmth = clamp(
    player.vitals.warmth + warmthDelta,
    0,
    player.vitals.maxWarmth,
  );

  if (player.vitals.warmth <= 0) {
    player.vitals.health = clamp(
      player.vitals.health - 3 * dt,
      0,
      player.vitals.maxHealth,
    );
    if (player.vitals.health <= 0 && state.phase === "playing") {
      state.phase = "lost";
      setMessage(state, "Хүйтэнд нэрвэгдлээ…", 99);
    }
  }

  player.vitals.hunger = clamp(
    player.vitals.hunger - 1.4 * dt,
    0,
    player.vitals.maxHunger,
  );
  if (player.vitals.hunger <= 0) {
    player.vitals.health = clamp(
      player.vitals.health - 5 * dt,
      0,
      player.vitals.maxHealth,
    );
    if (player.vitals.health <= 0 && state.phase === "playing") {
      state.phase = "lost";
      setMessage(state, "Өлсөж үхлээ… Жимс түүж ид!", 99);
    }
  }

  for (const tree of world.trees) {
    if (tree.hp > 0) continue;
    tree.respawnIn -= dt;
    if (tree.respawnIn <= 0) {
      tree.hp = tree.maxHp;
      tree.respawnIn = 0;
    }
  }

  for (const bush of world.bushes) {
    if (bush.berries > 0) continue;
    bush.respawnIn -= dt;
    if (bush.respawnIn <= 0) {
      bush.berries = bush.maxBerries;
      bush.respawnIn = 0;
    }
  }

  if (player.chopCooldown > 0) player.chopCooldown -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.eatCooldown > 0) player.eatCooldown -= dt;
  if (player.attackAnim > 0) {
    player.attackAnim -= dt;
    if (player.attackAnim <= 0) {
      player.attackAnim = 0;
      player.attackMelee = false;
    }
  }
  if (player.invuln > 0) player.invuln -= dt;
  if (player.sleepCooldown > 0) player.sleepCooldown -= dt;
}

// ---------------------------------------------------------------------------
// Меню логик
// ---------------------------------------------------------------------------
