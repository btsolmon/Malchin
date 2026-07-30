import { Camera, FENCE_GRID, GameState, HAY_GRASS_COST, HAY_HARVEST_RADIUS, MAX_HAY, MAX_PASTURE_GRASS, PASTURE_RADIUS, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from "../types";
import { drawHud, drawMinimap, drawThreatArrows } from "../ui";
import { canHarvestHay, clamp, dist, fenceOrientFromFacing, fencePlacePos, gerDoorPos, pastureCenter, randRange } from "../utils";
import { drawBear, drawBerryBush, drawCampfire, drawDog, drawFeeder, drawFence, drawFenceGhost, drawGer, drawPlayer, drawProjectile, drawSheep, drawThief, drawTree, drawWildHorse, drawWolf } from "./entities";
import { drawGerInterior } from "./ger";

import { drawLighting, drawWeatherFx } from "./lighting";

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  terrain: HTMLCanvasElement;
  terrainWinter: HTMLCanvasElement;
  lightCanvas: HTMLCanvasElement;
  vignette: HTMLCanvasElement;
}

/** Гэрийн дэргэд өвсний овоо */
function drawHaystack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hay: number,
): void {
  const t = Math.min(1, hay / Math.max(40, MAX_HAY * 0.4));
  const w = 14 + t * 16;
  const h = 10 + t * 18;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 2, w * 0.7, w * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9a8a3a";
  ctx.beginPath();
  ctx.moveTo(x - w * 0.55, y);
  ctx.quadraticCurveTo(x, y - h, x + w * 0.55, y);
  ctx.quadraticCurveTo(x, y + h * 0.35, x - w * 0.55, y);
  ctx.fill();
  ctx.fillStyle = "#b8a84a";
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.35, w * 0.35, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(70,55,20,0.45)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const yy = y - h * 0.15 * i;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.4, yy);
    ctx.quadraticCurveTo(x, yy + 2, x + w * 0.4, yy);
    ctx.stroke();
  }
}


export function getCamera(state: GameState): Camera {
  const shake = state.fx.shake;
  return {
    x:
      clamp(state.player.pos.x - VIEW_W / 2, 0, WORLD_W- VIEW_W) +
      (shake > 0 ? randRange(-shake, shake) : 0),
    y:
      clamp(state.player.pos.y - VIEW_H / 2, 0, WORLD_H - VIEW_H) +
      (shake > 0 ? randRange(-shake, shake) : 0),
  };
}

