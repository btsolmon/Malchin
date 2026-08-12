// 5 хошуу мал — тоолол, бүтээгдэхүүн, тэвш, уурга

import {
  LIVESTOCK_KINDS,
  MAX_FEEDER_HAY,
  MAX_VISUAL_SHEEP,
  HERD_VICTORY_COUNT,
  PASTURE_RADIUS,
  PRODUCE_INTERVAL,
  WORLD_H,
  WORLD_W,
  type Feeder,
  type GameState,
  type HerdAnimal,
  type LivestockKind,
  type Vector2,
  type WildHorse,
} from "./types";
import {
  allocId,
  animalIsOut,
  clamp,
  dist,
  normalize,
  pastureCenter,
  penCenterFor,
  penForLivestock,
  penRadiusFor,
  pushOutOfFences,
  pushOutOfGer,
  pushOutOfUrtz,
  randRange,
  setMessage,
} from "./utils";
import { spawnParticles, spawnText } from "./effects";
import { sfx } from "./audio";
import { trFormat } from "./i18n";

export function emptyCounts(): Record<LivestockKind, number> {
  return { sheep: 0, goat: 0, cattle: 0, horse: 0, camel: 0 };
}

export function recountTotal(counts: Record<LivestockKind, number>): number {
  let t = 0;
  for (const k of LIVESTOCK_KINDS) t += counts[k];
  return t;
}

/** Хулгайчид авч явж буй мал — баривал буцаана */
export function stolenLivestockInTransit(state: GameState): number {
  let held = 0;
  for (const t of state.world.thieves) {
    if (t.alive && t.stolen > 0) held += t.stolen;
  }
  return held;
}

/**
 * Сүрэг хоосорсон эсэхийг шалгана.
 * Хулгайч мал авч зугтаж байгаа үед (барих боломжтой) тоглоом дуусахгүй.
 */
export function checkFlockDefeat(state: GameState): void {
  if (state.phase !== "playing") return;
  if (state.world.flock.total > 0) return;
  if (stolenLivestockInTransit(state) > 0) return;
  state.phase = "lost";
  setMessage(state, "Бүх мал үгүй болов… Ялагдлаа.", 99);
}

/** Сүрэг 1000 толгойд хүрсэн — том ялалтын дэлгэц */
export function checkHerdVictory(state: GameState): void {
  if (state.phase !== "playing") return;
  if (state.herdVictoryShown) return;
  if (state.world.flock.total < HERD_VICTORY_COUNT) return;

  state.herdVictoryShown = true;
  state.winReason = "herd";
  state.phase = "won";
  if (state.story.activeMainObjective === "growFlock") {
    state.story.activeMainObjective = null;
  }
  setMessage(state, "Сүргээ 1000 толгойд хүргэлээ!", 99);
  sfx("win");
}

export function syncFlockTotal(flock: {
  counts: Record<LivestockKind, number>;
  total: number;
}): void {
  flock.total = recountTotal(flock.counts);
}

export function createHerdAnimal(
  id: number,
  around: Vector2,
  kind: LivestockKind,
  spread = PASTURE_RADIUS * 0.7,
): HerdAnimal {
  const ang = Math.random() * Math.PI * 2;
  const r = randRange(8, Math.max(12, spread));
  const scale =
    kind === "camel"
      ? 1.35
      : kind === "cattle"
        ? 1.55
        : kind === "horse"
          ? 1.15
          : 1;
  return {
    id,
    kind,
    pos: {
      x: around.x + Math.cos(ang) * r,
      y: around.y + Math.sin(ang) * r,
    },
    vel: { x: 0, y: 0 },
    radius: 9 * scale,
    grazeSeed: Math.random() * 10,
    hp: 3,
    flash: 0,
    face: 1,
    produceIn: PRODUCE_INTERVAL[kind] * (0.4 + Math.random() * 0.6),
    produceReady: false,
    newborn: false,
    newbornWarmth: 100,
  };
}

