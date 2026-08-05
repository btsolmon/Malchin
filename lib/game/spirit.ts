// Сүнсний ертөнц — орох / гарах / цаг зогсох / амь (сүнс)

import { sfx } from "./audio";
import { spawnText } from "./effects";
import { ensureParents } from "./parents";
import { allocId, setMessage } from "./utils";
import type { GameState, Vector2, Wolf } from "./types";

/** Сүнс = амь: 1 сүнс зарцуулж дахин амилах */
export function trySpendSpiritLife(state: GameState): boolean {
  if (state.spiritPoints < 1) return false;
  state.spiritPoints -= 1;
  const p = state.player;
  p.vitals.health = Math.max(40, Math.floor(p.vitals.maxHealth * 0.55));
  p.vitals.warmth = Math.max(p.vitals.warmth, 55);
  p.vitals.hunger = Math.max(p.vitals.hunger, 45);
  p.invuln = 2.2;
  state.fx.hurtFlash = 0.6;
  spawnText(state, p.pos, "−1 сүнс · амиллаа", "#7ec8ff");
  setMessage(state, "Сүнс зарцуулав — дахин амиллаа!", 3);
  sfx("buy");
  return true;
}

/** Эрүүл мэнд 0 болсон үед: сүнс байвал амилна, үгүй бол lost */
export function handlePlayerDeath(state: GameState, reason: string): void {
  if (state.godMode) {
    state.player.vitals.health = state.player.vitals.maxHealth;
    return;
  }
  if (state.phase !== "playing" && state.phase !== "spirit") return;
  if (trySpendSpiritLife(state)) return;

  if (state.phase === "spirit") {
    exitSpiritWorld(state, "Сүнс дууссан… бодит ертөнц рүү буцлаа.");
    state.player.vitals.health = Math.max(
      20,
      Math.floor(state.player.vitals.maxHealth * 0.35),
    );
    return;
  }

  state.phase = "lost";
  setMessage(state, reason, 99);
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

/**
 * Сүнсний орон — шулмасын туслахууд энд байна.
 * ensureShulmasHelpers()-ийг дуудагч (өвгөн гэх мэт) өмнө нь ажиллуулна.
 */
export function enterSpiritWorld(state: GameState): void {
  if (state.phase === "spirit" && state.spiritMode === "shulmas") return;

  stashRealWorldThreats(state);
  state.world.wolves = [];
  state.world.thieves = [];

  state.phase = "spirit";
  state.spiritMode = "shulmas";
  state.spiritTransition = 1.2;
  state.spiritCleared = false;
  state.world.elder.eyeMode = "spirit";
  resetPlayerCombatForSpirit(state);
  sfx("howl");
  setMessage(
    state,
    "Сүнсний орон… цаг зогсов. Шулмасын туслахуудыг цэвэрлэ. E — буцах.",
    5,
  );
}

/**
 * Шулмасын сүнсний орон — Төмөр шулмас / туслахууд энд л байдаг.
 * Бодит ертөнцийн чоно/хулгайчийг түр хадгална, ердийн сүнсний чоно spawn хийхгүй.
 */
export function enterShulmasSpirit(state: GameState): void {
  if (state.phase === "spirit" && state.spiritMode === "shulmas") return;

  stashRealWorldThreats(state);
  state.world.wolves = [];
  state.world.thieves = [];

  state.phase = "spirit";
  state.spiritMode = "shulmas";
  state.spiritTransition = 1.15;
  state.spiritCleared = false;
  state.world.elder.eyeMode = "spirit";

  // Тулаанд бэлэн: тэнхэл нөхөгдөнө, зэвсэггүй ч сүнсний сум (K) ажиллана
  resetPlayerCombatForSpirit(state);

  sfx("howl");
  setMessage(
    state,
    "Шулмасын сүнсний орон… J — ойрын цохилт, K — сүнсний сум. Туслахууд голын цаана.",
    4.5,
  );
}

export function exitSpiritWorld(state: GameState, msg?: string): void {
  if (state.phase !== "spirit" && !state.spiritReturnPos) return;

  const tumur = state.world.tumurShulmas;
  // Boss тулаан дуусаагүй бол сүнснээс гарахыг хориглоно
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

  // Тулаан дууссан бол ареныйг хаана
  if (tumur.active && tumur.defeated) {
    tumur.active = false;
    tumur.phase = "sealed";
    tumur.phaseTimer = 0;
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
    // Шулмасын ареныйн дараа хаалганы дэргэд буцаана
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
  state.spiritCleared = false;
  state.spiritMode = "purge";
  state.spiritTransition = 0.85;
  state.world.elder.eyeMode = "idle";

  if (parentsFreed) {
    // Аав ээжтэйгээ гэртээ буцаж, тоглоом үргэлжилнэ
    ensureParents(state);
    state.player.pos = {
      x: state.world.campPos.x + 28,
      y: state.world.campPos.y + 55,
    };
    state.phase = "playing";
    setMessage(
      state,
      "Шулмас аав ээжийг буцаан өглөө. Одоо гэр бүлээрээ хамт амьдарна!",
      6,
    );
    sfx("win");
    return;
  }

  state.phase = "playing";
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

function spawnSpiritEnemies(state: GameState): void {
  const origin = state.player.pos;
  const count = 3 + Math.min(2, Math.floor((state.level - 1) / 2));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 90 + Math.random() * 50;
    const pos: Vector2 = {
      x: origin.x + Math.cos(a) * dist,
      y: origin.y + Math.sin(a) * dist,
    };
    const hp = Math.round(28 + state.level * 4);
    state.world.wolves.push({
      id: allocId(state),
      kind: "wolf",
      pos,
      vel: { x: 0, y: 0 },
      hp,
      maxHp: hp,
      radius: 14,
      speed: 100 + Math.min(25, state.level * 2),
      attackCooldown: 0.4 + Math.random() * 0.6,
      damage: 10 + state.level,
      scale: 1.05 + Math.min(0.35, state.level * 0.04),
      flash: 0,
      face: 1,
      alive: true,
      posture: 0,
      maxPosture: 90,
      postureRegenDelay: 0,
      postureRecoveryDelay: 0,
      attackPhase: "chasing",
      attackKind: "leap",
      attackTimer: 0,
      combatPhase: "idle",
      combatTimer: 0,
      attackDirection: { x: 0, y: 1 },
      attackHitDone: false,
      knockbackResistance: 0.2,
    });
  }
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
      setMessage(
        state,
        "Шулмасын туслахууд унав. E — бодит ертөнц рүү буцах · хаалга руу оч.",
        5,
      );
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

  if (inSpirit) {
    ctx.fillStyle = shulmas
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
    if (shulmas) {
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
    ctx.fillStyle = shulmas
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