export function render(
  rc: RenderContext,
  state: GameState,
  time: number,
): void {
  const { ctx } = rc;

  // Гэрийн дотор — тусдаа дэлгэц
  if (state.phase === "ger") {
    drawGerInterior(ctx, state, time);
    return;
  }

  const cam = getCamera(state);
  const world = state.world;

  // Газар
  const terrain = world.season === "winter" ? rc.terrainWinter : rc.terrain;
  ctx.drawImage(terrain, cam.x, cam.y, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);

  // Салхины хүч (модны найгалт)
  const windAmp =
    world.weather === "storm"
      ? 5
      : world.weather === "wind"
        ? 3
        : world.weather === "snow"
          ? 2
          : 1;

  // Гүнээр эрэмбэлсэн объектууд.
  // key — тогтвортой хоёрдогч эрэмбэ: ойролцоо y-тэй объектууд давхцахад
  // зурах дараалал frame бүр солигдож анивчихаас сэргийлнэ.
  type Drawable = { y: number; key: number; draw: () => void };
  const drawables: Drawable[] = [];

  const center = pastureCenter(world);

  // Бэлчээр — өвс идэгдэх тусам буйр шиг бор хөрсний толбо аажмаар илэрнэ
  if (!world.gerPacked && world.season !== "winter") {
    const fill = clamp(
      world.pastureGrass / Math.max(1, MAX_PASTURE_GRASS),
      0,
      1,
    );
    const depleted = 1 - fill;
    if (depleted > 0.03) {
      const gx = center.x - cam.x;
      const gy = center.y + 10 - cam.y;
      const rx = PASTURE_RADIUS;
      const ry = PASTURE_RADIUS * 0.72;

      // Тогтмол байрлалтай толбууд — идэгдэх тусам нэг нэгээрээ гарч томорно
      const N = 26;
      for (let i = 0; i < N; i++) {
        const threshold = (i + 0.5) / (N + 2);
        if (depleted < threshold) continue;
        // Толбо шинээр гарахдаа жижигхэн, дараа нь томорно
        const local = clamp((depleted - threshold) / 0.3, 0, 1);
        const a = i * 2.399963; // алтан өнцөг — жигд тархалт
        const rr = Math.sqrt((i + 0.5) / N) * 0.88;
        const px = gx + Math.cos(a) * rr * rx;
        const py = gy + Math.sin(a) * rr * ry;
        const pr = (13 + (i % 4) * 7) * (0.45 + local * 0.55);
        const soil = ctx.createRadialGradient(px, py, pr * 0.15, px, py, pr);
        soil.addColorStop(0, `rgba(124,94,60,${0.5 + local * 0.3})`);
        soil.addColorStop(0.7, `rgba(112,84,54,${0.35 + local * 0.25})`);
        soil.addColorStop(1, "rgba(112,84,54,0)");
        ctx.fillStyle = soil;
        ctx.beginPath();
        ctx.ellipse(px, py, pr, pr * 0.7, a * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Бүрэн шавхагдахад толбууд нийлж нэг буйр болно
      if (depleted > 0.8) {
        const w = clamp((depleted - 0.8) / 0.2, 0, 1);
        const wash = ctx.createRadialGradient(gx, gy, rx * 0.1, gx, gy, rx);
        wash.addColorStop(0, `rgba(118,88,56,${0.55 * w})`);
        wash.addColorStop(0.75, `rgba(112,84,54,${0.4 * w})`);
        wash.addColorStop(1, "rgba(112,84,54,0)");
        ctx.fillStyle = wash;
        ctx.beginPath();
        ctx.ellipse(gx, gy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (!world.gerPacked) {
    drawables.push({
      y: center.y - 20,
      key: -2,
      draw: () => drawGer(ctx, center.x - 46 - cam.x, center.y - 26 - cam.y),
    });
  }
  // Хураасан гэр морь дээр — drawPlayer/drawHorse зурна

  // Өвсний овоо — хадгалсан хэмжээгээр өснө
  if (!world.gerPacked && state.player.inventory.hay > 0) {
    const hayPos = { x: center.x + 58, y: center.y + 28 };
    drawables.push({
      y: hayPos.y,
      key: -3,
      draw: () =>
        drawHaystack(
          ctx,
          hayPos.x - cam.x,
          hayPos.y - cam.y,
          state.player.inventory.hay,
        ),
    });
  }

  // Тэжээгч
  if (!world.gerPacked) {
    drawables.push({
      y: world.feeder.pos.y,
      key: -4,
      draw: () => drawFeeder(ctx, world.feeder, cam),
    });
  }

  for (const tree of world.trees) {
    drawables.push({
      y: tree.pos.y,
      key: tree.id,
      draw: () => drawTree(ctx, tree, cam, time, windAmp),
    });
  }
  for (const bush of world.bushes) {
    drawables.push({
      y: bush.pos.y,
      key: 1000 + bush.id,
      draw: () => drawBerryBush(ctx, bush, cam),
    });
  }
  if (!world.gerPacked) {
    drawables.push({
      y: world.campfire.pos.y,
      key: -1,
      draw: () => drawCampfire(ctx, world.campfire, cam, time),
    });
  }
  for (const fence of world.fences) {
    drawables.push({
      y: fence.pos.y,
      key: 3000 + fence.id,
      draw: () => drawFence(ctx, fence, cam, time),
    });
  }
  if (state.fencePreview && state.phase === "playing") {
    const ghostPos = fencePlacePos(
      state.player.pos,
      state.player.facing,
      FENCE_GRID,
    );
    const ghostOrient = fenceOrientFromFacing(state.player.facing);
    drawables.push({
      y: ghostPos.y,
      key: 2999,
      draw: () => drawFenceGhost(ctx, ghostPos, ghostOrient, cam),
    });
  }
  for (const sheep of world.flock.visuals) {
    drawables.push({
      y: sheep.pos.y,
      key: 2000 + sheep.id,
      draw: () => drawSheep(ctx, sheep, cam, time),
    });
  }
  for (const wh of world.wildHorses) {
    drawables.push({
      y: wh.pos.y,
      key: 2500 + wh.id,
      draw: () => drawWildHorse(ctx, wh, cam, time),
    });
  }
  for (const wolf of world.wolves) {
    drawables.push({
      y: wolf.pos.y,
      key: 2000 + wolf.id,
      draw: () =>
        wolf.kind === "bear"
          ? drawBear(ctx, wolf, cam, time)
          : drawWolf(ctx, wolf, cam, time),
    });
  }
  for (const thief of world.thieves) {
    drawables.push({
      y: thief.pos.y,
      key: 2000 + thief.id,
      draw: () => drawThief(ctx, thief, cam, time),
    });
  }
  if (world.dog) {
    const dog = world.dog;
    drawables.push({
      y: dog.pos.y,
      key: 5000,
      draw: () => drawDog(ctx, dog, cam, time),
    });
  }
  drawables.push({
    y: state.player.pos.y,
    key: Number.MAX_SAFE_INTEGER,
    draw: () => drawPlayer(ctx, state.player, cam, time, world.gerPacked),
  });

  drawables.sort((a, b) => Math.round(a.y) - Math.round(b.y) || a.key - b.key);
  for (const d of drawables) d.draw();

  // Сумнууд — бүх объектын дээр
  for (const p of world.projectiles) drawProjectile(ctx, p, cam);

  // Гэрт орох / өвс хадах / тэжээгч / нүүдэл заавар
  if (state.phase === "playing") {
    const c = pastureCenter(world);
    const gp = gerDoorPos(world);
    const dGer = dist(state.player.pos, gp);
    const dFeed = dist(state.player.pos, world.feeder.pos);
    if (world.gerPacked) {
      const tx = state.player.pos.x - cam.x;
      const ty = state.player.pos.y - 40 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      ctx.strokeText("G — Гэр буулгах (мориноос)", tx, ty);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText("G — Гэр буулгах (мориноос)", tx, ty);
      ctx.textAlign = "left";
    } else if (dGer < 70) {
      const tx = gp.x - cam.x;
      const ty = gp.y - 66 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      ctx.strokeText("E — Гэрт орох · G — моринд ачих", tx, ty);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText("E — Гэрт орох · G — моринд ачих", tx, ty);
      ctx.textAlign = "left";
    } else if (dFeed < world.feeder.radius + 28) {
      const tx = world.feeder.pos.x - cam.x;
      const ty = world.feeder.pos.y - 28 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      const tip = world.flockOut
        ? `E — Мал оруулах / өвс (${Math.floor(world.feeder.hay)})`
        : `E — Мал гаргах / өвс (${Math.floor(world.feeder.hay)})`;
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#c8e070";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else if (
      dist(state.player.pos, c) < HAY_HARVEST_RADIUS &&
      canHarvestHay(world.season) &&
      world.pastureGrass >= HAY_GRASS_COST
    ) {
      const tx = state.player.pos.x - cam.x;
      const ty = state.player.pos.y - 36 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      const tip = `E — Өвс хадах (${Math.ceil(world.pastureGrass)})`;
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#c8e070";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    }
  }

  // Particles
  for (const p of state.fx.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(
      p.pos.x - cam.x,
      p.pos.y - cam.y,
      p.size * (0.5 + a * 0.5),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Хөвөгч текст
  for (const t of state.fx.texts) {
    const a = clamp(t.life / t.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 3;
    ctx.textAlign = "center";
    ctx.strokeText(t.text, t.pos.x - cam.x, t.pos.y - cam.y - 20);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.pos.x - cam.x, t.pos.y - cam.y - 20);
    ctx.textAlign = "left";
  }
  ctx.globalAlpha = 1;

  // Гэрэлтүүлэг + цаг агаар
  drawLighting(ctx, rc.lightCanvas, state, cam, time);
  drawWeatherFx(ctx, world, time);

  // Vignette
  ctx.drawImage(rc.vignette, 0, 0, VIEW_W, VIEW_H);

  // Цохиулах улаан ирмэг
  if (state.fx.hurtFlash > 0) {
    const a = state.fx.hurtFlash * 0.35;
    const g = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.3,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.8,
    );
    g.addColorStop(0, "rgba(200,30,30,0)");
    g.addColorStop(1, `rgba(200,30,30,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  if (state.phase !== "menu") {
    drawThreatArrows(ctx, state, cam);
    drawMinimap(ctx, state, cam);
  }
  drawHud(ctx, state);
}