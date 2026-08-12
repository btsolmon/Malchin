// Сүнсний ертөнц — орох / гарах / цаг зогсох / амь (сүнс)

import { sfx, startFamilyLifeTheme, stopTumurBossMusic } from "./audio";
import { spawnText } from "./effects";
import { ensureParents } from "./parents";
import { setMessage } from "./utils";
import type { GameState, Wolf } from "./types";

/** Сүнс рүү орохын өмнөх нөөцийг хадгална (буцахад сэргээнэ) */
export function stashSpiritVisitSnapshot(state: GameState): void {
  if (state.spiritVisitSnapshot) return;
  state.spiritVisitSnapshot = {
    bow: state.player.gear.bow,
    arrows: state.player.inventory.arrows,
    stone: state.player.inventory.stone,
    wood: state.player.inventory.wood,
    spiritPoints: state.spiritPoints,
  };
}

/** Овоогоор буцахад зээл/cheat нөөцийг буцаана */
export function restoreSpiritVisitSnapshot(state: GameState): void {
  const snap = state.spiritVisitSnapshot;
  if (!snap) return;
  state.player.gear.bow = snap.bow;
  state.player.inventory.arrows = snap.arrows;
  state.player.inventory.stone = snap.stone;
  state.player.inventory.wood = snap.wood;
  state.spiritPoints = snap.spiritPoints;
  state.spiritVisitSnapshot = null;
}

/**
 * R — рашаан балгах.
 * 1 балга = бүтэн амьны үзүүлэлт. Лонхонд 3 балга.
 */
export function tryDrinkSpiritWater(state: GameState): boolean {
  if (!state.input.drinkSpirit) return false;
  state.input.drinkSpirit = false;

  if (state.phase !== "spirit" && state.phase !== "playing") return false;
  if (state.spiritPoints < 1) {
    if (state.story.spiritOvooSoulCollected) {
      setMessage(state, "Рашаан дууссан.", 1.8);
      sfx("move");
    }
    return false;
  }

  const p = state.player;
  if (p.vitals.health >= p.vitals.maxHealth - 0.5) {
    setMessage(state, "Амь бүрэн — рашаан хэрэггүй.", 1.6);
    sfx("move");
    return false;
  }

  state.spiritPoints -= 1;
  p.vitals.health = p.vitals.maxHealth;
  p.vitals.warmth = Math.max(p.vitals.warmth, 55);
  p.vitals.hunger = Math.max(p.vitals.hunger, 45);
  p.invuln = Math.max(p.invuln, 0.35);
  const left = state.spiritPoints;
  spawnText(
    state,
    p.pos,
    left > 0 ? `Рашаан · үлдсэн ${left}` : "Рашаан · дууссан",
    "#7ec8ff",
  );
  setMessage(
    state,
    left > 0
      ? `Рашаан балгав — амь дүүрэн. Үлдсэн: ${left}`
      : "Сүүлийн рашаанаа уув — амь дүүрэн. Лонх хоосорлоо.",
    2.8,
  );
  sfx("buy");
  return true;
}

/** Эрүүл мэнд 0 болсон үед тоглоом дуусна (рашаан автоматаар нөхөхгүй) */
export function handlePlayerDeath(state: GameState, reason: string): void {
  if (state.godMode) {
    state.player.vitals.health = state.player.vitals.maxHealth;
    return;
  }
  if (state.phase !== "playing" && state.phase !== "spirit") return;

  state.phase = "lost";
  setMessage(state, reason || "Амиа алдлаа…", 99);
}

function stashRealWorldThreats(state: GameState): void {
  if (state.phase === "spirit") return;
  state.spiritReturnPos = { ...state.player.pos };
  state.spiritSavedWolves = state.world.wolves.map(cloneWolf);
  state.spiritSavedThieves = state.world.thieves.map((t) => ({
    ...t,
    pos: { ...t.pos },
    vel: { ...t.vel },
    escapeTarget: { ...t.escapeTarget },
    attackDirection: { ...t.attackDirection },
  }));
  state.world.wolves = [];
  state.world.thieves = [];
}