/** Төрөл бүрийн харьцаагаар дүрслэлийн слот хуваарилна — байгаа төрөл бүрт ≥1 */
function allocateVisualSlots(
  counts: Record<LivestockKind, number>,
  total: number,
  want: number,
): Record<LivestockKind, number> {
  const slots = emptyCounts();
  const present = LIVESTOCK_KINDS.filter((k) => counts[k] > 0);
  if (present.length === 0 || want <= 0 || total <= 0) return slots;

  const quotas = present.map((k) => ({
    k,
    exact: (counts[k] / total) * want,
  }));

  let assigned = 0;
  // Эхлээд floor, гэхдээ төрөл бүрт дор хаяж 1
  for (const q of quotas) {
    slots[q.k] = Math.min(counts[q.k], Math.max(1, Math.floor(q.exact)));
    assigned += slots[q.k];
  }

  // want-аас хэтэрвэл — хамгийн ихээс нь хасна (1-ээс доош буулгахгүй)
  while (assigned > want) {
    let best: LivestockKind | null = null;
    let bestN = 1;
    for (const k of present) {
      if (slots[k] > bestN) {
        bestN = slots[k];
        best = k;
      }
    }
    if (!best) break;
    slots[best] -= 1;
    assigned -= 1;
  }

  // Үлдсэн слотыг largest remainder-аар нэмнэ
  while (assigned < want) {
    let best: LivestockKind | null = null;
    let bestRem = -Infinity;
    for (const q of quotas) {
      if (slots[q.k] >= counts[q.k]) continue;
      const rem = q.exact - slots[q.k];
      if (rem > bestRem) {
        bestRem = rem;
        best = q.k;
      }
    }
    if (!best) break;
    slots[best] += 1;
    assigned += 1;
  }

  return slots;
}

/** Төрөл бүрийн харьцаагаар дүрслэл синк — бүх байгаа төрөл харагдана */
export function syncVisualFlock(state: GameState): void {
  const { flock } = state.world;
  syncFlockTotal(flock);
  const want = Math.min(MAX_VISUAL_SHEEP, flock.total);
  const target = allocateVisualSlots(flock.counts, flock.total, want);

  const have = emptyCounts();
  for (const v of flock.visuals) have[v.kind]++;

  // Илүүдийг хасна — зорилтот хэмжээнээс хэтэрсэн төрлүүд
  for (let i = flock.visuals.length - 1; i >= 0; i--) {
    const v = flock.visuals[i]!;
    if (have[v.kind] > target[v.kind] || have[v.kind] > flock.counts[v.kind]) {
      flock.visuals.splice(i, 1);
      have[v.kind]--;
    }
  }

  // Дутууг нэмнэ — өөрийн хашаа/бэлчээрт
  for (const k of LIVESTOCK_KINDS) {
    while (have[k] < target[k]) {
      const out = animalIsOut(state.world, k);
      const pen = penForLivestock(k);
      const center = out
        ? pastureCenter(state.world)
        : penCenterFor(state.world, pen);
      const spread = out
        ? PASTURE_RADIUS * 0.7
        : penRadiusFor(pen) * 0.75;
      flock.visuals.push(createHerdAnimal(allocId(state), center, k, spread));
      have[k]++;
    }
  }
}

export function addLivestock(
  state: GameState,
  kind: LivestockKind,
  n: number,
): void {
  if (n <= 0) return;
  state.world.flock.counts[kind] += n;
  syncVisualFlock(state);
  checkHerdVictory(state);
}

export function loseLivestock(
  state: GameState,
  n: number,
  opts?: { skipDefeatCheck?: boolean },
): number {
  const flock = state.world.flock;
  let remaining = Math.min(n, flock.total);
  let lost = 0;
  while (remaining > 0 && flock.total > 0) {
    // Жинлэгдсэн санамсаргүй төрөл
    let roll = Math.random() * flock.total;
    let kind: LivestockKind = "sheep";
    for (const k of LIVESTOCK_KINDS) {
      roll -= flock.counts[k];
      if (roll <= 0) {
        kind = k;
        break;
      }
    }
    if (flock.counts[kind] <= 0) {
      // fallback
      kind = LIVESTOCK_KINDS.find((k) => flock.counts[k] > 0) ?? "sheep";
    }
    if (flock.counts[kind] <= 0) break;
    flock.counts[kind] -= 1;
    lost += 1;
    remaining -= 1;
    syncFlockTotal(flock);
  }
  syncVisualFlock(state);
  if (!opts?.skipDefeatCheck) checkFlockDefeat(state);
  return lost;
}

export function killHerdVisual(state: GameState, animal: HerdAnimal): void {
  const flock = state.world.flock;
  if (flock.counts[animal.kind] > 0) flock.counts[animal.kind] -= 1;
  const i = flock.visuals.indexOf(animal);
  if (i >= 0) flock.visuals.splice(i, 1);
  syncVisualFlock(state);
  checkFlockDefeat(state);
}

