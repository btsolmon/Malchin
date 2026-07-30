// Хүн 1 — цөм: game loop, оролт, төлөв үүсгэх, mount

import {
  START_GOATS,
  START_SHEEP,
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  type BerryBush,
  type GameState,
  type InputState,
  type Tree,
  type Vector2,
} from "./types";
import { dist, setMessage, updateGates } from "./utils";
import { spawnText, updateEffects } from "./effects";
import {
  ensureAudio,
  loadAudioSettings,
  sfx,
  shutdownAudio,
  startMusic,
} from "../game/audio";
import {
  tryBuildFence,
  tryEatBerry,
  tryInteract,
  tryLightCampfire,
  tryMigrateGer,
  updatePlayerMovement,
  updateSurvival,
  updateWeatherCycle,
} from "../game/player";
import {
  syncVisualFlock,
  updateFlock,
  updateThieves,
  updateThreatTimers,
  updateWolves,
} from "../game/enemies";
import { tryAttack, updateDog, updateProjectiles } from "../game/combat";
import {
  updateGer,
  updateLevelUp,
  updateMenu,
  updatePauseMenu,
} from "../game/ui";
import { render, type RenderContext } from "../game/render/render";
import { makeVignette } from "../game/render/lighting";
import { renderTerrain } from "../game/render/terrain";
import {
  createFeeder,
  emptyCounts,
  updateProduction,
  updateWildHorses,
} from "./livestock";
export function createTrees(count: number): Tree[] {
  const trees: Tree[] = [];
  const center: Vector2 = { x: WORLD_W / 2, y: WORLD_H / 2 };

  for (let i = 0; i < count; i++) {
    let pos: Vector2;
    let attempts = 0;
    do {
      pos = {
        x: 80 + Math.random() * (WORLD_W - 160),
        y: 80 + Math.random() * (WORLD_H - 160),
      };
      attempts++;
    } while (dist(pos, center) < 220 && attempts < 40);

    trees.push({ id: i, pos, hp: 3, maxHp: 3, radius: 18, respawnIn: 0 });
  }
  return trees;
}

export function createBushes(count: number): BerryBush[] {
  const bushes: BerryBush[] = [];
  const center: Vector2 = { x: WORLD_W / 2, y: WORLD_H / 2 };

  for (let i = 0; i < count; i++) {
    let pos: Vector2;
    let attempts = 0;
    do {
      pos = {
        x: 80 + Math.random() * (WORLD_W - 160),
        y: 80 + Math.random() * (WORLD_H - 160),
      };
      attempts++;
    } while (dist(pos, center) < 140 && attempts < 40);

    bushes.push({
      id: 1000 + i,
      pos,
      berries: 3 + Math.floor(Math.random() * 3),
      maxBerries: 5,
      radius: 16,
      respawnIn: 0,
    });
  }
  return bushes;
}

export function createInitialState(): GameState {
  const spawn: Vector2 = { x: WORLD_W / 2, y: WORLD_H / 2 };

  const state: GameState = {
    player: {
      pos: { x: spawn.x, y: spawn.y + 60 },
      speed: 155,
      radius: 14,
      vitals: {
        health: 100,
        maxHealth: 100,
        warmth: 100,
        maxWarmth: 100,
        hunger: 100,
        maxHunger: 100,
      },
      inventory: {
        wood: 0,
        berries: 0,
        hay: 0,
        wool: 0,
        cashmere: 0,
        milk: 0,
        felt: 0,
        aaruul: 0,
      },
      chopCooldown: 0,
      attackCooldown: 0,
      eatCooldown: 0,
      attackAnim: 0,
      attackMelee: false,
      invuln: 0,
      damageMult: 1,
      reachMult: 1,
      cooldownMult: 1,
      warmthResist: 1,
      gear: {
        dog: false,
        horse: false,
        bow: false,
        gun: false,
        axe: false,
        urga: false,
      },
      horseHp: 0,
      horseMaxHp: 0,
      sleepCooldown: 0,
      moving: false,
      facing: { x: 0, y: 1 },
    },
    world: {
      width: WORLD_W,
      height: WORLD_H,
      trees: createTrees(40),
      bushes: createBushes(28),
      campfire: {
        pos: { x: spawn.x + 52, y: spawn.y + 14 },
        lit: false,
        fuel: 0,
        radius: 56,
      },
      fences: [],
      flock: {
        counts: { ...emptyCounts(), sheep: START_SHEEP, goat: START_GOATS },
        total: START_SHEEP + START_GOATS,
        visuals: [],
        hunger: 100,
        starveAcc: 0,
      },
      wolves: [],
      thieves: [],
      season: "autumn",
      weather: "clear",
      timeOfDay: 6.5,
      dayNumber: 1,
      elapsed: 0,
      dayPhase: "dawn",
      flockOut: false,
      outdoorRiskAcc: 0,
      nextWolfIn: 72,
      nextThiefIn: 140,
      nextWildHorseIn: 25,
      dog: null,
      projectiles: [],
      campPos: { x: spawn.x, y: spawn.y },
      gerPacked: false,
      pastureGrass: 75,
      pastureSeason: "autumn",
      feeder: createFeeder(spawn),
      wildHorses: [],
    },
    fencePreview: false,
    unlimitedWood: false,
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
      interact: false,
      attack: false,
      shoot: false,
      lightFire: false,
      buildFence: false,
      eat: false,
      debugXp: false,
      debugWood: false,
      herd: false,
      migrate: false,
      skill1: false,
      skill2: false,
      skill3: false,
      skill4: false,
      confirm: false,
      pause: false,
      menuUp: false,
      menuDown: false,
      menuLeft: false,
      menuRight: false,
      mouseX: 0,
      mouseY: 0,
      mouseMoved: false,
      mouseClicked: false,
    },
    fx: {
      particles: [],
      texts: [],
      shake: 0,
      hurtFlash: 0,
      emberAcc: 0,
      dustAcc: 0,
    },
    message:
      "Үүр! Гал түлээд тэжээгчийн дэргэд E — малаа бэлчээрт гарга.",
    messageTimer: 6,
    score: 0,
    xp: 0,
    level: 1,
    xpNext: 90,
    skillChoices: [],
    phase: "menu",
    menuScreen: "main",
    menuIndex: 0,
    pauseIndex: 0,
    shopOpen: false,
    craftOpen: false,
    gerPlayer: { x: 480, y: 435 },
    gerSleepTimer: 0,
    gerSleepBed: null,
    requestRestart: false,
    nextEntityId: 100,
  };

  syncVisualFlock(state);
  return state;
}

