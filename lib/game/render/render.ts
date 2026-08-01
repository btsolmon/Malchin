import { Camera, FENCE_GRID, GameState, HAY_GRASS_COST, HAY_HARVEST_RADIUS, MAX_HAY, MAX_PASTURE_GRASS, PASTURE_RADIUS, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from "../types";
import { drawHud, drawMinimap, drawThreatArrows } from "../ui";
import { canHarvestHay, clamp, dist, fenceOrientFromFacing, fencePlacePos, gerDoorPos, pastureCenter, randRange } from "../utils";
import { drawBear, drawBerryBush, drawCampfire, drawDismantledGer, drawDog, drawElder, drawFeeder, drawFence, drawFenceGhost, drawGer, drawProjectile, drawSheep, drawThief, drawTree, drawWildHorse, drawWolf, drawWorldRock } from "./entities";
import { drawGerInterior } from "./ger";
import {
  drawPlayerWithSprites,
  type PlayerSpriteSet,
} from "./playerSprites";
import {
  drawFirstRouteBolts,
  drawFirstRouteGate,
  drawFirstRouteHint,
  drawMiniBossArena,
  drawMiniBossHud,
  drawRouteEnemy,
  drawSwordDrop,
} from "../firstRoute";

import { drawLighting, drawWeatherFx } from "./lighting";
import { drawRiverFlowOverlay } from "./terrain";
import { getCameraShakeOffset } from "../effects";
import {
  drawTumurShulmas,
  drawTumurShulmasArena,
  drawTumurShulmasExit,
  drawTumurShulmasGate,
  drawTumurShulmasHint,
  drawTumurShulmasHud,
  drawTumurShulmasNeedles,
  drawTumurShulmasTelegraphs,
  type TumurShulmasSpriteSet,
} from "../tumurShulmas";
import { nearestRiddleHost, spotKindLabel } from "../riddles";
import { nearElder } from "../elder";
import { drawSpiritOverlay } from "../spirit";

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  terrain: HTMLCanvasElement;
  terrainWinter: HTMLCanvasElement;
  lightCanvas: HTMLCanvasElement;
  vignette: HTMLCanvasElement;
  playerSprites: PlayerSpriteSet;
  tumurShulmasSprites: TumurShulmasSpriteSet;
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
  const bossShake = getCameraShakeOffset(state.fx.cameraShake);
  return {
    x:
      clamp(state.player.pos.x - VIEW_W / 2, 0, WORLD_W- VIEW_W) +
      (shake > 0 ? randRange(-shake, shake) : 0) +
      bossShake.x,
    y:
      clamp(state.player.pos.y - VIEW_H / 2, 0, WORLD_H - VIEW_H) +
      (shake > 0 ? randRange(-shake, shake) : 0) +
      bossShake.y,
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
    drawGerInterior(ctx, state, time, rc.playerSprites);
    return;
  }

  const cam = getCamera(state);
  const world = state.world;

  // Газар
  const terrain = world.season === "winter" ? rc.terrainWinter : rc.terrain;
  ctx.drawImage(terrain, cam.x, cam.y, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  drawRiverFlowOverlay(ctx, cam, time, world.season === "winter");

  const inShulmasSpirit =
    state.phase === "spirit" && state.spiritMode === "shulmas";
  if (inShulmasSpirit) {
    drawTumurShulmasArena(ctx, state, cam, time);
    drawTumurShulmasTelegraphs(ctx, state, cam, time);
    drawMiniBossArena(ctx, state, cam, time);
  }

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

  // Бэлчээр — өвс идэгдэх тусам гэрийн буурь шиг бүдэг бор хөрс илэрнэ
  // Өнгө: terrain гэрийн шороон талбай (#6f5742) — тод шавар шиг биш
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
        // Зөөлөн радиал — ирмэг дээр хурдан бүдгэрнэ (хатуу диск биш)
        const soil = ctx.createRadialGradient(px, py, 0, px, py, pr);
        soil.addColorStop(0, `rgba(111,87,66,${0.22 + local * 0.16})`);
        soil.addColorStop(0.45, `rgba(104,80,60,${0.14 + local * 0.1})`);
        soil.addColorStop(0.78, `rgba(95,72,54,${0.06 + local * 0.05})`);
        soil.addColorStop(1, "rgba(95,72,54,0)");
        ctx.fillStyle = soil;
        ctx.beginPath();
        // Бага зэрэг жигд бус эллипс — геометрийн төгс тойрог биш
        const wobble = 0.88 + ((i * 37) % 11) * 0.012;
        ctx.ellipse(
          px,
          py,
          pr * wobble,
          pr * (0.62 + ((i * 13) % 7) * 0.02),
          a * 0.4 + (i % 5) * 0.15,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      // Бүрэн шавхагдахад толбууд нийлж нэг буйр болно — зөөлөн, ирмэгээ уусгасан
      if (depleted > 0.8) {
        const w = clamp((depleted - 0.8) / 0.2, 0, 1);
        const wash = ctx.createRadialGradient(gx, gy, 0, gx, gy, rx);
        wash.addColorStop(0, `rgba(111,87,66,${0.28 * w})`);
        wash.addColorStop(0.35, `rgba(104,80,60,${0.18 * w})`);
        wash.addColorStop(0.65, `rgba(95,72,54,${0.08 * w})`);
        wash.addColorStop(0.88, `rgba(90,70,52,${0.03 * w})`);
        wash.addColorStop(1, "rgba(90,70,52,0)");
        ctx.fillStyle = wash;
        // Жигд бус ирмэг — долгионтой зам (төгс эллипс биш)
        ctx.beginPath();
        const steps = 48;
        for (let s = 0; s <= steps; s++) {
          const t = (s / steps) * Math.PI * 2;
          const edge =
            1 +
            Math.sin(t * 3.0 + 0.7) * 0.04 +
            Math.sin(t * 5.0 + 1.9) * 0.025 +
            Math.sin(t * 7.0 + 0.3) * 0.015;
          const x = gx + Math.cos(t) * rx * edge;
          const y = gy + Math.sin(t) * ry * edge;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  if (!world.gerPacked) {
    drawables.push({
      y: center.y - 20,
      key: -2,
      draw: () =>
        drawGer(
          ctx,
          center.x - 46 - cam.x,
          center.y - 26 - cam.y,
          world.season === "winter",
        ),
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

  // Тэвш
  if (!world.gerPacked) {
    drawables.push({
      y: world.feeder.pos.y,
      key: -4,
      draw: () => drawFeeder(ctx, world.feeder, cam),
    });
  }

  for (const tree of world.trees) {
    if (
      (world.firstRoute.bossStarted &&
        !world.firstRoute.swordDrop.collected &&
        dist(tree.pos, world.firstRoute.arenaCenter) <
          world.firstRoute.arenaRadius + 34) ||
      (world.tumurShulmas.active &&
        dist(tree.pos, world.tumurShulmas.arenaCenter) <
          world.tumurShulmas.arenaRadius + 34)
    ) {
      continue;
    }
    drawables.push({
      y: tree.pos.y,
      key: tree.id,
      draw: () => drawTree(ctx, tree, cam, time, windAmp),
    });
  }
  for (const bush of world.bushes) {
    if (
      (world.firstRoute.bossStarted &&
        !world.firstRoute.swordDrop.collected &&
        dist(bush.pos, world.firstRoute.arenaCenter) <
          world.firstRoute.arenaRadius + 20) ||
      (world.tumurShulmas.active &&
        dist(bush.pos, world.tumurShulmas.arenaCenter) <
          world.tumurShulmas.arenaRadius + 20)
    ) {
      continue;
    }
    drawables.push({
      y: bush.pos.y,
      key: 1000 + bush.id,
      draw: () => drawBerryBush(ctx, bush, cam, time),
    });
  }
  for (const rock of world.rocks) {
    drawables.push({
      y: rock.pos.y,
      key: 7000 + rock.id,
      draw: () => drawWorldRock(ctx, rock, cam, time),
    });
  }
  drawables.push({
    y: world.elder.gerPos.y,
    key: -6,
    draw: () => drawDismantledGer(ctx, world.elder.gerPos, cam, time),
  });
  drawables.push({
    y: world.elder.pos.y,
    key: -5,
    draw: () => drawElder(ctx, world.elder, cam, time),
  });
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
  // Хараалт / Хар төмөр хаалга — зөвхөн шулмасын сүнсний оронд
  if (state.phase === "spirit" && state.spiritMode === "shulmas") {
    drawables.push({
      y: world.firstRoute.gatePos.y,
      key: 5800,
      draw: () => drawFirstRouteGate(ctx, state, cam, time),
    });
    if (world.tumurShulmas.active) {
      drawables.push({
        y: world.tumurShulmas.exitPos.y,
        key: 5901,
        draw: () => drawTumurShulmasExit(ctx, state, cam, time),
      });
    } else {
      drawables.push({
        y: world.tumurShulmas.gatePos.y,
        key: 5900,
        draw: () => drawTumurShulmasGate(ctx, state, cam, time),
      });
    }
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
  for (const enemy of world.firstRoute.enemies) {
    // Туслахууд зөвхөн шулмасын сүнсний оронд харагдана
    if (state.phase !== "spirit" || state.spiritMode !== "shulmas") continue;
    if (!enemy.alive && enemy.deathTimer <= 0) continue;
    drawables.push({
      y: enemy.pos.y,
      key: 7000 + enemy.id,
      draw: () => drawRouteEnemy(ctx, enemy, cam, time),
    });
  }
  if (
    world.firstRoute.swordDrop.visible &&
    state.phase === "spirit" &&
    state.spiritMode === "shulmas"
  ) {
    drawables.push({
      y: world.firstRoute.swordDrop.pos.y,
      key: 12100,
      draw: () => drawSwordDrop(ctx, state, cam, time),
    });
  }
  if (
    world.tumurShulmas.active &&
    state.phase === "spirit" &&
    state.spiritMode === "shulmas"
  ) {
    drawables.push({
      y: world.tumurShulmas.pos.y,
      key: 11900,
      draw: () =>
        drawTumurShulmas(
          ctx,
          state,
          cam,
          time,
          rc.tumurShulmasSprites,
        ),
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
    draw: () =>
      drawPlayerWithSprites(
        ctx,
        state.player,
        cam,
        time,
        rc.playerSprites,
        state.fx.hurtFlash,
        world.gerPacked,
      ),
  });

  drawables.sort((a, b) => Math.round(a.y) - Math.round(b.y) || a.key - b.key);
  for (const d of drawables) d.draw();

  // Сумнууд — бүх объектын дээр
  for (const p of world.projectiles) drawProjectile(ctx, p, cam);
  if (state.phase === "spirit" && state.spiritMode === "shulmas") {
    drawFirstRouteBolts(ctx, state, cam, time);
    drawTumurShulmasNeedles(ctx, state, cam);
  }

  // Гэрт орох / өвс хадах / тэвш / нүүдэл заавар
  if (state.phase === "spirit") {
    const tx = state.player.pos.x - cam.x;
    const ty = state.player.pos.y - 42 - cam.y;
    ctx.textAlign = "center";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 3;
    const tip =
      state.spiritMode === "shulmas"
        ? state.spiritCleared
          ? "E — бодит ертөнц рүү буцах"
          : world.tumurShulmas.active
            ? "Төмөр шулмастай тулаан · дуустал гарахгүй"
            : "Шулмасын туслахууд · E — буцах"
        : state.spiritCleared
          ? "E — бодит ертөнц рүү буцах"
          : "Сүнсний дайснууд · E/P — гарах";
    ctx.strokeText(tip, tx, ty);
    ctx.fillStyle =
      state.spiritMode === "shulmas" ? "#ffb0a8" : "#a8d4ff";
    ctx.fillText(tip, tx, ty);
    ctx.textAlign = "left";
  } else if (state.phase === "playing") {
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
    } else if (nearElder(state)) {
      const tx = world.elder.pos.x - cam.x;
      const ty = world.elder.pos.y - 36 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      const tip = "E — Өвгөнтэй ярих / арилжаа";
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#b8d0ff";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else {
      const nearRiddle = nearestRiddleHost(
        state.player.pos,
        world,
        state.player.radius + 28,
      );
      if (nearRiddle && !nearRiddle.solved) {
        const tx = nearRiddle.pos.x - cam.x;
        const ty = nearRiddle.pos.y - 28 - cam.y;
        ctx.textAlign = "center";
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.lineWidth = 3;
        const tip = `E — ${spotKindLabel(nearRiddle.kind)} · асуулт`;
        ctx.strokeText(tip, tx, ty);
        ctx.fillStyle = "#ffe9a8";
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
  }
  if (state.phase === "playing") {
    drawFirstRouteHint(ctx, state, cam);
  } else if (state.phase === "spirit" && state.spiritMode === "shulmas") {
    drawFirstRouteHint(ctx, state, cam);
    drawTumurShulmasHint(ctx, state, cam);
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

  for (const soul of state.fx.souls) {
    const ratio = clamp(soul.life / soul.maxLife, 0, 1);
    const progress = 1 - ratio;
    ctx.globalAlpha = ratio * 0.7;
    ctx.strokeStyle = soul.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      soul.pos.x - cam.x + Math.sin(progress * 10 + soul.seed) * 3.5,
      soul.pos.y - cam.y,
      soul.radius * (0.35 + progress * 0.55),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
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

  // Гэрэлтүүлэг + цаг агаар (сүнсний орноос гадна)
  if (state.phase !== "spirit") {
    drawLighting(ctx, rc.lightCanvas, state, cam, time);
    drawWeatherFx(ctx, world, time);
  }

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
  if (state.fx.screenPulse.remaining > 0 && state.fx.screenPulse.duration > 0) {
    const pulse = state.fx.screenPulse;
    const ratio = pulse.remaining / pulse.duration;
    ctx.fillStyle = `rgba(${pulse.color},${pulse.intensity * ratio})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawSpiritOverlay(ctx, state, VIEW_W, VIEW_H);

  if (state.phase !== "menu") {
    drawThreatArrows(ctx, state, cam);
    drawMinimap(ctx, state, cam);
  }
  drawHud(ctx, state);
  if (state.phase === "spirit" && state.spiritMode === "shulmas") {
    drawMiniBossHud(ctx, state);
    drawTumurShulmasHud(ctx, state);
  }
}
