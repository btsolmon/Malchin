// Хүн 2 — малчин: хөдөлгөөн, амьдрах механик, XP/ур чадвар, цаг агаар

import {
  DAY_LENGTH_SEC,
  CAMPFIRE_IGNITE_SEC,
  CAMPFIRE_WOOD_COST,
  FENCE_COST,
  FENCE_GRID,
  FENCE_MAX_HP_BY_TIER,
  FENCE_RADIUS,
  FENCE_TIER_NAMES,
  FENCE_UPGRADE_COST,
  GRAZE_PER_ANIMAL_PER_DAY,
  HAY_GRASS_COST,
  HAY_HARVEST_RADIUS,
  HAY_PER_SHEEP_PER_DAY,
  MAX_HAY,
  MAX_PASTURE_GRASS,
  PASTURE_RADIUS,
  SEASON_DAYS,
  type BerryBush,
  type Fence,
  type FenceTier,
  type GameState,
  type MountHorse,
  type Player,
  type Skill,
  type Tree,
  type Vector2,
  type World,
  type WorldStone,
} from "../game/types";
import {
  allocId,
  angleFromOrient,
  anglesNearlyEqual,
  canHarvestHay,
  clamp,
  collidePlayerWithGates,
  createStarterPen,
  dayInSeason,
  dist,
  fenceAngle,
  fenceOrientFromFacing,
  fencePlacePos,
  fencesOverlap,
  gerDoorPos,
  nearestFence,
  normalize,
  pastureCenter,
  pastureRefillForSeason,
  pushOutOfGer,
  randRange,
  seasonForDay,
  setMessage,
  wouldCloseFenceLoop,
} from "./utils";
import { applyRiverCurrent, isAtRiverFord, isInRiver } from "./biomes";
import { spawnParticles, spawnText } from "./effects";
import { sfx } from "./audio";
import { addSheep, loseSheep } from "./enemies";
import {
  TIME_RATE,
  dailyGrowthCount,
  dayPhaseHint,
  getDayPhase,
  pullFlockToPen,
  seasonBerryRespawnMult,
  seasonWarmthMult,
  spawnSpringBirths,
  tryToggleFlockPen,
  updateDayPhaseTransitions,
  updateNewborns,
  updateOutdoorNightRisk,
} from "./daycycle";
import {
  collectProduct,
  depositHayToFeeder,
  nearestReadyAnimal,
  tryCatchWildHorse,
} from "./livestock";
import { nearFishingSpot, tryCatchFish } from "./fish";
import { nearestRiddleHost, openRiddleAtHost, spotKindLabel } from "./riddles";
import {
  beginDawnElderDialogue,
  beginPostWolfElderDialogue,
  beginStormTraceElderDialogue,
  nearElder,
  openElder,
} from "./elder";
import {
  tryCallOpeningLivestock,
  tryInspectStormTrace,
} from "./story";
import { handlePlayerDeath } from "./spirit";

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
  const prevSeason = world.season;
  world.timeOfDay = (world.timeOfDay + dt * TIME_RATE) % 24;
  world.elapsed += dt;

  // Фазыг шинэчилж мессеж өгнө
  if (state.phase === "playing") {
    if (!world.dayPhase) {
      world.dayPhase = getDayPhase(world.timeOfDay, world.season);
    }
    updateDayPhaseTransitions(state);
  }

  const curDay = Math.floor(world.timeOfDay);
  if (curDay < prevDay) {
    world.dayNumber += 1;
    const growth = dailyGrowthCount(state);
    if (growth > 0) {
      addSheep(state, growth);
      state.score += growth;
      gainXp(state, 12);
      spawnText(state, pastureCenter(world), `+${growth} мал`, "#b8e8a0");
    }
    spawnSpringBirths(state);
    if (state.phase === "playing") {
      const hint = dayPhaseHint(
        getDayPhase(world.timeOfDay, world.season),
        world.season,
        world.flockOut,
      );
      setMessage(
        state,
        growth > 0
          ? `Өдөр ${world.dayNumber}: сүрэг +${growth}. ${hint}`
          : `Өдөр ${world.dayNumber}. ${hint}`,
        3.5,
      );
    }
  }

  world.season = seasonForDay(world.dayNumber);
  world.dayPhase = getDayPhase(world.timeOfDay, world.season);

  // Улирал солигдох — бэлчээр нэг удаа ургана
  if (state.phase === "playing" && world.season !== prevSeason) {
    world.pastureGrass = pastureRefillForSeason(world.season);
    world.pastureSeason = world.season;
    if (world.season === "winter") {
      const hay = state.player.inventory.hay + state.world.feeder.hay;
      setMessage(
        state,
        hay > 0
          ? "Өвөл ирлээ! Бэлчээр хөлдөв. Тэвш + гал бэлд."
          : "Өвөл ирлээ! Өвсгүй — мал өлсөх, чи даарах аюултай!",
        5,
      );
    } else if (world.season === "spring") {
      setMessage(
        state,
        `Хавар — бэлчээр ургалаа (${Math.floor(world.pastureGrass)}). Мал өснө · ямааны ноолуур энэ улиралд!`,
        4,
      );
    } else if (world.season === "summer") {
      setMessage(
        state,
        `Зун — бэлчээр дүүрэн (${Math.floor(world.pastureGrass)}). Хоньны ноос энэ улиралд · мал бэлчээрт идүүлъя!`,
        4,
      );
    } else if (world.season === "autumn") {
      setMessage(
        state,
        `Намар — бэлчээр ${Math.floor(world.pastureGrass)}. Өвс хадгал, гэр нүүхэд бэлд!`,
        4,
      );
    }
  } else if (
    state.phase === "playing" &&
    curDay < prevDay &&
    world.season === "autumn" &&
    dayInSeason(world.dayNumber) >= SEASON_DAYS - 1
  ) {
    setMessage(state, "Өвс хадгал! Өвөл ойртож байна.", 4);
  }

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
  const inWater =
    state.phase === "playing" && isInRiver(player.pos, player.radius * 0.2);

  // Гал асааж байхад тонгойно — хөдөлгөөнгүй
  if (world.campfire.placed && world.campfire.igniting > 0) {
    player.moving = false;
    // Гал руу харж тонгойх байрлалаа барина
    const toFire = {
      x: world.campfire.pos.x - player.pos.x,
      y: world.campfire.pos.y - player.pos.y,
    };
    if (Math.hypot(toFire.x, toFire.y) > 0.1) {
      player.facing = normalize(toFire);
    }
    clampPlayerToWorld(player, world.width, world.height);
    return;
  }

  // Dodge үед advanced combat өөрөө хөдөлгөнө
  if (state.combatDodgeActive) {
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
    if (state.phase === "playing") applyRiverCurrent(player.pos, dt, 0.85);
    clampPlayerToWorld(player, world.width, world.height);
    collidePlayerWithWorldPlants(state);
    collidePlayerWithGer(state);
    collidePlayerWithGates(state);
    return;
  }

  // Melee / parry үед хэвийн алхалт түгжинэ — урсгал үргэлжилнэ
  if (state.combatMovementLocked) {
    player.moving = false;
    if (state.phase === "playing") applyRiverCurrent(player.pos, dt, 1);
    clampPlayerToWorld(player, world.width, world.height);
    collidePlayerWithWorldPlants(state);
    collidePlayerWithGer(state);
    collidePlayerWithGates(state);
    return;
  }

  const dir: Vector2 = {
    x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    y: (input.down ? 1 : 0) - (input.up ? 1 : 0),
  };
  const n = normalize(dir);
  player.moving = n.x !== 0 || n.y !== 0;

  if (player.moving) {
    player.facing = n;
    let spd = player.speed * (player.riding ? 1.5 : 1);
    // Усанд арай удаан (гатлах газар бараг хэвийн)
    if (inWater) {
      spd *= isAtRiverFord(player.pos.y) ? 0.88 : 0.68;
    }
    player.pos.x += n.x * spd * dt;
    player.pos.y += n.y * spd * dt;
  }

  if (state.phase === "playing") applyRiverCurrent(player.pos, dt, 1);
  clampPlayerToWorld(player, world.width, world.height);
  collidePlayerWithWorldPlants(state);
  collidePlayerWithGer(state);
  collidePlayerWithGates(state);
}

