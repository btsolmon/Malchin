import { PASTURE_RADIUS, WORLD_H, WORLD_W } from "../types";
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

  // Өвсний ширхэг
  ctx.lineWidth = 1;
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    const h = randRange(3, 7);
    const lean = randRange(-2, 2);
    ctx.strokeStyle = winter
      ? `rgba(${200 + Math.floor(Math.random() * 40)},${210 + Math.floor(Math.random() * 30)},205,0.5)`
      : `rgba(${40 + Math.floor(Math.random() * 40)},${95 + Math.floor(Math.random() * 50)},${40 + Math.floor(Math.random() * 25)},0.6)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - h);
    ctx.stroke();
  }

  // Чулуунууд
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    const r = randRange(3, 9);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(x + 1.5, y + 1.5, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = winter ? "#9aa4a0" : "#8a8f88";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(
      x - r * 0.25,
      y - r * 0.25,
      r * 0.45,
      r * 0.3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Цэцэг (өвөлд байхгүй)
  if (!winter) {
    const petals = ["#f5f0e0", "#f0d060", "#e890b0", "#c8d8f8"];
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      const c = petals[Math.floor(Math.random() * petals.length)];
      ctx.strokeStyle = "rgba(50,90,45,0.7)";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 4);
      ctx.stroke();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y - 5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Гэрийн шороон талбай
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const padG = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
  padG.addColorStop(0, winter ? "#8a7a60" : "#6f5742");
  padG.addColorStop(1, winter ? "rgba(138,122,96,0)" : "rgba(111,87,66,0)");
  ctx.fillStyle = padG;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  // Шороон дээрх толбо
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 90;
    ctx.fillStyle = "rgba(60,45,32,0.25)";
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(a) * r,
      cy + Math.sin(a) * r,
      randRange(2, 5),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Бэлчээрийн хилийн тойрог (бүдэг)
  ctx.strokeStyle = winter ? "rgba(140,120,80,0.25)" : "rgba(232,197,106,0.18)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.arc(cx, cy, PASTURE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  return canvas;
}
