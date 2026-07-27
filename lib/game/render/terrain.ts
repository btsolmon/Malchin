import { WORLD_H, WORLD_W } from "../types";
import { randRange } from "../utils";

export function renderTerrain(winter: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext("2d")!;

  //Суурь градиент
  const base = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  if (winter) {
    base.addColorStop(0, "#c2cfc0");
    base.addColorStop(1, "#a8bba6");
  } else {
    base.addColorStop(0, "#4b7d44");
    base.addColorStop(1, "#3b6636");
  }
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Өнгөний том толбо (нуга)

  for (let i = 0; i < 70; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    const r = randRange(60, 220);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (winter) {
      g.addColorStop(0, "rgba(255,255,255,0.16)");
      g.addColorStop(1, "rgba(255,255,255,0)");
    } else {
      const light = Math.random() < 0.5;
      g.addColorStop(
        0,
        light ? "rgba(120,170,90,0.18)" : "rgba(40,80,40,0.15)",
      );
      g.addColorStop(1, "rgba(0,0,0,0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}