function resetPlayerCombatForSpirit(state: GameState): void {
  const player = state.player;
  player.stamina = player.maxStamina;
  player.staminaRegenDelay = 0;
  player.combatPhase = "idle";
  player.combatTimer = 0;
  player.attackCooldown = 0;
  player.attackHitDone = false;
  player.attackAnim = 0;
  player.attackMelee = false;
  player.parryPhase = "idle";
  player.parryTimer = 0;
  player.parryArmed = false;
  player.dodgePhase = "idle";
  player.dodgeTimer = 0;
  state.combatMovementLocked = false;
  state.combatDodgeActive = false;
}

export type EnterSpiritOpts = {
  /** Анхны тагнах зорчилт — буцахыг зөвшөөрнө */
  scout?: boolean;
};

/**
 * Сүнсний орон — шулмасын туслахууд энд байна.
 * ensureShulmasHelpers()-ийг дуудагч (өвгөн гэх мэт) өмнө нь ажиллуулна.
 */
export function enterSpiritWorld(
  state: GameState,
  opts: EnterSpiritOpts = {},
): void {
  if (state.phase === "spirit" && state.spiritMode === "shulmas") return;

  stashRealWorldThreats(state);
  state.world.wolves = [];
  state.world.thieves = [];

  const scout = opts.scout ?? !state.story.spiritScoutDone;
  state.story.spiritAllowReturn = scout;
  state.story.spiritPathOpened = true;
  // Анхны зорчилт: шидэт усгүй. Хоёр дахь: овоон дээр лонх.
  if (!scout) {
    state.story.spiritOvooSoulActive = !state.story.spiritOvooSoulCollected;
  } else {
    state.story.spiritOvooSoulActive = false;
  }

  state.phase = "spirit";
  state.spiritMode = "shulmas";
  state.spiritTransition = 1.2;
  state.spiritCleared = false;
  state.world.elder.eyeMode = "spirit";
  resetPlayerCombatForSpirit(state);
  sfx("witchLaugh");
  if (scout && !state.story.stormTracePos) {
    const elderCamp = state.world.elder.gerPos;
    state.story.stormTracePos = {
      x: Math.min(Math.max(elderCamp.x + 300, 54), state.world.width - 54),
      y: Math.min(Math.max(elderCamp.y - 210, 54), state.world.height - 54),
    };
  }
  setMessage(
    state,
    scout
      ? "Сүнсний орон… цаг зогсов. Буцахдаа хар мөрийн чулуун овоо руу оч — E дарж гарна."
      : "Сүнсний орон… буцах зам хаагдсан. Мангасыг дарж аав ээжийгээ авраарай.",
    5.5,
  );
}

/**
 * Шулмасын сүнсний орон — Төмөр шулмас / туслахууд энд л байдаг.
 */
export function enterShulmasSpirit(state: GameState): void {
  enterSpiritWorld(state, { scout: false });
  setMessage(
    state,
    "Шулмасын сүнсний орон… 1+J цохих, 2+J сум. Туслахууд голын цаана.",
    4.5,
  );
}

/** Одоо буцахыг зөвшөөрөх эсэх */
export function canExitSpiritWorld(state: GameState): boolean {
  if (state.phase !== "spirit") return false;
  const tumur = state.world.tumurShulmas;
  if (
    state.spiritMode === "shulmas" &&
    tumur.active &&
    !tumur.defeated &&
    tumur.phase !== "death"
  ) {
    return false;
  }
  if (state.spiritMode === "purge") return true;
  return state.story.spiritAllowReturn === true;
}