/**
 * Trees use trunk-only collision and bushes use a slightly softer circle.
 * This blocks walking through sprite bases while preserving natural overlap.
 */
function collidePlayerWithWorldPlants(state: GameState): void {
  const { player, world } = state;
  const mountedPadding = player.riding ? 7 : 0;

  const obstacles = [
    ...world.trees
      .filter((tree) => tree.hp > 0)
      .map((tree) => ({ pos: tree.pos, radius: tree.radius })),
    ...world.bushes.map((bush) => ({
      pos: bush.pos,
      // Bush foliage is soft, so let the player stand slightly closer than a trunk.
      radius: Math.max(8, bush.radius - 4),
    })),
  ];

  for (const obstacle of obstacles) {
    const dx = player.pos.x - obstacle.pos.x;
    const dy = player.pos.y - obstacle.pos.y;
    const minDistance = obstacle.radius + player.radius + mountedPadding;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq >= minDistance * minDistance) continue;

    if (distanceSq < 0.0001) {
      player.pos.x = obstacle.pos.x + minDistance;
      continue;
    }
    const distance = Math.sqrt(distanceSq);
    const push = minDistance - distance;
    player.pos.x += (dx / distance) * push;
    player.pos.y += (dy / distance) * push;
  }

  clampPlayerToWorld(player, world.width, world.height);
}

/** Монгол гэр — хатуу; хаалганы өмнө ойртож болно, дундуур нэвтрэхгүй */
function collidePlayerWithGer(state: GameState): void {
  const { player, world } = state;
  if (world.gerPacked || state.phase !== "playing") return;
  const pad = player.radius + (player.riding ? 5 : 0);
  pushOutOfGer(player.pos, pad, world);
  clampPlayerToWorld(player, world.width, world.height);
}

function clampPlayerToWorld(
  player: Player,
  width: number,
  height: number,
): void {
  player.pos.x = clamp(player.pos.x, player.radius, width - player.radius);
  player.pos.y = clamp(player.pos.y, player.radius, height - player.radius);
}

