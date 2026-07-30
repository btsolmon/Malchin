import type { Vector2 } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function length(v: Vector2): number {
  return Math.hypot(v.x, v.y);
}

export function normalize(v: Vector2): Vector2 {
  const len = length(v);
  if (len <= 0.00001) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function safeDirection(
  direction: Vector2,
  fallback: Vector2 = { x: 0, y: 1 },
): Vector2 {
  const normalized = normalize(direction);
  if (normalized.x !== 0 || normalized.y !== 0) return normalized;

  const normalizedFallback = normalize(fallback);
  if (normalizedFallback.x !== 0 || normalizedFallback.y !== 0) {
    return normalizedFallback;
  }

  return { x: 0, y: 1 };
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

export function addScaled(
  position: Vector2,
  direction: Vector2,
  amount: number,
): Vector2 {
  return {
    x: position.x + direction.x * amount,
    y: position.y + direction.y * amount,
  };
}

export function directionFromTo(from: Vector2, to: Vector2): Vector2 {
  return safeDirection({ x: to.x - from.x, y: to.y - from.y });
}

export function isInFacingCone(
  origin: Vector2,
  target: Vector2,
  facing: Vector2,
  reach: number,
  minimumDot: number,
): boolean {
  const targetDistance = distance(origin, target);
  if (targetDistance > reach) return false;
  if (targetDistance <= 0.001) return true;

  const toTarget = directionFromTo(origin, target);
  return dot(toTarget, safeDirection(facing)) >= minimumDot;
}
