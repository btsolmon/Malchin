// Өдрийн цаг (үүр / өдөр / орой / шөнө) + улирлын стратеги

import {
  DAY_LENGTH_SEC,
  type DayPhase,
  type GameState,
  type Season,
  type Vector2,
} from "./types";
import {
  clamp,
  dist,
  FLOCK_GATE_RADIUS,
  flockGatePos,
  isNight,
  pastureCenter,
  pastureRefillForSeason,
  penCenter,
  PEN_RADIUS,
  seasonForDay,
  setMessage,
} from "./utils";
import { addLivestock, killHerdVisual } from "./livestock";
import { spawnParticles, spawnText } from "./effects";
import { sfx } from "./audio";
import { trFormat } from "./i18n";

/** Бодит секундэд нэг өдөр — timeOfDay += dt * TIME_RATE */
export const TIME_RATE = 24 / DAY_LENGTH_SEC;

export { PEN_RADIUS, penCenter };

export function animalInPen(
  pos: Vector2,
  world: GameState["world"],
): boolean {
  return dist(pos, penCenter(world)) < PEN_RADIUS;
}

export function flockMostlyPenned(world: GameState["world"]): boolean {
  const vis = world.flock.visuals;
  if (vis.length === 0) return !world.flockOut;
  let inside = 0;
  for (const a of vis) if (animalInPen(a.pos, world)) inside++;
  return inside >= Math.ceil(vis.length * 0.7);
}

/**
 * Өдрийн фаз — өвөлд өдөр богино.
 * Үүр: гал + мал гаргах | Өдөр: ажил | Орой: мал оруулах | Шөнө: аюул
 */
export function getDayPhase(
  timeOfDay: number,
  season: Season,
): DayPhase {
  const t = ((timeOfDay % 24) + 24) % 24;
  if (season === "winter") {
    if (t >= 7.5 && t < 9) return "dawn";
    if (t >= 9 && t < 14.5) return "day";
    if (t >= 14.5 && t < 17) return "evening";
    return "night";
  }
  if (t >= 5.5 && t < 8) return "dawn";
  if (t >= 8 && t < 17) return "day";
  if (t >= 17 && t < 20) return "evening";
  return "night";
}

/** Унтаад босоход — дараагийн өглөөний үүр рүү шилжүүлнэ */
export function advanceToMorning(state: GameState): void {
  const world = state.world;
  const prevSeason = world.season;
  const morning = world.season === "winter" ? 7.6 : 6.0;

  // Өнөөдрийн үүр өнгөрсөн бол маргаашийн өглөө
  if (world.timeOfDay >= morning) {
    world.dayNumber += 1;
    const growth = dailyGrowthCount(state);
    if (growth > 0) {
      addLivestock(state, "sheep", growth);
      state.score += growth;
    }
    spawnSpringBirths(state);
  }

  world.timeOfDay = morning;
  world.season = seasonForDay(world.dayNumber);
  world.dayPhase = getDayPhase(world.timeOfDay, world.season);

  if (world.season !== prevSeason) {
    world.pastureGrass = pastureRefillForSeason(world.season);
    world.pastureSeason = world.season;
  }
}

export function dayPhaseHint(
  phase: DayPhase,
  season: Season,
  flockOut: boolean,
): string {
  if (phase === "dawn") {
    return flockOut
      ? "Үүр цайлаа! Дулаацаад ажилдаа ор"
      : "Үүр цайлаа! Галаа түлээд малаа бэлчээрт гарга";
  }
  if (phase === "day") {
    if (season === "summer") return "Өдөр боллоо! Өвс, жимс, хоньны ноос түү";
    if (season === "autumn") return "Өдөр боллоо! Түлээ нөөцөл, хашаагаа хүчитгэ";
    if (season === "spring") return "Өдөр боллоо! Ноолуур түү, хурга/ишиг дулаан байлга";
    return "Өдөр боллоо! Дулаацаж, тэвшээ бэлд";
  }
  if (phase === "evening") {
    return flockOut
      ? "Орой боллоо! Малаа тууж хашаанд оруул. E — оруулах"
      : "Орой боллоо! Мал хашаандаа. Шөнө ойртож байна";
  }
  return flockOut
    ? "Шөнө боллоо! Мал гадаа. Чоно, баавгай дайрах аюултай"
    : "Шөнө боллоо! Мал хашаандаа. Галд дулаац";
}

