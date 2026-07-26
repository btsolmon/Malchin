// Хүн 5 — particle, floating text, дэлгэцийн эффектүүд

import type { GameState, Vector2 } from "../game/types";
import { dist, randRange } from "../game/utils";

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

  // Галын оч
  const fire = state.world.campfire;
  if (fire.lit) {
    fx.emberAcc += dt;
    while (fx.emberAcc > 0.08) {
      fx.emberAcc -= 0.08;
      fx.particles.push({
        pos: { x: fire.pos.x + randRange(-6, 6), y: fire.pos.y - 8 },
        vel: { x: randRange(-14, 14), y: randRange(-70, -30) },
        life: randRange(0.4, 0.9),
        maxLife: 0.9,
        size: randRange(1.5, 3),
        color: Math.random() < 0.5 ? "#ffb347" : "#ff7733",
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
