import {
  Camera, FENCE_GRID, GameState, HAY_GRASS_COST, HAY_HARVEST_RADIUS, MAX_HAY, MAX_PASTURE_GRASS, PASTURE_RADIUS, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from "../types";
import { drawHud, drawMinimap, drawThreatArrows } from "../ui";
import { canHarvestHay, clamp, dist, fenceOrientFromFacing, fencePlacePos, FLOCK_GATE_RADIUS, flockGatePos, gerDoorPos, pastureCenter, randRange } from "../utils";
import { drawBear, drawBerryBush, drawCampfire, drawDismantledGer, drawDog, drawElder, drawFeeder, drawFence, drawFenceGhost, drawFish, drawFishingRod, drawGer, drawHorse, drawHorseHitch, drawParentNpc, drawProjectile, drawSheep, drawThief, drawTree, drawWildHorse, drawWolf, drawWorldRock, drawWorldStone } from "./entities";
import { horseHitchRail, nearestAliveTree, nearestBerryBush, nearestGatherableStone, nearMountHorse } from "../player";
import {
  fishNearBobber,
  fishingBobberPos,
  nearFishingSpot,
} from "../fish";
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
import { nearElder } from "../elder";
import { drawSpiritOverlay } from "../spirit";
import {
  type WorldSpriteSet,
} from "./worldSprites";
import {
  drawFirstNightElderCutscene,
  drawFamilyReunionEffect,
  drawHearthCompletionEffect,
  drawLivestockCompletionEffect,
  drawNightCompletionEffect,
  drawLivestockTrail,
  drawOpeningSequence,
  drawStormTrace,
  nearStormTrace,
  nearestMissingOpeningLivestock,
} from "../story";

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  terrain: HTMLCanvasElement;
  terrainWinter: HTMLCanvasElement;
  lightCanvas: HTMLCanvasElement;
  vignette: HTMLCanvasElement;
  playerSprites: PlayerSpriteSet;
  tumurShulmasSprites: TumurShulmasSpriteSet;
  worldSprites: WorldSpriteSet;
}

type RenderLayer =
  | "ground"
  | "lowWorldObject"
  | "actor"
  | "ySortedStructure"
  | "effect"
  | "worldUI";

type RenderEntityKind =
  | "tree"
  | "berryBush"
  | "smallRock"
  | "gatherStone"
  | "haystack"
  | "swordDrop"
  | "player"
  | "elder"
  | "parentNpc"
  | "sheep"
  | "fish"
  | "wildHorse"
  | "wolf"
  | "thief"
  | "routeEnemy"
  | "tumurShulmas"
  | "dog"
  | "mountHorse"
  | "ger"
  | "feeder"
  | "flockGate"
  | "dismantledGer"
  | "campfire"
  | "fence"
  | "fenceGhost"
  | "spiritGate"
  | "tumurExit"
  | "tumurGate"
  | "horseHitch";

const RENDER_LAYER_ORDER: Record<RenderLayer, number> = {
  ground: 0,
  lowWorldObject: 10,
  actor: 20,
  // Structures retain their existing Y-depth relationship with actors.
  ySortedStructure: 20,
  effect: 40,
  worldUI: 50,
};

const VEGETATION_ALWAYS_BEHIND_ACTORS = true;
const RENDER_LAYER_DEBUG = false;