/** Фаз солигдох мессеж + өглөө мал автоматаар хашаанд «бэлэн» */
export function updateDayPhaseTransitions(state: GameState): void {
  if (state.phase !== "playing") return;
  const world = state.world;
  const phase = getDayPhase(world.timeOfDay, world.season);
  if (phase === world.dayPhase) return;

  const prev = world.dayPhase;
  world.dayPhase = phase;

  if (phase === "dawn" && prev === "night") {
    // Шинэ өдөр — малыг хашаанд бэлдэнэ (өмнөх өдрийн гаргалтыг хаана)
    world.flockOut = false;
    pullFlockToPen(state, 1);
    setMessage(
      state,
      "Үүр цайлаа! Гал түлээд E-ээр малаа бэлчээрт гарга.",
      4,
    );
  } else if (phase === "day" && prev === "dawn") {
    if (!world.flockOut) {
      setMessage(state, "Өдөр болов — малаа гаргаагүй байна!", 3);
    }
  } else if (phase === "evening") {
    if (world.flockOut) {
      setMessage(
        state,
        "Нар жаргаж байна! Малаа хашаанд оруул — чоно ирнэ!",
        4.5,
      );
      sfx("alert");
    } else {
      setMessage(state, "Орой — мал хашаандаа. Амрах цаг.", 2.5);
    }
  } else if (phase === "night") {
    if (world.flockOut && !flockMostlyPenned(world)) {
      setMessage(
        state,
        "Шөнө болов — мал бэлчээрт үлдэв! Аюултай!",
        4,
      );
      sfx("alert");
    }
  }
}

export function pullFlockToPen(state: GameState, strength: number): void {
  const pen = penCenter(state.world);
  for (const a of state.world.flock.visuals) {
    a.pos.x = clamp(
      a.pos.x + (pen.x - a.pos.x) * strength,
      30,
      state.world.width - 30,
    );
    a.pos.y = clamp(
      a.pos.y + (pen.y - a.pos.y) * strength,
      30,
      state.world.height - 30,
    );
    a.vel.x = 0;
    a.vel.y = 0;
  }
}

/** Хашааны хаалган дээр E — мал гаргах / оруулах */
export function tryToggleFlockPen(state: GameState): boolean {
  const { player, world } = state;
  const gate = flockGatePos(world);
  if (dist(player.pos, gate) > FLOCK_GATE_RADIUS + player.radius) {
    return false;
  }

  // Хаалгыг удаан нээнэ — мал өөрөө алхаж гарах/орох
  const gateFence = world.fences.find((f) => f.isGate);
  if (gateFence) {
    gateFence.gateOpen = 1;
    gateFence.gateCloseIn = 22;
  }

  if (!world.flockOut) {
    world.flockOut = true;
    sfx("select");
    spawnText(state, gate, "Мал бэлчээрт!", "#b8e8a0");
    setMessage(state, "Мал хаалгаар бэлчээрт гарч байна.", 3);
    return true;
  }

  // Оруулах — шууд телепорт биш, мал өөрөө хаалга руу алхана
  world.flockOut = false;
  sfx("select");
  spawnText(state, gate, "Мал хашаа руу…", "#e8c56a");
  setMessage(state, "Мал хаалгаар хашаандаа орж байна.", 3);
  return true;
}

/** Өдөр тутмын өсөлт — мал зөвхөн хавар өснө */
export function dailyGrowthCount(state: GameState): number {
  if (state.world.season !== "spring") return 0;
  const total = state.world.flock.total;
  return Math.max(1, Math.floor(total * 0.12));
}

/** Хавар — хурга/ишиг төллөх */
export function spawnSpringBirths(state: GameState): void {
  if (state.world.season !== "spring") return;
  const flock = state.world.flock;
  let born = 0;
  if (flock.counts.sheep >= 1 && Math.random() < 0.85) {
    addLivestock(state, "sheep", 1);
    markNewestNewborn(state, "sheep");
    born++;
  }
  if (flock.counts.goat >= 1 && Math.random() < 0.7) {
    addLivestock(state, "goat", 1);
    markNewestNewborn(state, "goat");
    born++;
  }
  if (flock.counts.cattle >= 1 && Math.random() < 0.35) {
    addLivestock(state, "cattle", 1);
    markNewestNewborn(state, "cattle");
    born++;
  }
  if (born > 0) {
    setMessage(
      state,
      trFormat(
        "Хавар төллөлт! +{n} залуу мал — шөнө дулаан байлга (гал/хашаа).",
        { n: born },
      ),
      4.5,
    );
    spawnText(
      state,
      pastureCenter(state.world),
      trFormat("+{n} төллөлт", { n: born }),
      "#ffe9a0",
    );
  }
}

function markNewestNewborn(
  state: GameState,
  kind: "sheep" | "goat" | "cattle",
): void {
  const list = state.world.flock.visuals;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].kind === kind && !list[i].newborn) {
      list[i].newborn = true;
      list[i].newbornWarmth = 70;
      list[i].radius *= 0.72;
      return;
    }
  }
}