export function exitSpiritWorld(state: GameState, msg?: string): void {
  if (state.phase !== "spirit" && !state.spiritReturnPos) return;

  const tumur = state.world.tumurShulmas;
  if (
    state.spiritMode === "shulmas" &&
    tumur.active &&
    !tumur.defeated &&
    tumur.phase !== "death"
  ) {
    setMessage(state, "Тулаан дуусах хүртэл сүнсний оронгоос гарч чадахгүй.", 2.4);
    sfx("move");
    return;
  }

  if (
    state.spiritMode === "shulmas" &&
    !state.story.spiritAllowReturn &&
    !tumur.defeated
  ) {
    setMessage(
      state,
      "Энэ удаа буцах хаалга байхгүй. Мангасыг дарж л гэртээ харьна.",
      3,
    );
    sfx("move");
    return;
  }

  if (tumur.active && tumur.defeated) {
    tumur.active = false;
    tumur.phase = "sealed";
    tumur.phaseTimer = 0;
  } else if (state.spiritMode === "shulmas") {
    // Тулаанаас бусад шалтгаанаар гарвал BGM шууд зогсоно
    stopTumurBossMusic();
  }

  state.world.wolves = (state.spiritSavedWolves ?? []).map(cloneWolf);
  state.world.thieves = (state.spiritSavedThieves ?? []).map((t) => ({
    ...t,
    pos: { ...t.pos },
    vel: { ...t.vel },
    escapeTarget: { ...t.escapeTarget },
    attackDirection: { ...t.attackDirection },
  }));
  state.spiritSavedWolves = null;
  state.spiritSavedThieves = null;

  if (state.spiritReturnPos) {
    if (state.spiritMode === "shulmas" && tumur.defeated) {
      state.player.pos = {
        x: tumur.gatePos.x,
        y: tumur.gatePos.y + 62,
      };
    } else {
      state.player.pos = { ...state.spiritReturnPos };
    }
  }
  state.spiritReturnPos = null;
  const wasCleared = state.spiritCleared;
  const wasShulmas = state.spiritMode === "shulmas";
  const parentsFreed = wasShulmas && tumur.defeated;
  const couldReturnViaOvoo =
    wasShulmas && state.story.spiritAllowReturn && !tumur.defeated;
  const wasScoutReturn =
    couldReturnViaOvoo && !state.story.spiritScoutDone;

  state.spiritCleared = false;
  state.spiritMode = "purge";
  state.spiritTransition = 0.85;
  state.world.elder.eyeMode = "idle";
  state.story.spiritAllowReturn = false;
  state.story.spiritOvooSoulActive = false;

  if (parentsFreed) {
    ensureParents(state);
    state.player.pos = {
      x: state.world.campPos.x + 28,
      y: state.world.campPos.y + 55,
    };
    state.phase = "playing";
    state.story.activeMainObjective = null;
    startFamilyLifeTheme();
    setMessage(state, "Хүлээс тасарч, сүнсний манан сарнив.", 2.4);
    return;
  }

  state.phase = "playing";

  if (wasScoutReturn) {
    restoreSpiritVisitSnapshot(state);
    state.story.spiritScoutDone = true;
    state.story.activeMainObjective = "talkAfterSpiritScout";
    const ovoo = state.story.stormTracePos;
    if (ovoo) {
      state.player.pos = { x: ovoo.x, y: ovoo.y + 28 };
    }
    setMessage(
      state,
      msg ?? "Чулуун овоогоор буцлаа. Өвгөн дээр очиж ярилц.",
      5,
    );
    sfx("select");
    return;
  }

  // Cheat / тагнах бус буцах — сүнсний тулааны зорилгыг хүний ертөнцөд бүү үлдээ
  if (couldReturnViaOvoo) {
    restoreSpiritVisitSnapshot(state);
    // Cheat буцах: лонх/лацлыг дахин туршихад бэлэн болгоно
    state.story.spiritOvooSoulCollected = false;
    state.story.spiritOvooSoulActive = false;
    const obj = state.story.activeMainObjective;
    if (
      obj === "defeatSpiritGuards" ||
      obj === "reachCursedGate" ||
      obj === "defeatShulmasBaatar" ||
      obj === "claimSkySword" ||
      obj === "openBlackIronGate" ||
      obj === "defeatTumurShulmas" ||
      obj === "returnFromSpirit" ||
      obj === "enterSpiritViaOvoo"
    ) {
      state.story.activeMainObjective =
        state.story.postSpiritScoutDialogueCompleted
          ? null
          : "talkAfterSpiritScout";
    }
    const ovoo = state.story.stormTracePos;
    if (ovoo) {
      state.player.pos = { x: ovoo.x, y: ovoo.y + 28 };
    }
    setMessage(
      state,
      msg ?? "Чулуун овоогоор буцлаа. Зээлсэн зэвсэг, материал үлдээгүй.",
      4,
    );
    sfx("select");
    return;
  }

  setMessage(
    state,
    msg ??
      (wasShulmas
        ? "Шулмасын сүнсний орноос буцлаа."
        : wasCleared
          ? "Сүнсний орноос буцлаа. Аав ээжийн мөр… үргэлжлүүлнэ."
          : "Бэлтгэл хийгээд дахин ир."),
    4,
  );
  sfx("select");
}

