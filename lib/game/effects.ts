// Хүн 5 — particle, floating text, дэлгэцийн эффектүүд

import type {
  CameraShakeState,
  GameState,
  ScreenPulseState,
  Vector2,
} from "../game/types";
import { CAMPFIRE_IGNITE_SEC } from "../game/types";
import { clamp, dist, randRange } from "../game/utils";

const hitStopRemaining = new WeakMap<GameState, number>();

export function startCameraShake(
  state: GameState,
  duration: number,
  strength: number,
): void {
  if (duration <= 0 || strength <= 0) return;
  const shake = state.fx.cameraShake;
  shake.remaining = Math.max(shake.remaining, duration);
  shake.duration = Math.max(shake.duration, duration);
  shake.strength = Math.min(16, Math.max(shake.strength, strength));
}

export function getCameraShakeOffset(shake: CameraShakeState): Vector2 {
  if (shake.remaining <= 0 || shake.duration <= 0 || shake.strength <= 0) {
    return { x: 0, y: 0 };
  }
  const ratio = clamp(shake.remaining / shake.duration, 0, 1);
  const strength = shake.strength * ratio * ratio;
  const progress = 1 - ratio;
  return {
    x: Math.sin(progress * Math.PI * 19) * strength,
    y: Math.sin(progress * Math.PI * 23 + 0.7) * strength * 0.72,
  };
}

export function startScreenPulse(
  state: GameState,
  duration: number,
  intensity: number,
  color = "190,24,30",
): void {
  if (duration <= 0 || intensity <= 0) return;
  const pulse = state.fx.screenPulse;
  pulse.remaining = Math.max(pulse.remaining, duration);
  pulse.duration = Math.max(pulse.duration, duration);
  pulse.intensity = Math.min(0.45, Math.max(pulse.intensity, intensity));
  pulse.color = color;
}

function updateTransientFeedback(
  shake: CameraShakeState,
  pulse: ScreenPulseState,
  dt: number,
): void {
  shake.remaining = Math.max(0, shake.remaining - dt);
  if (shake.remaining <= 0) {
    shake.duration = 0;
    shake.strength = 0;
  }
  pulse.remaining = Math.max(0, pulse.remaining - dt);
  if (pulse.remaining <= 0) {
    pulse.duration = 0;
    pulse.intensity = 0;
  }
}

export function triggerHitStop(state: GameState, seconds: number): void {
  if (seconds <= 0) return;
  hitStopRemaining.set(
    state,
    Math.max(hitStopRemaining.get(state) ?? 0, seconds),
  );
}

export function updateHitStop(state: GameState, dt: number): boolean {
  const remaining = hitStopRemaining.get(state) ?? 0;
  if (remaining <= 0) return false;
  const next = Math.max(0, remaining - dt);
  if (next <= 0) hitStopRemaining.delete(state);
  else hitStopRemaining.set(state, next);
  return true;
}

export function spawnParticles(
  state: GameState,
  pos: Vector2,
  count: number,
  color: string,
  opts: { speed?: number; life?: number; size?: number; gravity?: number } = {},
): void {
  const { speed = 90, life = 0.5, size = 3, gravity = 160 } = opts;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = randRange(speed * 0.3, speed);
    state.fx.particles.push({
      pos: { x: pos.x, y: pos.y },
      vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp - speed * 0.3 },
      life: life * randRange(0.6, 1.2),
      maxLife: life,
      size: size * randRange(0.6, 1.3),
      color,
      gravity,
    });
  }
}

export function spawnSoulRelease(
  state: GameState,
  pos: Vector2,
  radius: number,
  color = "#d8f4ff",
): void {
  state.fx.souls.push({
    pos: { x: pos.x, y: pos.y - Math.max(10, radius * 0.35) },
    life: 1.35,
    maxLife: 1.35,
    radius: Math.max(12, radius),
    color,
    seed: Math.random() * Math.PI * 2,
  });
}