export function nearestHerdAnimal(
  from: Vector2,
  visuals: HerdAnimal[],
): HerdAnimal | null {
  let best: HerdAnimal | null = null;
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

export function nearestReadyAnimal(
  from: Vector2,
  visuals: HerdAnimal[],
  maxDist: number,
): HerdAnimal | null {
  let best: HerdAnimal | null = null;
  let bestD = Infinity;
  for (const s of visuals) {
    if (!s.produceReady) continue;
    const d = dist(from, s.pos);
    if (d < bestD && d < maxDist) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export function collectProduct(state: GameState, animal: HerdAnimal): void {
  const inv = state.player.inventory;
  const kind = animal.kind;
  const season = state.world.season;
  animal.produceReady = false;
  animal.produceIn = PRODUCE_INTERVAL[kind] * (0.85 + Math.random() * 0.3);

  let label = "";
  if (kind === "sheep") {
    // Хоньны ноос зөвхөн зун
    if (season !== "summer") {
      setMessage(state, "Хоньны ноос зөвхөн зуны улиралд гардаг.", 2);
      return;
    }
    inv.wool += 1;
    label = "+1 ноос";
  } else if (kind === "goat") {
    // Ямааны ноолуур зөвхөн хавар; бусад улиралд сүү
    if (season === "spring" && Math.random() < 0.35) {
      inv.cashmere += 1;
      label = "+1 ноолуур";
    } else {
      inv.milk += 1;
      label = "+1 сүү";
    }
  } else if (kind === "cattle" || kind === "horse") {
    inv.milk += 1;
    label = "+1 сүү";
  } else {
    // camel
    if (Math.random() < 0.4) {
      inv.wool += 1;
      label = "+1 тэмээний ноос";
    } else {
      inv.milk += 1;
      label = "+1 сүү";
    }
  }

  state.score += 2;
  sfx("berry");
  spawnParticles(state, animal.pos, 6, "#f0e0a0", { speed: 50, life: 2 });
  spawnText(state, animal.pos, label, "#ffe9a0");
}

/** Малын бүтээгдэхүүн таймер — цатгалан үед; ноос/ноолуур улирлын дагуу */
export function updateProduction(state: GameState, dt: number): void {
  if (state.phase !== "playing") return;
  const flock = state.world.flock;
  const season = state.world.season;
  const fed = flock.hunger >= 40;
  const rate = fed ? 1 : 0.25;

  for (const a of flock.visuals) {
    // Хоньны ноос зөвхөн зуны улиралд хуримтлагдана / бэлэн болно
    if (a.kind === "sheep" && season !== "summer") {
      if (a.produceReady) {
        a.produceReady = false;
        a.produceIn = PRODUCE_INTERVAL.sheep * (0.4 + Math.random() * 0.6);
      }
      continue;
    }

    if (a.produceReady) continue;
    a.produceIn -= dt * rate;
    if (a.produceIn <= 0) {
      a.produceReady = true;
      a.produceIn = 0;
    }
  }
}

export function createFeeder(center: Vector2): Feeder {
  return {
    pos: { x: center.x - 70, y: center.y + 48 },
    hay: 0,
    maxHay: MAX_FEEDER_HAY,
    radius: 22,
  };
}

export function depositHayToFeeder(state: GameState, amount = 5): boolean {
  const feeder = state.world.feeder;
  const inv = state.player.inventory;
  if (inv.hay <= 0) {
    setMessage(state, "Өвс алга — бэлчээрээс E-ээр хад.", 2);
    return false;
  }
  const space = feeder.maxHay - feeder.hay;
  if (space <= 0) {
    setMessage(state, "Тэвш дүүрэн.", 1.5);
    return false;
  }
  const move = Math.min(amount, inv.hay, space);
  inv.hay -= move;
  feeder.hay += move;
  sfx("chop");
  spawnText(state, feeder.pos, trFormat("+{n} өвс → тэвш", { n: move }), "#b8d060");
  setMessage(
    state,
    trFormat("Тэвшид {n} өвс хийлээ ({have}/{max})", {
      n: move,
      have: Math.floor(feeder.hay),
      max: feeder.maxHay,
    }),
    2,
  );
  return true;
}

export function spawnWildHorse(state: GameState): void {
  const edge = Math.floor(Math.random() * 4);
  let pos: Vector2;
  if (edge === 0) pos = { x: randRange(80, WORLD_W - 80), y: 60 };
  else if (edge === 1)
    pos = { x: randRange(80, WORLD_W - 80), y: WORLD_H - 60 };
  else if (edge === 2) pos = { x: 60, y: randRange(80, WORLD_H - 80) };
  else pos = { x: WORLD_W - 60, y: randRange(80, WORLD_H - 80) };

  state.world.wildHorses.push({
    id: allocId(state),
    pos,
    vel: { x: 0, y: 0 },
    radius: 14,
    face: 1,
    spooked: 0,
  });
  setMessage(state, "Морь гарлаа — уургаа хүзүү рүү шид (E)!", 3.5);
}

export function wildHorseNeckPos(horse: WildHorse): Vector2 {
  return {
    x: horse.pos.x + 18 * horse.face,
    y: horse.pos.y - 12,
  };
}

function lassoHandPos(state: GameState): Vector2 {
  const flip = state.player.facing.x < 0 ? -1 : 1;
  return {
    x: state.player.pos.x + 10 * flip,
    y: state.player.pos.y - (state.player.riding ? 18 : 6),
  };
}

function findWildHorseById(
  horses: WildHorse[],
  id: number,
): WildHorse | null {
  for (const h of horses) {
    if (h.id === id) return h;
  }
  return null;
}

function nearestWildHorse(
  pos: Vector2,
  horses: WildHorse[],
  range: number,
): WildHorse | null {
  let best: WildHorse | null = null;
  let bestD = range;
  for (const h of horses) {
    const d = dist(pos, h.pos);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

const LASSO_THROW_RANGE = 78;
const LASSO_THROW_SPEED = 3.4; // throwT per second (~0.3s)
const LASSO_PULL = 0.12;
const LASSO_DECAY = 0.16;
const LASSO_TIME = 4.2;
const LASSO_ESCAPE_RANGE = 110;

function failHorseLasso(
  state: GameState,
  horse: WildHorse | null,
  reason: string,
): void {
  state.horseLasso = null;
  if (horse) {
    horse.spooked = Math.max(horse.spooked, 2.6);
    const away = normalize({
      x: horse.pos.x - state.player.pos.x,
      y: horse.pos.y - state.player.pos.y,
    });
    horse.vel.x = away.x * 140;
    horse.vel.y = away.y * 140;
    horse.pos.x += away.x * 28;
    horse.pos.y += away.y * 28;
    spawnParticles(state, wildHorseNeckPos(horse), 8, "#e8c56a", {
      speed: 70,
      size: 2.2,
    });
    spawnText(state, horse.pos, "Зугтлаа!", "#ffb080");
  }
  sfx("alert");
  setMessage(state, reason, 2.4);
}

function completeHorseCatch(state: GameState, horse: WildHorse): void {
  const idx = state.world.wildHorses.indexOf(horse);
  if (idx >= 0) state.world.wildHorses.splice(idx, 1);
  state.horseLasso = null;
  addLivestock(state, "horse", 1);
  state.score += 25;
  sfx("buy");
  spawnParticles(state, horse.pos, 14, "#e8c56a", { speed: 90, size: 3 });
  spawnText(state, horse.pos, "+1 морь!", "#ffe9a0");
  setMessage(state, "Зэрлэг морь уургаар барив!", 3.5);
}

function landLassoOnNeck(state: GameState, horse: WildHorse): void {
  const d = dist(state.player.pos, horse.pos);
  const closeBonus = clamp(1 - d / LASSO_THROW_RANGE, 0, 1);
  const chance = 0.42 + closeBonus * 0.48 - (horse.spooked > 0 ? 0.22 : 0);
  if (Math.random() >= chance) {
    failHorseLasso(state, horse, "Уурга хүзүүнд ороогүй — дахин шид!");
    return;
  }

  state.horseLasso = {
    horseId: horse.id,
    phase: "pulling",
    throwT: 1,
    progress: LASSO_PULL * 0.9,
    timeLeft: LASSO_TIME,
    timeMax: LASSO_TIME,
    from: lassoHandPos(state),
    aim: wildHorseNeckPos(horse),
  };
  horse.spooked = Math.max(horse.spooked, 1.2);
  sfx("select");
  spawnParticles(state, wildHorseNeckPos(horse), 10, "#ffe9a0", {
    speed: 55,
    size: 2.4,
  });
  setMessage(state, "Хүзүүнд орлоо! E-г хурдан дарж тат!", 2.2);
}

export function updateWildHorses(state: GameState, dt: number): void {
  const { player, world } = state;
  const center = pastureCenter(world);

  world.nextWildHorseIn -= dt;
  // Хоёр дахин бага: хамгийн ихдээ 1–2 (өмнө 3 байсан)
  if (world.nextWildHorseIn <= 0 && world.wildHorses.length < 2) {
    spawnWildHorse(state);
    world.nextWildHorseIn = randRange(90, 180);
  }

  const lasso = state.horseLasso;
  if (lasso) {
    const hooked = findWildHorseById(world.wildHorses, lasso.horseId);
    if (!hooked || !player.gear.urga) {
      failHorseLasso(
        state,
        hooked,
        hooked ? "Уурга алдлаа!" : "Морь зугтлаа!",
      );
    } else if (lasso.phase === "throwing") {
      lasso.throwT = Math.min(1, lasso.throwT + dt * LASSO_THROW_SPEED);
      lasso.aim = wildHorseNeckPos(hooked);
      lasso.from = lassoHandPos(state);
      if (lasso.throwT >= 1) {
        landLassoOnNeck(state, hooked);
      }
    } else {
      lasso.timeLeft -= dt;
      lasso.progress = Math.max(0, lasso.progress - LASSO_DECAY * dt);
      lasso.aim = wildHorseNeckPos(hooked);
      lasso.from = lassoHandPos(state);
      const dPlayer = dist(player.pos, hooked.pos);
      if (
        lasso.timeLeft <= 0 ||
        lasso.progress <= 0 ||
        dPlayer > LASSO_ESCAPE_RANGE
      ) {
        failHorseLasso(
          state,
          hooked,
          dPlayer > LASSO_ESCAPE_RANGE
            ? "Уурга тасарлаа — ойртож дахин шид!"
            : "Морь зугтав — E-г хурдан дар!",
        );
      }
    }
  }

  const hookedId =
    state.horseLasso?.phase === "pulling"
      ? state.horseLasso.horseId
      : state.horseLasso?.phase === "throwing"
        ? state.horseLasso.horseId
        : null;

  for (const h of world.wildHorses) {
    if (h.spooked > 0) h.spooked -= dt;

    const toPlayer = { x: player.pos.x - h.pos.x, y: player.pos.y - h.pos.y };
    const dPlayer = Math.hypot(toPlayer.x, toPlayer.y);
    const wander = {
      x: Math.sin(world.elapsed * 0.22 + h.id) * 0.35,
      y: Math.cos(world.elapsed * 0.18 + h.id * 1.3) * 0.35,
    };

    let ax = wander.x;
    let ay = wander.y;

    if (hookedId === h.id && state.horseLasso?.phase === "pulling") {
      // Уурганд орсон: зовлонтой тэмцэлдэнэ, бага зэрэг ойртуулна
      const t = world.elapsed;
      const thrash = Math.sin(t * 12 + h.id) * 0.9;
      const away = normalize({
        x: -toPlayer.x + Math.cos(t * 7 + h.id) * 0.3,
        y: -toPlayer.y + Math.sin(t * 9 + h.id) * 0.3,
      });
      ax = away.x * 0.85 + thrash * 0.35;
      ay = away.y * 0.85 - thrash * 0.25;
      const pull = normalize({ x: toPlayer.x, y: toPlayer.y });
      ax += pull.x * 0.35;
      ay += pull.y * 0.35;
      h.spooked = Math.max(h.spooked, 0.8);
    } else if (hookedId === h.id && state.horseLasso?.phase === "throwing") {
      // Шидийг харж бага зэрэг айна
      if (dPlayer < 100) {
        const flee = normalize({ x: -toPlayer.x, y: -toPlayer.y });
        ax += flee.x * 0.55;
        ay += flee.y * 0.55;
      }
    } else if (dPlayer < 120) {
      // Тоглогчоос холд (ялангуяа уургагүй бол)
      const flee = normalize({ x: -toPlayer.x, y: -toPlayer.y });
      const fear = player.gear.urga && dPlayer < 70 ? 0.35 : 0.9;
      ax += flee.x * fear;
      ay += flee.y * fear;
      if (dPlayer < 55) h.spooked = 1.5;
    }

    // Бэлчээр рүү бага зэрэг татагдана
    const toC = normalize({ x: center.x - h.pos.x, y: center.y - h.pos.y });
    if (dist(h.pos, center) > PASTURE_RADIUS + 200) {
      ax += toC.x * 0.25;
      ay += toC.y * 0.25;
    }

    const spd =
      hookedId === h.id && state.horseLasso?.phase === "pulling"
        ? 55
        : h.spooked > 0
          ? 85
          : 32;
    const dir = normalize({ x: ax, y: ay });
    h.vel.x = dir.x * spd;
    h.vel.y = dir.y * spd;
    // Жижиг алхмаар — хашаа/гэр нэвтрэхгүй
    const stepDist = Math.hypot(h.vel.x, h.vel.y) * dt;
    const steps = Math.max(1, Math.min(8, Math.ceil(stepDist / 3)));
    const inv = 1 / steps;
    for (let s = 0; s < steps; s++) {
      h.pos.x += h.vel.x * dt * inv;
      h.pos.y += h.vel.y * dt * inv;
      pushOutOfFences(h.pos, h.radius, world.fences);
      pushOutOfGer(h.pos, h.radius, world);
      pushOutOfUrtz(h.pos, h.radius, world);
    }
    if (hookedId === h.id && state.horseLasso?.phase === "pulling") {
      const dHook = dist(h.pos, player.pos);
      if (dHook > LASSO_ESCAPE_RANGE - 8) {
        const back = normalize({
          x: player.pos.x - h.pos.x,
          y: player.pos.y - h.pos.y,
        });
        const pull = dHook - (LASSO_ESCAPE_RANGE - 8);
        h.pos.x += back.x * pull * 0.55;
        h.pos.y += back.y * pull * 0.55;
      }
    }
    h.pos.x = clamp(h.pos.x, 30, WORLD_W - 30);
    h.pos.y = clamp(h.pos.y, 30, WORLD_H - 30);
    // Нүүр анивчихгүй — зөвхөн тод хөдөлгөөнд солино
    if (h.vel.x > 14) h.face = 1;
    else if (h.vel.x < -14) h.face = -1;
  }
}

/** Уурга шидэж хүзүүнд оруулаад E mash-аар татна */
export function tryCatchWildHorse(state: GameState): boolean {
  if (!state.player.gear.urga) {
    setMessage(state, "Уурга хэрэгтэй — авдраас худалдаж ав.", 2);
    return false;
  }
  const player = state.player;

  if (state.horseLasso?.phase === "throwing") {
    setMessage(state, "Уурга нисэж байна…", 0.8);
    return true;
  }

  if (state.horseLasso?.phase === "pulling") {
    const hooked = findWildHorseById(
      state.world.wildHorses,
      state.horseLasso.horseId,
    );
    if (!hooked) {
      state.horseLasso = null;
      return true;
    }
    state.horseLasso.progress = Math.min(
      1,
      state.horseLasso.progress + LASSO_PULL + randRange(0, 0.03),
    );
    state.horseLasso.timeLeft = Math.min(
      state.horseLasso.timeMax,
      state.horseLasso.timeLeft + 0.12,
    );
    const to = normalize({
      x: player.pos.x - hooked.pos.x,
      y: player.pos.y - hooked.pos.y,
    });
    hooked.pos.x += to.x * 4.2;
    hooked.pos.y += to.y * 4.2;
    spawnParticles(state, wildHorseNeckPos(hooked), 2, "#e8d090", {
      speed: 40,
      size: 1.6,
    });
    if (state.horseLasso.progress >= 1) {
      completeHorseCatch(state, hooked);
    } else {
      setMessage(state, "E хурдан дар — морь зугтаж байна!", 1.2);
    }
    return true;
  }

  const best = nearestWildHorse(player.pos, state.world.wildHorses, LASSO_THROW_RANGE);
  if (!best) return false;

  const from = lassoHandPos(state);
  const aim = wildHorseNeckPos(best);
  state.horseLasso = {
    horseId: best.id,
    phase: "throwing",
    throwT: 0,
    progress: 0,
    timeLeft: LASSO_TIME,
    timeMax: LASSO_TIME,
    from,
    aim,
  };
  sfx("select");
  setMessage(state, "Уурга шидлээ — хүзүү рүү!", 1.4);
  return true;
}