// ---------------------------------------------------------------------------
// Дуу — Web Audio (процедурал ая ба эффект, гадны файл шаардлагагүй)
// ---------------------------------------------------------------------------

export function bindInput(getInput: () => InputState): () => void {
  const setKey = (code: string, pressed: boolean): void => {
    const input = getInput();
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        input.up = pressed;
        if (pressed) input.menuUp = true;
        break;
      case "KeyS":
      case "ArrowDown":
        input.down = pressed;
        if (pressed) input.menuDown = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        input.left = pressed;
        if (pressed) input.menuLeft = true;
        break;
      case "KeyD":
      case "ArrowRight":
        input.right = pressed;
        if (pressed) input.menuRight = true;
        break;
      case "KeyE":
        // Дарахад асаана, update() эсвэл хэрэглэгч нь унтраана —
        // ингэснээр маш богино даралт ч frame алгасахгүй
        if (pressed) input.interact = true;
        break;
      case "Space":
        if (pressed) input.confirm = true;
        break;
      case "KeyJ":
        input.attack = pressed;
        break;
      case "KeyK":
        input.shoot = pressed;
        break;
      case "Enter":
        if (pressed) input.confirm = true;
        break;
      case "KeyP":
        if (pressed) input.pause = true;
        break;
      case "KeyF":
        if (pressed) input.lightFire = true;
        break;
      case "KeyB":
        if (pressed) input.buildFence = true;
        break;
      case "KeyQ":
        if (pressed) input.eat = true;
        break;
      case "Slash":
        if (pressed) input.debugXp = true;
        break;
      case "Period":
        if (pressed) input.debugWood = true;
        break;
      case "KeyN":
        input.herd = pressed;
        break;
      case "KeyG":
        if (pressed) input.migrate = true;
        break;
      case "Digit1":
      case "Numpad1":
        if (pressed) input.skill1 = true;
        break;
      case "Digit2":
      case "Numpad2":
        if (pressed) input.skill2 = true;
        break;
      case "Digit3":
      case "Numpad3":
        if (pressed) input.skill3 = true;
        break;
      case "Digit4":
      case "Numpad4":
        if (pressed) input.skill4 = true;
        break;
    }
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    setKey(e.code, true);
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    ) {
      e.preventDefault();
    }
  };
  const onKeyUp = (e: KeyboardEvent): void => setKey(e.code, false);

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
}

// ---------------------------------------------------------------------------
// Threat spawning
// ---------------------------------------------------------------------------