function cloneWolf(w: Wolf): Wolf {
  return {
    ...w,
    pos: { ...w.pos },
    vel: { ...w.vel },
    attackDirection: { ...w.attackDirection },
  };
}

export function updateSpiritWorld(state: GameState, dt: number): void {
  if (state.spiritTransition > 0) {
    state.spiritTransition = Math.max(0, state.spiritTransition - dt);
  }

  // Шулмасын горимд «цэвэрлэсэн»-ийг boss/зам тодорхойлно
  if (state.spiritMode === "shulmas") {
    const tumur = state.world.tumurShulmas;
    const route = state.world.firstRoute;
    if (tumur.active) {
      state.spiritCleared = tumur.defeated;
      return;
    }
    const aliveHelpers = route.enemies.filter((e) => e.alive).length;
    if (
      !state.spiritCleared &&
      aliveHelpers === 0 &&
      (!route.bossStarted || route.bossDefeated)
    ) {
      state.spiritCleared = true;
      if (state.story.spiritAllowReturn) {
        setMessage(
          state,
          "Тагнах зорчилт хангалттай. Хар мөрийн чулуун овоогоор буц.",
          5,
        );
      } else {
        setMessage(
          state,
          "Шулмасын туслахууд унав. Хаалга руу оч.",
          5,
        );
      }
      sfx("levelup");
    }
    return;
  }

  const alive = state.world.wolves.filter((w) => w.alive);
  if (!state.spiritCleared && alive.length === 0) {
    state.spiritCleared = true;
    setMessage(state, "Сүнсний дайснууд унав! E — бодит ертөнц рүү буцах.", 5);
    sfx("levelup");
  }
}

/** Цэнхэр манан — орох/гарах шилжилт + сүнсний ертөнцийн тинт */
export function drawSpiritOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  viewW: number,
  viewH: number,
): void {
  const inSpirit = state.phase === "spirit";
  const t = state.spiritTransition;
  const shulmas = inSpirit && state.spiritMode === "shulmas";
  const sixSunsAlive =
    shulmas &&
    state.world.firstRoute.enemies.some(
      (e) => e.kind === "zurgaanNar" && e.alive,
    );

  if (inSpirit) {
    // Нар амьд үед дулаан улаан; дараа нь анхны хөх бүүдгэр
    ctx.fillStyle = sixSunsAlive
      ? "rgba(55, 12, 28, 0.42)"
      : "rgba(20, 40, 90, 0.38)";
    ctx.fillRect(0, 0, viewW, viewH);
    const g = ctx.createRadialGradient(
      viewW / 2,
      viewH / 2,
      40,
      viewW / 2,
      viewH / 2,
      Math.max(viewW, viewH) * 0.7,
    );
    if (sixSunsAlive) {
      g.addColorStop(0, "rgba(180,40,50,0.06)");
      g.addColorStop(1, "rgba(28,4,12,0.5)");
    } else {
      g.addColorStop(0, "rgba(80,140,220,0.05)");
      g.addColorStop(1, "rgba(8,16,48,0.45)");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  if (t > 0) {
    const a = Math.min(1, t > 0.6 ? (1.2 - t) / 0.4 : t / 0.6);
    ctx.fillStyle = sixSunsAlive
      ? `rgba(120, 20, 40, ${0.55 * a})`
      : `rgba(40, 90, 180, ${0.55 * a})`;
    ctx.fillRect(0, 0, viewW, viewH);
    if (a > 0.35) {
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(200,230,255,${a})`;
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillText(
        inSpirit || t > 0.5
          ? shulmas
            ? "ШУЛМАСЫН СҮНСНИЙ ОРОН"
            : "СҮНСНИЙ ОРОН"
          : "БОДИТ ЕРТӨНЦ",
        viewW / 2,
        viewH / 2,
      );
      ctx.textAlign = "left";
    }
  }
}
