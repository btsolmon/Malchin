// Хүн 1 (дундын суурь) — математик болон туслах функцүүд

import {
  SEASON_DAYS,
  SEASON_ORDER,
  type GameState,
  type Season,
  type Vector2,
  type WeatherKind,
  type World,
} from "./types";

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(v: Vector2): Vector2 {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function pastureCenter(world: World): Vector2 {
  return { x: world.width / 2, y: world.height / 2 };
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function weatherLabel(w: WeatherKind, season: Season): string {
  const seasonMn: Record<Season, string> = {
    summer: "Зун",
    autumn: "Намар",
    winter: "Өвөл",
    spring: "Хавар",
  };
  const weatherMn: Record<WeatherKind, string> = {
    clear: "Цэлмэг",
    wind: "Салхитай",
    storm: "Бороотой",
    snow: "Цастай",
  };
  return `${seasonMn[season]} · ${weatherMn[w]}`;
}

export function formatClock(timeOfDay: number): string {
  const h = Math.floor(timeOfDay) % 24;
  const m = Math.floor((timeOfDay % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function setMessage(state: GameState, text: string, seconds = 2.5): void {
  state.message = text;
  state.messageTimer = seconds;
}

export function allocId(state: GameState): number {
  state.nextEntityId += 1;
  return state.nextEntityId;
}

export function seasonForDay(day: number): Season {
  return SEASON_ORDER[Math.floor((day - 1) / SEASON_DAYS) % SEASON_ORDER.length];
}

export function isNight(world: World): boolean {
  return world.timeOfDay < 6 || world.timeOfDay > 19;
}

// ---------------------------------------------------------------------------
// XP, Level, Skills
// ---------------------------------------------------------------------------