/** Гэрийн зүүн тал — хоёр шонтой уяа (хаалгаас гадагш харахад зүүн) */
export function horseHitchRail(world: World): {
  left: Vector2;
  right: Vector2;
  /** Морь уягдах цэг (уяаны урд) */
  tie: Vector2;
} {
  const c = pastureCenter(world);
  // drawGer(c.x) — бор хөрсөн дээр голлуулсан; зүүн тал = +X
  const gerX = c.x;
  const midX = gerX + 130;
  const midY = c.y + 44;
  const half = 42;
  return {
    left: { x: midX - half, y: midY + 3 },
    right: { x: midX + half, y: midY },
    tie: { x: midX + 4, y: midY + 22 },
  };
}

/** Морь уягдах байрлал */
export function horseHitchPos(world: World): Vector2 {
  return horseHitchRail(world).tie;
}

export function nearMountHorse(
  state: GameState,
  radius = 52,
): MountHorse | null {
  const h = state.world.mountHorse;
  if (!h) return null;
  return dist(state.player.pos, h.pos) < radius ? h : null;
}

/** Морьноос бууж гадаа үлдээх / уях */
export function dismountHorse(
  state: GameState,
  opts?: { tie?: boolean },
): void {
  const player = state.player;
  if (!player.gear.horse || !player.riding || player.horseHp <= 0) return;

  const nearGer =
    !state.world.gerPacked &&
    (dist(player.pos, gerDoorPos(state.world)) < 110 ||
      dist(player.pos, horseHitchPos(state.world)) < 85);
  const tie = opts?.tie ?? nearGer;
  const hitch = horseHitchPos(state.world);
  // Уясан үед гэр рүү (зүүнээс баруун тийш / гэр рүү) харна
  const face: 1 | -1 = tie
    ? -1
    : player.facing.x < 0
      ? -1
      : 1;
  const pos = tie
    ? hitch
    : { x: player.pos.x + face * 18, y: player.pos.y + 6 };

  player.riding = false;
  state.world.mountHorse = { pos, face, tied: tie };
  sfx("select");
  if (tie) {
    spawnText(state, pos, "Морь уялаа", "#c8e0ff");
    setMessage(state, "Морьноос бууж уяан дээр уялаа. H — дахин унах.", 2.8);
  } else {
    spawnText(state, pos, "Буулаа", "#e8c56a");
    setMessage(state, "Морьноос буулаа. Гэрийн уяан дэргэд бууваас уягдана.", 2.8);
  }
}

/** Гэрт орохдоо морийг гадаа уяна */
export function hitchHorseOutside(state: GameState): void {
  const player = state.player;
  if (!player.gear.horse || player.horseHp <= 0) return;
  if (player.riding) {
    dismountHorse(state, { tie: true });
    return;
  }
  const h = state.world.mountHorse;
  if (!h) return;
  h.pos = horseHitchPos(state.world);
  h.face = -1;
  h.tied = true;
}