function getRenderLayer(entity: RenderEntityKind): RenderLayer {
  switch (entity) {
    case "tree":
    case "berryBush":
    case "smallRock":
    case "gatherStone":
    case "haystack":
    case "swordDrop":
      return VEGETATION_ALWAYS_BEHIND_ACTORS ? "lowWorldObject" : "actor";
    case "player":
    case "elder":
    case "parentNpc":
    case "sheep":
    case "fish":
    case "wildHorse":
    case "wolf":
    case "thief":
    case "routeEnemy":
    case "tumurShulmas":
    case "dog":
    case "mountHorse":
      return "actor";
    case "ger":
    case "feeder":
    case "flockGate":
    case "dismantledGer":
    case "campfire":
    case "fence":
    case "fenceGhost":
    case "spiritGate":
    case "tumurExit":
    case "tumurGate":
    case "horseHitch":
      return "ySortedStructure";
  }
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
    drawHud(ctx, state);
    drawHearthCompletionEffect(ctx, state, getCamera(state));
    return;
  }

  const cam = getCamera(state);
  const world = state.world;

  // Газар
  const terrain = world.season === "winter" ? rc.terrainWinter : rc.terrain;
  ctx.drawImage(terrain, cam.x, cam.y, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  drawRiverFlowOverlay(ctx, cam, time, world.season === "winter");
  drawLivestockTrail(ctx, state, cam);
  drawStormTrace(ctx, state, cam);

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

  // Layer is primary; sortY and key only order compatible entities inside it.
  type Drawable = {
    entity: RenderEntityKind;
    layer: RenderLayer;
    sortY: number;
    key: number;
    debugPos?: { x: number; y: number };
    draw: () => void;
  };
  const drawables: Drawable[] = [];
  const addDrawable = (
    entity: RenderEntityKind,
    drawable: {
      y: number;
      key: number;
      debugPos?: { x: number; y: number };
      draw: () => void;
    },
  ): void => {
    drawables.push({
      entity,
      layer: getRenderLayer(entity),
      sortY: drawable.y,
      key: drawable.key,
      debugPos: drawable.debugPos,
      draw: drawable.draw,
    });
  };

  const center = pastureCenter(world);

  // Гэрийн бор хөрс — бууцын төвд (гэр голлуулна)
  if (!world.gerPacked) {
    const px = center.x - cam.x;
    const py = center.y - cam.y;
    const winter = world.season === "winter";
    const pad = ctx.createRadialGradient(px, py, 16, px, py, 110);
    pad.addColorStop(0, winter ? "#8a7a60" : "#6f5742");
    pad.addColorStop(0.55, winter ? "rgba(138,122,96,0.55)" : "rgba(111,87,66,0.55)");
    pad.addColorStop(1, winter ? "rgba(138,122,96,0)" : "rgba(111,87,66,0)");
    ctx.fillStyle = pad;
    ctx.beginPath();
    ctx.ellipse(px, py, 108, 78, 0, 0, Math.PI * 2);
    ctx.fill();
  }

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
    // Суурийн Y — хойно (баг Y) = гэрийн ард, урд (том Y) = гэрийн дээр
    addDrawable("ger", {
      y: center.y,
      key: -2,
      debugPos: center,
      draw: () =>
        drawGer(
          ctx,
          center.x - cam.x,
          center.y - 24 - cam.y,
          world.season === "winter",
          state.gerStoveLit,
          time,
        ),
    });
  }
  // Хураасан гэр морь дээр — drawPlayer/drawHorse зурна

  // Өвсний овоо — хадгалсан хэмжээгээр өснө
  if (!world.gerPacked && state.player.inventory.hay > 0) {
    const hayPos = { x: center.x + 58, y: center.y + 28 };
    addDrawable("haystack", {
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
    addDrawable("feeder", {
      y: world.feeder.pos.y,
      key: -4,
      draw: () => drawFeeder(ctx, world.feeder, cam),
    });
  }

  // Мал гаргах/оруулах цэг — хашааны хаалга
  if (!world.gerPacked) {
    const gate = flockGatePos(world);
    addDrawable("flockGate", {
      // Шонгийн сууриас дээш depth — тоглогч ойртоход урд нь гарахгүй
      y: gate.y - 12,
      key: -6,
      draw: () => {
        const gx = gate.x - cam.x;
        const gy = gate.y - cam.y;
        // Хоёр богино шон + завсар (хаалганы мөр)
        ctx.fillStyle = "rgba(20,25,15,0.22)";
        ctx.beginPath();
        ctx.ellipse(gx, gy + 4, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const ox of [-10, 10] as const) {
          ctx.fillStyle = "#5a3a1e";
          ctx.fillRect(gx + ox - 2, gy - 14, 4, 16);
          ctx.fillStyle = "#7a5230";
          ctx.fillRect(gx + ox - 1.2, gy - 13, 2, 14);
        }
        ctx.strokeStyle = "rgba(90,60,30,0.45)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(gx - 8, gy - 4);
        ctx.lineTo(gx + 8, gy - 4);
        ctx.stroke();
        ctx.setLineDash([]);
      },
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
    addDrawable("tree", {
      y: tree.pos.y,
      key: tree.id,
      debugPos: tree.pos,
      draw: () => {
        drawTree(ctx, tree, cam, time, windAmp);
      },
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
    addDrawable("berryBush", {
      y: bush.pos.y,
      key: 1000 + bush.id,
      debugPos: bush.pos,
      draw: () => {
        drawBerryBush(ctx, bush, cam, time);
      },
    });
  }
  for (const rock of world.rocks) {
    addDrawable("smallRock", {
      y: rock.pos.y,
      key: 7000 + rock.id,
      debugPos: rock.pos,
      draw: () => {
        drawWorldRock(ctx, rock, cam, time);
      },
    });
  }
  for (const stone of world.stones) {
    if (stone.amount <= 0) continue;
    addDrawable("gatherStone", {
      y: stone.pos.y,
      key: 8000 + stone.id,
      debugPos: stone.pos,
      draw: () => drawWorldStone(ctx, stone, cam),
    });
  }
  addDrawable("dismantledGer", {
    y: world.elder.gerPos.y,
    key: -6,
    draw: () => drawDismantledGer(ctx, world.elder.gerPos, cam, time),
  });
  const openingElderVisible = state.story.oldManArrived;
  if (openingElderVisible) {
    addDrawable("elder", {
      y: world.elder.pos.y,
      key: -5,
      draw: () => drawElder(ctx, world.elder, cam, time),
    });
  }
  if (state.parentsReturned && state.parents && !world.gerPacked) {
    if (!state.parents.father.insideGer) {
      addDrawable("parentNpc", {
        y: state.parents.father.pos.y,
        key: -4,
        draw: () =>
          drawParentNpc(ctx, state.parents!.father, cam, time),
      });
    }
    if (!state.parents.mother.insideGer) {
      addDrawable("parentNpc", {
        y: state.parents.mother.pos.y,
        key: -3,
        draw: () =>
          drawParentNpc(ctx, state.parents!.mother, cam, time),
      });
    }
  }
  // Аав ээжтэй амьдрах үед гэрийн урд гаднах гал харагдахгүй
  if (world.campfire.placed && !state.parentsReturned) {
    addDrawable("campfire", {
      y: world.campfire.pos.y,
      key: -1,
      draw: () => drawCampfire(ctx, world.campfire, cam, time),
    });
  }
  for (const fence of world.fences) {
    // Босоо хашаа/хаалга — ижил Y дээр тоглогчийн урд биш ард зурагдана
    const sortY =
      fence.isGate || fence.orient === 1
        ? fence.pos.y - 20
        : fence.pos.y;
    addDrawable("fence", {
      y: sortY,
      key: 3000 + fence.id,
      draw: () => drawFence(ctx, fence, cam, time),
    });
  }
  if (state.fencePreview && state.phase === "playing") {
    const ghostPos = fencePlacePos(
      state.player.pos,
      state.player.facing,
      FENCE_GRID,
      state.fencePreviewOffset,
      state.fencePreviewAngle,
      world.fences,
    );
    const ghostOrient = fenceOrientFromFacing(state.player.facing);
    addDrawable("fenceGhost", {
      y: ghostPos.y,
      key: 2999,
      draw: () => drawFenceGhost(ctx, ghostPos, ghostOrient, cam),
    });
  }
  // Хараалт / Хар төмөр хаалга — сүнсний оронд
  if (state.phase === "spirit") {
    addDrawable("spiritGate", {
      y: world.firstRoute.gatePos.y,
      key: 5800,
      draw: () => drawFirstRouteGate(ctx, state, cam, time),
    });
    if (world.tumurShulmas.active) {
      addDrawable("tumurExit", {
        y: world.tumurShulmas.exitPos.y,
        key: 5901,
        draw: () => drawTumurShulmasExit(ctx, state, cam, time),
      });
    } else {
      addDrawable("tumurGate", {
        y: world.tumurShulmas.gatePos.y,
        key: 5900,
        draw: () => drawTumurShulmasGate(ctx, state, cam, time),
      });
    }
  }
  for (const sheep of world.flock.visuals) {
    addDrawable("sheep", {
      y: sheep.pos.y,
      key: 2000 + sheep.id,
      draw: () => drawSheep(ctx, sheep, cam, time),
    });
  }
  for (const wh of world.wildHorses) {
    addDrawable("wildHorse", {
      y: wh.pos.y,
      key: 2500 + wh.id,
      draw: () => drawWildHorse(ctx, wh, cam, time),
    });
  }
  for (const fish of world.fish) {
    addDrawable("fish", {
      y: fish.pos.y,
      key: 2400 + fish.id,
      draw: () => drawFish(ctx, fish, cam, time),
    });
  }
  for (const wolf of world.wolves) {
    addDrawable("wolf", {
      y: wolf.pos.y,
      key: 2000 + wolf.id,
      draw: () =>
        wolf.kind === "bear"
          ? drawBear(ctx, wolf, cam, time)
          : drawWolf(
              ctx,
              wolf,
              cam,
              time,
              state.story.storyWolfId !== wolf.id ||
                state.story.shortDialogueCompleted,
            ),
    });
  }
  for (const thief of world.thieves) {
    addDrawable("thief", {
      y: thief.pos.y,
      key: 2000 + thief.id,
      draw: () => drawThief(ctx, thief, cam, time),
    });
  }
  for (const enemy of world.firstRoute.enemies) {
    // Мангасууд — сүнсний оронд орсон л бол харагдана
    if (state.phase !== "spirit") continue;
    if (!enemy.alive && enemy.deathTimer <= 0) continue;
    addDrawable("routeEnemy", {
      y: enemy.pos.y,
      key: 7000 + enemy.id,
      draw: () => drawRouteEnemy(ctx, enemy, cam, time),
    });
  }
  if (
    world.firstRoute.swordDrop.visible &&
    state.phase === "spirit"
  ) {
    addDrawable("swordDrop", {
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
    addDrawable("tumurShulmas", {
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
    addDrawable("dog", {
      y: dog.pos.y,
      key: 5000,
      draw: () => drawDog(ctx, dog, cam, time),
    });
  }
  // Морьны уяа — гэрийн баруун (+X), хашааны эсрэг тал
  if (
    !world.gerPacked &&
    state.player.gear.horse &&
    state.player.horseHp > 0
  ) {
    const rail = horseHitchRail(world);
    addDrawable("horseHitch", {
      y: Math.max(rail.left.y, rail.right.y),
      key: -5,
      draw: () => drawHorseHitch(ctx, rail.left, rail.right, cam),
    });
  }

  // Буусан / уясан унах морь
  if (world.mountHorse && !state.player.riding) {
    const mh = world.mountHorse;
    addDrawable("mountHorse", {
      y: mh.pos.y,
      key: 4990,
      draw: () => {
        const hx = mh.pos.x - cam.x;
        const hy = mh.pos.y - cam.y;
        drawHorse(ctx, hx, hy + 2, mh.face, time, false, false);
        if (mh.tied) {
          // Уяанаас морь руу богино оосор
          const rail = horseHitchRail(world);
          const ax = (rail.left.x + rail.right.x) / 2 - cam.x;
          const ay = (rail.left.y + rail.right.y) / 2 - 22 - cam.y;
          ctx.strokeStyle = "rgba(55,40,22,0.5)";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.quadraticCurveTo(
            (ax + hx) / 2 + 4,
            (ay + hy) / 2 + 6,
            hx - mh.face * 6,
            hy - 2,
          );
          ctx.stroke();
          ctx.strokeStyle = "#c4a06a";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.quadraticCurveTo(
            (ax + hx) / 2 + 4,
            (ay + hy) / 2 + 6,
            hx - mh.face * 6,
            hy - 2,
          );
          ctx.stroke();
        }
      },
    });
  }
  addDrawable("player", {
    y: state.player.pos.y,
    // Гэртэй ижил Y үед урд (хүүхэд/тоглогч гэрийн дээр) зурагдана
    key: 900000,
    debugPos: state.player.pos,
    draw: () => {
      drawPlayerWithSprites(
        ctx,
        state.player,
        cam,
        time,
        rc.playerSprites,
        state.fx.hurtFlash,
        world.gerPacked,
        world.campfire.igniting,
      );
      const casting =
        state.player.gear.fishingRod &&
        nearFishingSpot(state.player.pos);
      drawFishingRod(
        ctx,
        state.player,
        cam,
        time,
        casting,
        casting ? fishingBobberPos(state.player.pos) : null,
      );
    },
  });

  drawables.sort((a, b) => {
    const layerDifference =
      RENDER_LAYER_ORDER[a.layer] - RENDER_LAYER_ORDER[b.layer];
    if (layerDifference !== 0) return layerDifference;
    return Math.round(a.sortY) - Math.round(b.sortY) || a.key - b.key;
  });
  for (const d of drawables) d.draw();

  if (RENDER_LAYER_DEBUG) {
    const debugColors: Record<
      "lowWorldObject" | "actor" | "ySortedStructure",
      string
    > = {
      lowWorldObject: "#7dff7d",
      actor: "#73c7ff",
      ySortedStructure: "#ffd36b",
    };
    ctx.save();
    ctx.font = "9px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    for (const drawable of drawables) {
      if (!drawable.debugPos) continue;
      if (
        drawable.layer !== "lowWorldObject" &&
        drawable.layer !== "actor" &&
        drawable.layer !== "ySortedStructure"
      ) {
        continue;
      }
      const x = Math.round(drawable.debugPos.x - cam.x);
      const y = Math.round(drawable.debugPos.y - cam.y);
      const label = `${drawable.entity} · ${drawable.layer} · sortY=${Math.round(drawable.sortY)} · base=(${Math.round(drawable.debugPos.x)},${Math.round(drawable.debugPos.y)})`;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.strokeText(label, x, y + 18);
      ctx.fillStyle = debugColors[drawable.layer];
      ctx.fillText(label, x, y + 18);
    }
    ctx.restore();
  }

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
    const dFire = dist(state.player.pos, world.campfire.pos);
    const dFeed = dist(state.player.pos, world.feeder.pos);
    const gate = flockGatePos(world);
    const dGate = dist(state.player.pos, gate);
    const callableLivestock = nearestMissingOpeningLivestock(state);
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
    } else if (
      state.story.activeMainObjective === "restoreHearth" &&
      !state.story.campfireRelit &&
      dGer < 90
    ) {
      const tx = gp.x - cam.x;
      const ty = gp.y - 66 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      const tip = "E — Гэрт орож зууханд гал асаа";
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else if (dGer < 70) {
      const tx = gp.x - cam.x;
      const ty = gp.y - 66 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      const tip = state.player.riding
        ? "E — Гэрт орох · H — бууж уях · G — моринд ачих"
        : "E — Гэрт орох · G — моринд ачих";
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else if (
      state.story.activeMainObjective === "restoreHearth" &&
      !state.story.campfireRelit &&
      !world.campfire.lit &&
      dFire < world.campfire.radius + 18
    ) {
      // Эхний квест — гадаа гал биш, гэрийн зуух
      const tx = world.campfire.pos.x - cam.x;
      const ty = world.campfire.pos.y - 34 - cam.y;
      const tip = "Гэртээ орж зууханд гал асаа";
      ctx.textAlign = "center";
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.lineWidth = 3;
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#ffe09a";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else if (callableLivestock) {
      const tx = callableLivestock.pos.x - cam.x;
      const ty = callableLivestock.pos.y - 32 - cam.y;
      const tip = "N — Малаа туу";
      ctx.textAlign = "center";
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.lineWidth = 3;
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#f0dda0";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else if (dGate < FLOCK_GATE_RADIUS + 12) {
      const tx = gate.x - cam.x;
      const ty = gate.y - 28 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      const tip = world.flockOut
        ? "E — Мал оруулах · J — Нураах"
        : "E — Мал гаргах · J — Нураах";
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#c8e070";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else if (
      world.fences.some(
        (f) => dist(state.player.pos, f.pos) < state.player.radius + 36,
      )
    ) {
      const nearWall = world.fences.find(
        (f) => dist(state.player.pos, f.pos) < state.player.radius + 36,
      )!;
      const tx = nearWall.pos.x - cam.x;
      const ty = nearWall.pos.y - 26 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      const tip = nearWall.isGate ? "J — Хаалга нураах" : "J — Хашаа нураах";
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#e8c070";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else if (dFeed < world.feeder.radius + 28) {
      const tx = world.feeder.pos.x - cam.x;
      const ty = world.feeder.pos.y - 28 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      const hayInv = state.player.inventory.hay;
      const tip =
        hayInv > 0
          ? `E — Тэвшид өвс хийх (${hayInv})`
          : "E — Өвс хадаад тэвшид хий";
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#c8e070";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else if (
      state.player.gear.horse &&
      state.player.horseHp > 0 &&
      (state.player.riding || nearMountHorse(state, 60))
    ) {
      const tipPos = state.player.riding
        ? state.player.pos
        : (world.mountHorse?.pos ?? state.player.pos);
      const tx = tipPos.x - cam.x;
      const ty = tipPos.y - 40 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      const tip = state.player.riding
        ? "H — морьноос буух"
        : "H — морь унах";
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#c8e0ff";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else if (nearStormTrace(state)) {
      const trace = state.story.stormTracePos;
      if (trace) {
        const tx = trace.x - cam.x;
        const ty = trace.y - 42 - cam.y;
        ctx.textAlign = "center";
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.strokeStyle = "rgba(0,0,0,0.78)";
        ctx.lineWidth = 3;
        const tip = "E — Шуурганы мөрийг шинж";
        ctx.strokeText(tip, tx, ty);
        ctx.fillStyle = "#b7c7e2";
        ctx.fillText(tip, tx, ty);
        ctx.textAlign = "left";
      }
    } else if (
      nearElder(state) &&
      (!state.story.activeMainObjective ||
        state.story.activeMainObjective === "growFlock" ||
        state.story.milestone8Completed ||
        state.story.activeMainObjective === "talkToOldMan" ||
        state.story.activeMainObjective === "visitOldManAtDawn" ||
        state.story.activeMainObjective === "returnToOldManWithTrace")
    ) {
      const tx = world.elder.pos.x - cam.x;
      const ty = world.elder.pos.y - 36 - cam.y;
      ctx.textAlign = "center";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      const tip =
        state.story.activeMainObjective === "talkToOldMan"
          ? "E — Өвгөнтэй ярилц"
          : state.story.activeMainObjective === "visitOldManAtDawn"
            ? state.world.dayPhase === "dawn" || state.world.dayPhase === "day"
              ? "E — Өвгөнтэй уулз"
              : "Үүр цайхыг хүлээ"
            : state.story.activeMainObjective === "returnToOldManWithTrace"
              ? "E — Хар мөрийн тухай өгүүл"
              : "E — Өвгөнтэй ярих / арилжаа";
      ctx.strokeText(tip, tx, ty);
      ctx.fillStyle = "#b8d0ff";
      ctx.fillText(tip, tx, ty);
      ctx.textAlign = "left";
    } else {
        const bush = nearestBerryBush(state.player, world.bushes);
        const stone = nearestGatherableStone(state.player, world.stones);
        const tree = nearestAliveTree(state.player, world.trees);
        if (
          state.player.gear.fishingRod &&
          nearFishingSpot(state.player.pos)
        ) {
          const tx = state.player.pos.x - cam.x;
          const ty = state.player.pos.y - 36 - cam.y;
          ctx.textAlign = "center";
          ctx.font = "600 11px system-ui, sans-serif";
          ctx.strokeStyle = "rgba(0,0,0,0.7)";
          ctx.lineWidth = 3;
          const canPull = !!fishNearBobber(state);
          const tip = canPull
            ? "E — Загас татах!"
            : "E — Уургалах (загас ойртохыг хүлээ)";
          ctx.strokeText(tip, tx, ty);
          ctx.fillStyle = canPull ? "#a8f0ff" : "#7ec8ff";
          ctx.fillText(tip, tx, ty);
          ctx.textAlign = "left";
        } else if (bush) {
          const tx = bush.pos.x - cam.x;
          const ty = bush.pos.y - 28 - cam.y;
          ctx.textAlign = "center";
          ctx.font = "600 11px system-ui, sans-serif";
          ctx.strokeStyle = "rgba(0,0,0,0.7)";
          ctx.lineWidth = 3;
          const tip = `E — Жимс түүх (${bush.berries})`;
          ctx.strokeText(tip, tx, ty);
          ctx.fillStyle = "#ff9fbf";
          ctx.fillText(tip, tx, ty);
          ctx.textAlign = "left";
        } else if (stone) {
          const tx = stone.pos.x - cam.x;
          const ty = stone.pos.y - 28 - cam.y;
          ctx.textAlign = "center";
          ctx.font = "600 11px system-ui, sans-serif";
          ctx.strokeStyle = "rgba(0,0,0,0.7)";
          ctx.lineWidth = 3;
          const tip = `E — Чулуу түүх (${stone.amount})`;
          ctx.strokeText(tip, tx, ty);
          ctx.fillStyle = "#c8c0b0";
          ctx.fillText(tip, tx, ty);
          ctx.textAlign = "left";
        } else if (tree) {
          const tx = tree.pos.x - cam.x;
          const ty = tree.pos.y - 36 - cam.y;
          ctx.textAlign = "center";
          ctx.font = "600 11px system-ui, sans-serif";
          ctx.strokeStyle = "rgba(0,0,0,0.7)";
          ctx.lineWidth = 3;
          const tip = state.player.gear.axe
            ? "E — Мод хагалах (сүх)"
            : "E — Мод хагалах";
          ctx.strokeText(tip, tx, ty);
          ctx.fillStyle = "#e8c56a";
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
          const tip = "E — Өвс хадах";
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

  if (state.phase !== "menu" && state.phase !== "intro") {
    drawThreatArrows(ctx, state, cam);
    drawMinimap(ctx, state, cam);
  }
  if (state.phase === "intro") drawOpeningSequence(ctx, state);
  else drawHud(ctx, state);
  if (state.phase === "spirit" && state.spiritMode === "shulmas") {
    drawMiniBossHud(ctx, state);
    drawTumurShulmasHud(ctx, state);
  }
  drawHearthCompletionEffect(ctx, state, cam);
  drawLivestockCompletionEffect(ctx, state, cam);
  drawNightCompletionEffect(ctx, state, cam);
  drawFamilyReunionEffect(ctx, state, cam);
  drawFirstNightElderCutscene(ctx, state);
}