export function spawnImpactBurst(
  state: GameState,
  pos: Vector2,
  opts: { heavy?: boolean; color?: string } = {},
): void {
  const heavy = opts.heavy ?? false;
  spawnParticles(state, pos, heavy ? 14 : 8, "#fff1b8", {
    speed: heavy ? 190 : 145,
    life: heavy ? 0.22 : 0.16,
    size: heavy ? 3.2 : 2.4,
    gravity: 35,
  });
  spawnParticles(state, pos, heavy ? 9 : 5, opts.color ?? "#d64545", {
    speed: heavy ? 135 : 100,
    life: heavy ? 0.34 : 0.26,
    size: heavy ? 3.2 : 2.5,
    gravity: 110,
  });
  state.fx.shake = Math.max(state.fx.shake, heavy ? 7 : 4);
}

export function spawnText(
  state: GameState,
  pos: Vector2,
  text: string,
  color = "#ffffff",
): void {
  // Ойролцоох шинэ текстүүдийг тоолж, дээшээ зайлуулна (давхраалахаас сэргийлнэ)
  let stack = 0;
  for (const t of state.fx.texts) {
    if (t.life > t.maxLife * 0.35 && dist(t.pos, pos) < 56) stack++;
  }
  state.fx.texts.push({
    pos: {
      x: pos.x + randRange(-10, 10) + (stack % 2 === 0 ? -6 : 6),
      y: pos.y - 8 - stack * 22,
    },
    text,
    life: 1.5,
    maxLife: 1.5,
    color,
  });
}

export function updateEffects(state: GameState, dt: number): void {
  const fx = state.fx;
  updateTransientFeedback(fx.cameraShake, fx.screenPulse, dt);

  for (const soul of fx.souls) {
    soul.life -= dt;
    soul.pos.y -= 34 * dt;
    soul.pos.x += Math.sin((soul.maxLife - soul.life) * 8 + soul.seed) * 4 * dt;
  }
  fx.souls = fx.souls.filter((soul) => soul.life > 0);

  for (const p of fx.particles) {
    p.life -= dt;
    p.vel.y += p.gravity * dt;
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);

  for (const t of fx.texts) {
    t.life -= dt;
    t.pos.y -= 26 * dt;
  }
  fx.texts = fx.texts.filter((t) => t.life > 0);

  fx.shake = Math.max(0, fx.shake - dt * 14);
  fx.hurtFlash = Math.max(0, fx.hurtFlash - dt * 2.2);

  // Галын оч — зөвхөн гаднах гал байрлуулсан үед
  const fire = state.world.campfire;
  if (
    fire.placed &&
    !state.parentsReturned &&
    (fire.lit || fire.igniting > 0)
  ) {
    fx.emberAcc += dt;
    const interval = fire.igniting > 0 ? 0.05 : 0.08;
    while (fx.emberAcc > interval) {
      fx.emberAcc -= interval;
      const igniteP =
        fire.igniting > 0
          ? Math.max(0.3, 1 - fire.igniting / CAMPFIRE_IGNITE_SEC)
          : 1;
      fx.particles.push({
        pos: {
          x: fire.pos.x + randRange(-6, 6),
          y: fire.pos.y - 8,
        },
        vel: {
          x: randRange(-14, 14),
          y: randRange(-70 * igniteP, -30 * igniteP),
        },
        life: randRange(0.4, 0.9),
        maxLife: 0.9,
        size: randRange(1.5, 3) * igniteP,
        color:
          fire.igniting > 0 && Math.random() < 0.4
            ? "#c8a070"
            : Math.random() < 0.5
              ? "#ffb347"
              : "#ff7733",
        gravity: -30,
      });
    }
  }

  // Явахад тоос
  if (state.player.moving && state.phase === "playing") {
    fx.dustAcc += dt;
    if (fx.dustAcc > 0.18) {
      fx.dustAcc = 0;
      fx.particles.push({
        pos: {
          x: state.player.pos.x + randRange(-4, 4),
          y: state.player.pos.y + 10,
        },
        vel: { x: randRange(-10, 10), y: randRange(-16, -4) },
        life: 0.4,
        maxLife: 0.4,
        size: randRange(2, 4),
        color: "rgba(150,130,95,0.5)",
        gravity: 0,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Flock helpers
// ---------------------------------------------------------------------------
