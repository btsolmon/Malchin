// 5 хошуу мал — тоолол, бүтээгдэхүүн, тэвш, уурга

import {
  LIVESTOCK_KINDS,
  MAX_FEEDER_HAY,
  MAX_VISUAL_SHEEP,
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
        ? 1.25
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
  setMessage(state, "Морь гарлаа — уургатай ойртож E!", 3.5);
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

    // Тоглогчоос холд (ялангуяа уургагүй бол)
    if (dPlayer < 120) {
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

    const spd = h.spooked > 0 ? 85 : 32;
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
    h.pos.x = clamp(h.pos.x, 30, WORLD_W - 30);
    h.pos.y = clamp(h.pos.y, 30, WORLD_H - 30);
    // Нүүр анивчихгүй — зөвхөн тод хөдөлгөөнд солино
    if (h.vel.x > 14) h.face = 1;
    else if (h.vel.x < -14) h.face = -1;
  }
}

/** Уургатай ойртож барих — ойртох тусам илүү амжилттай */
export function tryCatchWildHorse(state: GameState): boolean {
  if (!state.player.gear.urga) {
    setMessage(state, "Уурга хэрэгтэй — авдраас худалдаж ав.", 2);
    return false;
  }
  const player = state.player;
  let best: WildHorse | null = null;
  let bestD = Infinity;
  for (const h of state.world.wildHorses) {
    const d = dist(player.pos, h.pos);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  if (!best || bestD > 58) return false;

  // Ойртох тусам амжилт өндөр; айсан морь хэцүү
  const closeBonus = clamp(1 - bestD / 58, 0, 1);
  const chance = 0.35 + closeBonus * 0.55 - (best.spooked > 0 ? 0.25 : 0);
  if (Math.random() < chance) {
    const idx = state.world.wildHorses.indexOf(best);
    if (idx >= 0) state.world.wildHorses.splice(idx, 1);
    addLivestock(state, "horse", 1);
    state.score += 25;
    sfx("buy");
    spawnParticles(state, best.pos, 14, "#e8c56a", { speed: 90, size: 3 });
    spawnText(state, best.pos, "+1 морь!", "#ffe9a0");
    setMessage(state, "Зэрлэг морь уургаар барив!", 3.5);
    return true;
  }

  best.spooked = 2.5;
  const flee = normalize({
    x: best.pos.x - player.pos.x,
    y: best.pos.y - player.pos.y,
  });
  best.pos.x += flee.x * 40;
  best.pos.y += flee.y * 40;
  sfx("alert");
  spawnText(state, best.pos, "Зугтлаа!", "#ffb080");
  setMessage(state, "Морь зугтав — ойртож дахин оролд!", 2.5);
  return true;
}