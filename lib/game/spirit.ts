// Сүнсний ертөнц — орох / гарах / цаг зогсох / амь (сүнс)

import { sfx } from "./audio";
import { spawnText } from "./effects";
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

export function enterSpiritWorld(state: GameState): void {
  state.spiritReturnPos = { ...state.player.pos };
  state.spiritSavedWolves = state.world.wolves.map(cloneWolf);
  state.spiritSavedThieves = state.world.thieves.map((t) => ({
    ...t,
    pos: { ...t.pos },
    vel: { ...t.vel },
    escapeTarget: { ...t.escapeTarget },
    attackDirection: { ...t.attackDirection },
  }));

  // Бодит дэлхийн дайснуудыг түр арилгана — цаг зогссон, малд аюулгүй
  state.world.wolves = [];
  state.world.thieves = [];

  spawnSpiritEnemies(state);

  state.phase = "spirit";
  state.spiritTransition = 1.2;
  state.spiritCleared = false;
  state.world.elder.eyeMode = "spirit";
  sfx("howl");
  setMessage(
    state,
    "Сүнсний орон… цаг зогсов. Дайснуудыг цэвэрлэ, E — буцах.",
    5,
  );
}

export function exitSpiritWorld(state: GameState, msg?: string): void {
  if (state.phase !== "spirit" && !state.spiritReturnPos) return;

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
    state.player.pos = { ...state.spiritReturnPos };
  }
  state.spiritReturnPos = null;
  state.spiritCleared = false;
  state.spiritTransition = 0.85;
  state.phase = "playing";
  state.world.elder.eyeMode = "idle";
  setMessage(
    state,
    msg ??
      (state.spiritCleared
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

  if (inSpirit) {
    ctx.fillStyle = "rgba(20, 40, 90, 0.38)";
    ctx.fillRect(0, 0, viewW, viewH);
    const g = ctx.createRadialGradient(
      viewW / 2,
      viewH / 2,
      40,
      viewW / 2,
      viewH / 2,
      Math.max(viewW, viewH) * 0.7,
    );
    g.addColorStop(0, "rgba(80,140,220,0.05)");
    g.addColorStop(1, "rgba(8,16,48,0.45)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  if (t > 0) {
    const a = Math.min(1, t > 0.6 ? (1.2 - t) / 0.4 : t / 0.6);
    ctx.fillStyle = `rgba(40, 90, 180, ${0.55 * a})`;
    ctx.fillRect(0, 0, viewW, viewH);
    if (a > 0.35) {
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(200,230,255,${a})`;
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillText(
        inSpirit || t > 0.5 ? "СҮНСНИЙ ОРОН" : "БОДИТ ЕРТӨНЦ",
        viewW / 2,
        viewH / 2,
      );
      ctx.textAlign = "left";
    }
  }
}