/** H — унах / буух */
export function tryHorseMount(state: GameState): void {
  if (!state.input.horseMount) return;
  if (state.phase !== "playing") {
    state.input.horseMount = false;
    return;
  }

  const player = state.player;
  state.input.horseMount = false;

  if (!player.gear.horse) {
    setMessage(state, "Унах морь алга — авдраас ав.", 2);
    return;
  }
  if (player.horseHp <= 0) {
    setMessage(state, "Морь үхсэн — дэлгүүрээс шинээр ав.", 2.5);
    return;
  }
  if (state.world.gerPacked && player.riding) {
    setMessage(state, "Гэр моринд ачсан — эхлээд G-ээр буулга.", 2.5);
    return;
  }

  if (player.riding) {
    dismountHorse(state);
    return;
  }

  const horse = nearMountHorse(state, 56);
  if (!horse) {
    setMessage(state, "Морь ойрхон байх ёстой — гадаа уясан морь руу оч.", 2.5);
    return;
  }

  player.riding = true;
  player.facing = { x: horse.face, y: 0 };
  state.world.mountHorse = null;
  sfx("select");
  spawnText(state, player.pos, "Уналаа", "#e8c56a");
  setMessage(state, "Морь уналаа. H — буух (гэрийн дэргэд уягдана).", 2.5);
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

export function nearestGatherableStone(
  player: Player,
  stones: WorldStone[],
): WorldStone | null {
  let best: WorldStone | null = null;
  let bestD = Infinity;
  for (const stone of stones) {
    if (stone.amount <= 0) continue;
    const d = dist(player.pos, stone.pos);
    if (d < bestD) {
      bestD = d;
      best = stone;
    }
  }
  return bestD < player.radius + 34 ? best : null;
}

export function tryInteract(state: GameState): void {
  const { player, world } = state;
  if (player.chopCooldown > 0 || !state.input.interact) return;

  // Гэрийн дэргэд — гэрт орно (хураагаагүй үед)
  const center = pastureCenter(world);
  const gerPos = gerDoorPos(world);
  if (!world.gerPacked && dist(player.pos, gerPos) < 62) {
    if (
      state.story.firstNightStage === "protecting" ||
      state.story.firstNightStage === "elderIntervention" ||
      state.story.firstNightStage === "elderApproach"
    ) {
      state.input.interact = false;
      return;
    }
    hitchHorseOutside(state);
    state.phase = "ger";
    state.shopOpen = false;
    state.craftOpen = false;
    state.menuIndex = 0;
    state.gerPlayer = { x: 480, y: 435 };
    state.input.interact = false;
    sfx("select");
    return;
  }

  if (tryCallOpeningLivestock(state)) {
    player.chopCooldown = 0.35;
    state.input.interact = false;
    return;
  }

  if (tryInspectStormTrace(state)) {
    player.chopCooldown = 0.35;
    return;
  }

  // Өвгөн — арилжаа / яриа
  if (
    nearElder(state) &&
    state.story.activeMainObjective === "talkToOldMan"
  ) {
    beginPostWolfElderDialogue(state);
    player.chopCooldown = 0.35;
    state.input.interact = false;
    return;
  }

  if (
    nearElder(state) &&
    state.story.activeMainObjective === "returnToOldManWithTrace"
  ) {
    beginStormTraceElderDialogue(state);
    player.chopCooldown = 0.35;
    state.input.interact = false;
    return;
  }

  if (
    nearElder(state) &&
    state.story.activeMainObjective === "visitOldManAtDawn"
  ) {
    if (world.dayPhase === "dawn" || world.dayPhase === "day") {
      beginDawnElderDialogue(state);
    } else {
      setMessage(state, "Өвгөн: «Үүрийн гэгээ ортол голомтоо түшиж амар, хүү минь.»", 3);
    }
    player.chopCooldown = 0.35;
    state.input.interact = false;
    return;
  }

  if (nearElder(state) && !state.story.activeMainObjective) {
    openElder(state);
    player.chopCooldown = 0.35;
    state.input.interact = false;
    return;
  }

  // Оньсогын асуулт (мод / бут / чулуу)
  const riddleHost = nearestRiddleHost(
    player.pos,
    world,
    player.radius + 28,
  );
  if (riddleHost) {
    if (riddleHost.solved) {
      setMessage(
        state,
        `${spotKindLabel(riddleHost.kind)} — асуулт аль хэдийн хариулагдсан.`,
        2,
      );
    } else {
      openRiddleAtHost(state, riddleHost);
    }
    player.chopCooldown = 0.3;
    state.input.interact = false;
    return;
  }

  // Уургаар зэрлэг морь барих
  if (player.gear.urga) {
    let nearWild = false;
    for (const h of world.wildHorses) {
      if (dist(player.pos, h.pos) < 62) {
        nearWild = true;
        break;
      }
    }
    if (nearWild) {
      tryCatchWildHorse(state);
      player.chopCooldown = 0.55;
      state.input.interact = false;
      return;
    }
  }

  // Загасны уурга — голоос загас барих
  if (player.gear.fishingRod && nearFishingSpot(player.pos)) {
    tryCatchFish(state);
    player.chopCooldown = 0.7;
    state.input.interact = false;
    return;
  }

  // Бэлэн бүтээгдэхүүн цуглуулах
  const ready = nearestReadyAnimal(player.pos, world.flock.visuals, 42);
  if (ready) {
    collectProduct(state, ready);
    player.chopCooldown = 0.3;
    state.input.interact = false;
    return;
  }

  // Мал гаргах/оруулах — хашааны хаалга
  if (tryToggleFlockPen(state)) {
    player.chopCooldown = 0.35;
    state.input.interact = false;
    return;
  }

  // Тэвшид зөвхөн өвс хийх
  const feeder = world.feeder;
  if (dist(player.pos, feeder.pos) < feeder.radius + player.radius + 18) {
    depositHayToFeeder(state, 5);
    player.chopCooldown = 0.35;
    state.input.interact = false;
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

  const stone = nearestGatherableStone(player, world.stones);
  if (stone) {
    stone.amount -= 1;
    player.inventory.stone += 1;
    player.chopCooldown = 0.4;
    state.score += 1;
    gainXp(state, 1);
    sfx("chop");
    spawnParticles(state, stone.pos, 6, "#9a9488", { speed: 70, size: 2.8 });
    spawnText(state, stone.pos, "+1 чулуу", "#c8c0b0");
    if (stone.amount <= 0) {
      stone.respawnIn = 22 + Math.random() * 16;
    }
    return;
  }

  // Бэлчээрээс өвс хадах (зун / намар / хавар)
  const nearPasture =
    dist(player.pos, center) < HAY_HARVEST_RADIUS &&
    dist(player.pos, gerPos) >= 62;
  if (nearPasture) {
    if (!canHarvestHay(world.season)) {
      setMessage(state, "Өвөл бэлчээр хөлдсөн — өвс хадахгүй.", 2);
      state.input.interact = false;
      return;
    }
    if (player.inventory.hay >= MAX_HAY) {
      setMessage(state, `Өвс дүүрэн (${MAX_HAY}).`, 1.5);
      state.input.interact = false;
      return;
    }
    if (world.pastureGrass < HAY_GRASS_COST) {
      setMessage(
        state,
        world.pastureGrass <= 0
          ? "Бэлчээр хоосон! G-ээр нүүж шинэ бэлчээр ол, эсвэл улирал хүлээ."
          : "Бэлчээрийн өвс бага.",
        2.5,
      );
      state.input.interact = false;
      return;
    }

    world.pastureGrass -= HAY_GRASS_COST;
    const gained = world.season === "spring" ? 1 : 1 + (Math.random() < 0.35 ? 1 : 0);
    const add = Math.min(gained, MAX_HAY - player.inventory.hay);
    player.inventory.hay += add;
    player.chopCooldown = 0.4;
    state.score += add;
    gainXp(state, 1);
    sfx("chop");
    spawnParticles(
      state,
      { x: player.pos.x, y: player.pos.y - 4 },
      7,
      "#7a9a45",
      { speed: 55, size: 2.2 },
    );
    return;
  }

  const tree = nearestAliveTree(player, world.trees);
  if (!tree) {
    setMessage(state, "Ойрхон мод/жимс/чулуу/бэлчээр алга.", 1.5);
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

  // Жимс → загас → ааруул
  if (player.inventory.berries > 0) {
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
      { speed: 40, gravity: -20, size: 2 },
    );
    spawnText(state, player.pos, "+28 хоол", "#ffd080");
    return;
  }

  if (player.inventory.fish > 0) {
    player.inventory.fish -= 1;
    player.vitals.hunger = clamp(
      player.vitals.hunger + 36,
      0,
      player.vitals.maxHunger,
    );
    player.vitals.health = clamp(
      player.vitals.health + 6,
      0,
      player.vitals.maxHealth,
    );
    player.eatCooldown = 0.55;
    state.input.eat = false;
    sfx("eat");
    spawnParticles(
      state,
      { x: player.pos.x, y: player.pos.y - 16 },
      5,
      "#6ab0e8",
      { speed: 40, gravity: -20, size: 2 },
    );
    spawnText(state, player.pos, "+36 хоол", "#7ec8ff");
    return;
  }

  if (player.inventory.aaruul > 0) {
    player.inventory.aaruul -= 1;
    player.vitals.hunger = clamp(
      player.vitals.hunger + 40,
      0,
      player.vitals.maxHunger,
    );
    player.vitals.warmth = clamp(
      player.vitals.warmth + 8,
      0,
      player.vitals.maxWarmth,
    );
    player.eatCooldown = 0.5;
    state.input.eat = false;
    sfx("eat");
    spawnText(state, player.pos, "+ааруул", "#f0e0b0");
    return;
  }

  setMessage(state, "Хоол алга. Жимс · загас · ааруул цуглуул.", 2.5);
  state.input.eat = false;
}

export function tryLightCampfire(state: GameState): void {
  if (!state.input.lightFire) return;
  state.input.lightFire = false;

  if (state.phase !== "playing" && state.phase !== "spirit") return;

  const { player, world } = state;
  const fire = world.campfire;

  if (fire.placed && fire.igniting > 0) {
    setMessage(state, "Гал асааж байна…", 1.2);
    return;
  }

  if (!state.unlimitedWood && player.inventory.wood < CAMPFIRE_WOOD_COST) {
    setMessage(state, `Галд ${CAMPFIRE_WOOD_COST} түлээ хэрэгтэй.`, 2);
    return;
  }

  const near =
    fire.placed && dist(player.pos, fire.pos) < fire.radius + player.radius;

  if (!state.unlimitedWood) player.inventory.wood -= CAMPFIRE_WOOD_COST;

  if (near && fire.lit) {
    // Аль хэдийн ассан галд түлээ нэмнэ
    fire.fuel = Math.max(fire.fuel, 0) + 18;
    sfx("fire");
    spawnParticles(state, fire.pos, 10, "#ffb347", { speed: 60, gravity: -35 });
    setMessage(state, "Түлээ нэмлээ.", 2);
    return;
  }

  // Шинэ гал — тонгойж чулуу цохино
  if (player.riding) {
    dismountHorse(state, { tie: false });
  }

  // Гал дүрийн өмнө, малчин араас тонгойно
  const faceX = player.facing.x < 0 ? -1 : 1;
  fire.pos = {
    x: player.pos.x + faceX * 6,
    y: player.pos.y + 20,
  };
  player.pos = {
    x: fire.pos.x - faceX * 4,
    y: fire.pos.y - 18,
  };
  player.facing = { x: faceX * 0.35, y: 1 };
  player.moving = false;

  fire.placed = true;
  fire.lit = false;
  fire.fuel = 18;
  fire.igniting = CAMPFIRE_IGNITE_SEC;
  sfx("fire");
  spawnParticles(state, fire.pos, 8, "#c8a070", { speed: 40, gravity: -20 });
  setMessage(state, "Тонгойж чулуу цохиж гал асааж байна…", 2.5);
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

export function tryDemolishFence(state: GameState): boolean {
  const { player, world } = state;
  const fence = nearestFence(player.pos, world.fences, 40);
  if (!fence) return false;

  const idx = world.fences.indexOf(fence);
  if (idx < 0) return false;
  const wasGate = fence.isGate;
  world.fences.splice(idx, 1);

  const refund = Math.max(1, Math.floor(FENCE_COST * (0.5 + fence.tier * 0.25)));
  if (!state.unlimitedWood) {
    player.inventory.wood += refund;
  }
  sfx("chop");
  spawnParticles(state, fence.pos, 10, "#8a6a3a", { speed: 80, size: 2.4 });
  spawnText(
    state,
    fence.pos,
    state.unlimitedWood ? "Нураав" : `+${refund} мод`,
    "#e8c56a",
  );
  setMessage(state, wasGate ? "Хаалга нурлаа." : "Хашаа нурлаа.", 1.6);
  return true;
}

/** Хашаа preview — чиглэл тоглогчийн харсан зүгээс (сумнаар солихгүй) */
export function updateFencePreviewAim(state: GameState): void {
  state.fencePreviewAngle = angleFromOrient(
    fenceOrientFromFacing(state.player.facing),
  );
  state.fencePreviewOffset = { x: 0, y: 0 };
}

export function tryBuildFence(state: GameState): void {
  if (!state.input.buildFence) return;
  state.input.buildFence = false;

  const { player, world } = state;
  if (player.chopCooldown > 0) return;

  // Эхний B — preview; дараагийн B бүр — барих (preview нээлттэй үлдэнэ)
  if (!state.fencePreview) {
    state.fencePreview = true;
    state.fencePreviewAngle = angleFromOrient(
      fenceOrientFromFacing(player.facing),
    );
    state.fencePreviewOffset = { x: 0, y: 0 };
    setMessage(state, "Харсан зүгт барина · B дахин · P цуцлах", 3);
    return;
  }

  const orient = fenceOrientFromFacing(player.facing);
  const angle = angleFromOrient(orient);
  state.fencePreviewAngle = angle;
  const pos = fencePlacePos(
    player.pos,
    player.facing,
    FENCE_GRID,
    { x: 0, y: 0 },
    angle,
    world.fences,
  );

  const existing = world.fences.find((f) => fencesOverlap(pos, f.pos));
  if (existing) {
    tryUpgradeFence(state, existing);
    return;
  }

  const overlapNear = world.fences.find(
    (f) =>
      anglesNearlyEqual(fenceAngle(f), angle) &&
      dist(f.pos, pos) < FENCE_GRID * 0.35,
  );
  if (overlapNear) {
    tryUpgradeFence(state, overlapNear);
    return;
  }

  if (!state.unlimitedWood && player.inventory.wood < FENCE_COST) {
    setMessage(state, `Модон хашаанд ${FENCE_COST} мод хэрэгтэй.`, 2);
    return;
  }

  const gerPos = gerDoorPos(world);

  if (!world.gerPacked && dist(pos, gerPos) < 78) {
    setMessage(state, "Гэрийн дэргэд хашаа барихгүй.", 2);
    return;
  }
  if (world.campfire.placed && dist(pos, world.campfire.pos) < 40) {
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
  player.chopCooldown = 0.22;
  const isGate = wouldCloseFenceLoop(pos, angle, world.fences);
  world.fences.push({
    id: allocId(state),
    pos,
    radius: FENCE_RADIUS,
    angle,
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
  spawnParticles(state, pos, 8, "#8a6a3a", { speed: 70, life: 2.5 });
  if (!state.unlimitedWood) {
    spawnText(state, pos, `−${FENCE_COST} мод`, "#e8c56a");
  }
  if (isGate) {
    setMessage(state, "Хаалга босголоо — түлхэж нээнэ.", 2);
  }
  // Preview нээлттэй — дараагийн B-ээр эгнээг үргэлжлүүлнэ
}

/** Чононд хохирол өгөх — цохилт, сум, нохойн хазалт бүгд эндээс */

export function updateSurvival(state: GameState, dt: number): void {
  const { player, world } = state;
  // Уясан морь — уяаны байрлалтай нийцүүлнэ
  if (world.mountHorse?.tied && !player.riding && !world.gerPacked) {
    world.mountHorse.pos = horseHitchPos(world);
    world.mountHorse.face = -1;
  }
  const fire = world.campfire;
  const openingHearthProtected =
    world.dayNumber === 1 &&
    state.story.campfireRelit &&
    !state.story.firstNightNormalTimeRestored;
  const storyHealthFloor = state.story.temporaryPlayerProtectionActive
    ? Math.min(12, player.vitals.maxHealth)
    : 0;

  if (fire.placed && fire.igniting > 0) {
    fire.igniting = Math.max(0, fire.igniting - dt);
    if (fire.igniting <= 0) {
      fire.igniting = 0;
      fire.lit = true;
      sfx("fire");
      spawnParticles(state, fire.pos, 16, "#ffb347", {
        speed: 80,
        gravity: -45,
      });
      setMessage(state, "Гал асаалаа.", 2);
    }
  } else if (fire.lit && !openingHearthProtected) {
    fire.fuel -= dt;
    if (fire.fuel <= 0) {
      fire.lit = false;
      fire.fuel = 0;
      fire.placed = false;
      fire.igniting = 0;
    }
  }

  if (state.godMode) {
    player.vitals.health = player.vitals.maxHealth;
  }

  const nearFire =
    fire.lit && fire.placed && dist(player.pos, fire.pos) < fire.radius;
  const night =
    world.dayPhase === "night" ||
    world.timeOfDay < 6 ||
    world.timeOfDay > 20;
  const coldWeather =
    world.weather === "snow" ||
    world.weather === "storm" ||
    world.season === "winter";

  const seasonCold = seasonWarmthMult(world.season);
  let warmthDelta = 0;
  if (night || coldWeather || world.season === "winter") {
    warmthDelta = -2.5 * dt * player.warmthResist * seasonCold;
    if (coldWeather && night) warmthDelta -= 1.5 * dt * player.warmthResist;
    if (world.dayPhase === "dawn" && !nearFire) {
      warmthDelta -= 0.8 * dt * player.warmthResist;
    }
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
    if (!state.godMode) {
      player.vitals.health = clamp(
        player.vitals.health - 3 * dt,
        storyHealthFloor,
        player.vitals.maxHealth,
      );
      if (
        !state.story.temporaryPlayerProtectionActive &&
        player.vitals.health <= 0
      ) {
        handlePlayerDeath(state, "Хүйтэнд нэрвэгдлээ…");
      }
    }
  }

  player.vitals.hunger = clamp(
    player.vitals.hunger - 0.7 * dt,
    0,
    player.vitals.maxHunger,
  );
  if (player.vitals.hunger <= 0) {
    if (!state.godMode) {
      player.vitals.health = clamp(
        player.vitals.health - 5 * dt,
        storyHealthFloor,
        player.vitals.maxHealth,
      );
      if (
        !state.story.temporaryPlayerProtectionActive &&
        player.vitals.health <= 0
      ) {
        handlePlayerDeath(state, "Өлсөж үхлээ…");
      }
    }
  }

  updatePastureAndFlockFeed(state, dt);
  updateNewborns(state, dt);
  if (!state.story.activeMainObjective) {
    updateOutdoorNightRisk(state, dt);
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
    bush.respawnIn -= dt / seasonBerryRespawnMult(world.season);
    if (bush.respawnIn <= 0) {
      bush.berries = bush.maxBerries;
      bush.respawnIn = 0;
    }
  }

  for (const stone of world.stones) {
    if (stone.amount > 0) continue;
    stone.respawnIn -= dt;
    if (stone.respawnIn <= 0) {
      stone.amount = stone.maxAmount;
      stone.respawnIn = 0;
    }
  }

  if (player.chopCooldown > 0) player.chopCooldown -= dt;
  if (player.eatCooldown > 0) player.eatCooldown -= dt;
  // attackCooldown / attackAnim / invuln — updateCombat (playing+spirit)
  if (player.sleepCooldown > 0) player.sleepCooldown -= dt;
}

/** Бэлчээр — мал идэж дуусгана; улиралд нэг удаа ургана (continuous growth байхгүй) */
function updatePastureAndFlockFeed(state: GameState, dt: number): void {
  const { world } = state;
  const flock = world.flock;
  if (flock.total <= 0 || state.phase !== "playing") return;

  const feeder = world.feeder;
  const needPerSec =
    (flock.total * HAY_PER_SHEEP_PER_DAY) / DAY_LENGTH_SEC;
  const grazePerSec =
    (flock.total * GRAZE_PER_ANIMAL_PER_DAY) / DAY_LENGTH_SEC;

  if (world.season === "winter") {
    // Өвөл бэлчээр хөлдөнө — зөвхөн тэвш
    world.pastureGrass = 0;
    const hadHay = feeder.hay > 0;
    const feed = Math.min(feeder.hay, needPerSec * dt);
    feeder.hay = Math.max(0, feeder.hay - feed);

    if (feed >= needPerSec * dt * 0.95 && needPerSec > 0) {
      flock.hunger = clamp(flock.hunger + 8 * dt, 0, 100);
      flock.starveAcc = 0;
    } else if (feeder.hay <= 0) {
      if (hadHay && feed > 0) {
        setMessage(state, "Тэвш хоосон — мал өлсөж байна!", 4);
      }
      flock.hunger = clamp(flock.hunger - 4.5 * dt, 0, 100);
      if (flock.hunger < 35) {
        flock.starveAcc += dt;
        const interval = clamp(14 - flock.total * 0.02, 6, 14);
        if (flock.starveAcc >= interval) {
          flock.starveAcc = 0;
          const lost = loseSheep(state, 1);
          if (lost > 0) {
            spawnText(
              state,
              pastureCenter(world),
              "−1 мал (өлсгөлөн)",
              "#ff9080",
            );
            sfx("baa");
            setMessage(state, "Мал өлсөж үхэж байна! Тэвшид өвс хий!", 3.5);
          }
        }
      }
    } else {
      flock.hunger = clamp(flock.hunger - 1.2 * dt, 0, 100);
    }
    return;
  }

  // Зун/намар/хавар — мал бэлчээрт өөрөө иднэ
  if (world.flockOut && grazePerSec > 0) {
    if (world.pastureGrass > 0.05) {
      const ate = Math.min(world.pastureGrass, grazePerSec * dt);
      world.pastureGrass = Math.max(0, world.pastureGrass - ate);
      const ratio = ate / (grazePerSec * dt);
      flock.hunger = clamp(flock.hunger + 7 * ratio * dt, 0, 100);
      if (world.pastureGrass <= 0.05 && world.pastureGrass > 0) {
        world.pastureGrass = 0;
        setMessage(
          state,
          "Бэлчээрийн өвс дууслаа! Гэрээ хурааж (G) шинэ бэлчээр рүү нүү, эсвэл тэвш ашигла.",
          5,
        );
        sfx("alert");
      }
      flock.starveAcc = 0;
    } else {
      // Өвсгүй бэлчээр — тэвш эсвэл өлсөнө
      if (feeder.hay > 0) {
        const snack = Math.min(feeder.hay, needPerSec * dt);
        feeder.hay -= snack;
        flock.hunger = clamp(flock.hunger + 5 * dt, 0, 100);
        flock.starveAcc = 0;
      } else {
        flock.hunger = clamp(flock.hunger - 3.5 * dt, 0, 100);
        flock.starveAcc += dt;
        if (flock.starveAcc >= 12 && flock.hunger < 40) {
          flock.starveAcc = 0;
          const lost = loseSheep(state, 1);
          if (lost > 0) {
            spawnText(state, pastureCenter(world), "−1 мал (өвсгүй)", "#ff9080");
            setMessage(
              state,
              "Өвс дууссан — мал өлсөж байна! G-ээр нүү эсвэл өвс өг.",
              3.5,
            );
          }
        }
      }
    }
  } else {
    // Хашаанд — тэвшээс бага зэрэг, бэлчээр идэхгүй
    if (feeder.hay > 0) {
      const snack = Math.min(feeder.hay, needPerSec * 0.5 * dt);
      feeder.hay -= snack;
      flock.hunger = clamp(flock.hunger + 4 * dt, 0, 100);
    } else {
      flock.hunger = clamp(flock.hunger - 0.8 * dt, 0, 100);
    }
    flock.starveAcc = 0;
  }
}

/** G — гэр хураах / шинэ газар буулгах */
export function tryMigrateGer(state: GameState): void {
  if (!state.input.migrate || state.phase !== "playing") return;
  state.input.migrate = false;

  const { player, world } = state;
  if (world.gerPacked) {
    // Буулгах — шинэ бууц
    const pos = {
      x: clamp(player.pos.x, 120, world.width - 120),
      y: clamp(player.pos.y, 120, world.height - 120),
    };
    world.campPos = { ...pos };
    world.gerPacked = false;
    world.feeder.pos = { x: pos.x - 70, y: pos.y + 48 };
    // Шинэ бэлчээр — улирлын дагуу өвс
    if (world.season !== "winter") {
      world.pastureGrass = pastureRefillForSeason(world.season);
      world.pastureSeason = world.season;
    } else {
      world.pastureGrass = 0;
    }
    // Шинэ бууцанд жижиг хашаа
    world.fences = createStarterPen(pos, () => allocId(state));
    // Мал хашаан дотор
    pullFlockToPen(state, 1);
    for (const a of world.flock.visuals) {
      a.vel.x = 0;
      a.vel.y = 0;
    }
    world.flockOut = false;
    sfx("buy");
    spawnParticles(state, pos, 20, "#e8c56a", { speed: 100, size: 3 });
    spawnText(state, pos, "Гэр буулаа!", "#ffe9a0");
    setMessage(
      state,
      world.season === "winter"
        ? "Шинэ бууц! Өвөл — тэвш бэлд."
        : `Шинэ бэлчээр! Өвс ${Math.floor(world.pastureGrass)}. Хашаа бэлэн.`,
      4.5,
    );
    return;
  }

  // Хураах — морьтой + мал хашаандаа
  if (!player.gear.horse || player.horseHp <= 0) {
    setMessage(
      state,
      "Нүүдэлд унах морь хэрэгтэй! Авдраас морь авч, гэрээ моринд ачна.",
      3.5,
    );
    return;
  }
  if (!player.riding) {
    setMessage(state, "Эхлээд H-ээр морь уна, дараа нь G дарж гэр ачна.", 2.8);
    return;
  }
  if (world.flockOut) {
    setMessage(state, "Эхлээд малыг хашаанд оруул (хаалганаас E), дараа нь G.", 3);
    return;
  }
  const ger = gerDoorPos(world);
  if (dist(player.pos, ger) > 90) {
    setMessage(state, "Гэрийнхээ дэргэд зогсоод G дар — моринд ачна.", 2.5);
    return;
  }

  world.gerPacked = true;
  world.campfire.lit = false;
  world.campfire.fuel = 0;
  world.campfire.placed = false;
  world.campfire.igniting = 0;
  world.fences = [];
  sfx("select");
  spawnText(state, player.pos, "Гэр → морь", "#e8c56a");
  setMessage(
    state,
    "Гэрийг моринд ачлаа. Шинэ бэлчээр олоод G дарж буулга.",
    4.5,
  );
}

// ---------------------------------------------------------------------------
// Меню логик
// ---------------------------------------------------------------------------