export function update(state: GameState, dt: number): void {
  const phaseBefore = state.phase;

  // Меню ба пауз
  if (state.phase === "menu") {
    updateMenu(state);
  } else if (state.phase === "paused") {
    updatePauseMenu(state);
  } else if (state.phase === "ger") {
    updateGer(state, dt);
    state.fencePreview = false;
  } else if (state.phase === "levelup") {
    updateLevelUp(state);
    state.fencePreview = false;
  } else if (state.phase === "playing" && state.input.pause) {
    state.phase = "paused";
    state.pauseIndex = 0;
    state.menuScreen = "main";
    state.fencePreview = false;
    sfx("select");
  } else if (
    state.phase === "lost" &&
    (state.input.confirm || state.input.pause || state.input.mouseClicked)
  ) {
    state.requestRestart = true;
    sfx("select");
  }
  state.input.confirm = false;
  state.input.pause = false;
  state.input.menuUp = false;
  state.input.menuDown = false;
  state.input.menuLeft = false;
  state.input.menuRight = false;
  state.input.mouseMoved = false;
  state.input.mouseClicked = false;

  // Shop шууд сонголтын товчнууд (1–4) — ур чадварт ашиглагдахгүй
  state.input.skill1 = false;
  state.input.skill2 = false;
  state.input.skill3 = false;
  state.input.skill4 = false;

  if (state.phase === "playing") {
    if (state.input.debugXp) {
      state.score += 1000;
      spawnText(state, state.player.pos, "+1000 оноо", "#ffd060");
      sfx("buy");
    }
    if (state.input.debugWood) {
      state.unlimitedWood = !state.unlimitedWood;
      if (state.unlimitedWood) {
        state.player.inventory.wood = 999999;
        spawnText(state, state.player.pos, "Мод хязгааргүй!", "#e8c56a");
        setMessage(state, "Мод/түлээ хязгааргүй боллоо.", 2.5);
      } else {
        state.player.inventory.wood = Math.min(state.player.inventory.wood, 50);
        spawnText(state, state.player.pos, "Мод хязгаартай", "#a89880");
        setMessage(state, "Мод хязгаартай боллоо.", 2);
      }
      sfx("buy");
    }
    updateWeatherCycle(state, dt);
    updatePlayerMovement(state, dt);
    tryInteract(state);
    tryEatBerry(state);
    tryMigrateGer(state);
    tryLightCampfire(state);
    tryBuildFence(state);
    tryAttack(state);
    updateGates(state, dt);
    updateFlock(state, dt);
    updateProduction(state, dt);
    updateWildHorses(state, dt);
    updateThreatTimers(state, dt);
    updateWolves(state, dt);
    updateThieves(state, dt);
    updateDog(state, dt);
    updateProjectiles(state, dt);
    updateSurvival(state, dt);
    if (state.messageTimer > 0) state.messageTimer -= dt;
  }

  // Фаз солигдоход нэг удаагийн дуут дохио
  if (state.phase !== phaseBefore) {
    if (state.phase === "lost") sfx("lose");
    else if (state.phase === "levelup") sfx("levelup");
  }

  updateEffects(state, dt);

  // Нэг удаагийн үйлдлийн товчнуудыг frame бүрийн төгсгөлд цэвэрлэнэ
  state.input.interact = false;
  state.input.eat = false;
  state.input.lightFire = false;
  state.input.buildFence = false;
  state.input.debugXp = false;
  state.input.debugWood = false;
  state.input.migrate = false;
}

// ---------------------------------------------------------------------------
// Terrain prerender
// ---------------------------------------------------------------------------

export interface HerderGameHandle {
  destroy: () => void;
}

/** Canvas дээр тоглоом эхлүүлнэ. Unmount үед destroy() дуудна. */
export function mountHerderGame(canvas: HTMLCanvasElement): HerderGameHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context дэмжигдэхгүй");

  // Retina дэмжлэг — CSS-ээр viewport дүүргэнэ (object-fit: contain)
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  canvas.style.width = "";
  canvas.style.height = "";
  ctx.scale(dpr, dpr);

  const enterBrowserFullscreen = (): void => {
    const root = canvas.parentElement ?? canvas;
    if (!document.fullscreenElement) {
      void root.requestFullscreen?.().catch(() => undefined);
    }
  };

  const rc: RenderContext = {
    ctx,
    terrain: renderTerrain(false),
    terrainWinter: renderTerrain(true),
    lightCanvas: (() => {
      const c = document.createElement("canvas");
      c.width = VIEW_W;
      c.height = VIEW_H;
      return c;
    })(),
    vignette: makeVignette(),
  };

  let state = createInitialState();
  const unbindInput = bindInput(() => state.input);

  // Хулгана — canvas координат руу хөрвүүлнэ
  const toView = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * VIEW_W,
      y: ((e.clientY - r.top) / r.height) * VIEW_H,
    };
  };
  const onPointerMove = (e: PointerEvent): void => {
    const p = toView(e);
    state.input.mouseX = p.x;
    state.input.mouseY = p.y;
    state.input.mouseMoved = true;
  };
  const onPointerDown = (e: PointerEvent): void => {
    const p = toView(e);
    state.input.mouseX = p.x;
    state.input.mouseY = p.y;
    state.input.mouseClicked = true;
  };
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);

  // Аудио — browser autoplay бодлогын дагуу эхний үйлдлээр асна
  loadAudioSettings();
  const unlockAudio = (): void => {
    ensureAudio();
    startMusic();
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("pointerdown", unlockAudio);
  };
  window.addEventListener("keydown", unlockAudio);
  window.addEventListener("pointerdown", unlockAudio);

  let last = performance.now();
  let raf = 0;
  let alive = true;

  const frame = (now: number): void => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (state.requestRestart) {
      state = createInitialState();
    }

    const phaseBefore = state.phase;
    update(state, dt);
    // Play дармагц браузерийн fullscreen руу орно
    if (phaseBefore === "menu" && state.phase === "playing") {
      enterBrowserFullscreen();
    }
    render(rc, state, now / 1000);
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);

  return {
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      unbindInput();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("pointerdown", unlockAudio);
      shutdownAudio();
    },
  };
}