/** Шинэ төллөсөн малын дулаан — гал/хашаагүй шөнө үхнэ */
export function updateNewborns(state: GameState, dt: number): void {
  if (state.phase !== "playing") return;
  const world = state.world;
  const fire = world.campfire;
  const night = isNight(world) || world.dayPhase === "night";
  const cold =
    world.season === "spring" ||
    world.season === "winter" ||
    world.season === "autumn";

  for (const a of [...world.flock.visuals]) {
    if (!a.newborn) continue;

    const nearFire =
      fire.placed && fire.lit && dist(a.pos, fire.pos) < fire.radius + 20;
    const safe = nearFire || (animalInPen(a.pos, world) && !world.flockOut);

    if (safe) {
      a.newbornWarmth = clamp(a.newbornWarmth + 12 * dt, 0, 100);
      if (a.newbornWarmth >= 95 && world.season !== "winter") {
        // Хэдэн өдөр дулаан байвал өснө
        a.newbornWarmth = 100;
      }
    } else if (night && cold) {
      a.newbornWarmth = clamp(a.newbornWarmth - 9 * dt, 0, 100);
      if (a.newbornWarmth <= 0) {
        spawnText(state, a.pos, "Хурга даарч үхэв", "#ff8080");
        killHerdVisual(state, a);
        setMessage(
          state,
          "Залуу мал хүйтэнд үхлээ! Гал түлж хашаанд байлга.",
          3.5,
        );
        sfx("baa");
      }
    }

    // Хавар өдөр дулаан байвал newborn тайлагдана
    if (
      world.season === "spring" &&
      world.dayPhase === "day" &&
      a.newbornWarmth >= 90 &&
      Math.random() < 0.002
    ) {
      a.newborn = false;
      a.radius = Math.max(a.radius / 0.72, 10);
    }
  }
}

/** Орой/шөнө мал гадаа байвал идэх эрсдэл */
export function updateOutdoorNightRisk(state: GameState, dt: number): void {
  if (state.phase !== "playing") return;
  const world = state.world;
  if (!world.flockOut) return;
  const phase = world.dayPhase;
  if (phase !== "evening" && phase !== "night") return;

  world.outdoorRiskAcc += dt;
  const interval = phase === "night" ? 7 : 12;
  if (world.outdoorRiskAcc < interval) return;
  world.outdoorRiskAcc = 0;

  // Хашаанаас гадуурх мал
  const outside = world.flock.visuals.filter((a) => !animalInPen(a.pos, world));
  if (outside.length === 0) {
    // Ихэнх нь оруулсан — автомат хаах
    if (flockMostlyPenned(world)) {
      world.flockOut = false;
      setMessage(state, "Мал хашаандаа орж амжлаа.", 2);
    }
    return;
  }

  const chance = phase === "night" ? 0.55 : 0.28;
  if (Math.random() > chance) return;

  if (Math.random() > chance) return;

  const victim = outside[Math.floor(Math.random() * outside.length)];
  if (!victim) return;
  spawnParticles(state, victim.pos, 10, "#ff6060", { speed: 80 });
  spawnText(state, victim.pos, "−1 мал (шөнийн дайралт)", "#ff9080");
  killHerdVisual(state, victim);
  setMessage(
    state,
    "Бэлчээрт үлдсэн малыг чоно идэв! Хашаанд оруул!",
    3.5,
  );
  sfx("baa");
}

/** Өвлийн чоно хашаа илүү хурдан эвдэнэ — бага шаттай бол */
export function winterFenceBreakMult(world: GameState["world"]): number {
  if (world.season !== "winter") return 1;
  const fences = world.fences;
  if (fences.length === 0) return 1.4;
  const weak = fences.filter((f) => f.tier <= 1).length;
  const ratio = weak / fences.length;
  return 1.2 + ratio * 1.1; // 1.2…2.3
}

/** Дайралтын давтамжийн үржүүлэгч (бага = илүү олон) */
export function threatIntervalMult(world: GameState["world"]): number {
  const phase = world.dayPhase;
  let m = 1;
  if (phase === "night") m *= 0.55;
  else if (phase === "evening") m *= 0.75;
  else if (phase === "dawn") m *= 1.15;
  else m *= 1.35; // өдөр амархан

  if (world.flockOut && (phase === "evening" || phase === "night")) m *= 0.7;
  if (world.season === "winter") m *= 0.85;
  if (world.season === "summer") m *= 1.1;
  return m;
}

export function seasonWarmthMult(season: Season): number {
  if (season === "winter") return 2.1;
  if (season === "spring") return 1.25;
  if (season === "autumn") return 1.15;
  return 0.85;
}

export function seasonBerryRespawnMult(season: Season): number {
  if (season === "summer") return 0.55;
  if (season === "autumn") return 0.85;
  if (season === "spring") return 1.1;
  return 1.6;
}