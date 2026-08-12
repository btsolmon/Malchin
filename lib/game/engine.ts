// Хүн 1 — цөм: game loop, оролт, төлөв үүсгэх, mount

import {
  START_CATTLE,
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
  type WorldStone,
} from "./types";
import {
  bindDisplayCanvas,
  enterImmersiveDisplay,
  ensureImmersiveDisplay,
  syncVisualViewportVars,
} from "./display";
import {
  dist,
  setMessage,
  updateGates,
  allocId,
  createCampPens,
  neutralInput,
  clamp,
} from "./utils";
import {
  isInRiver,
  riverCenterX,
  riverHalfWidth,
  sampleBushPos,
  sampleStonePos,
  sampleTreePos,
} from "./biomes";
import {
  DEFAULT_TERRAIN_SEED,
  createSeededRandom,
} from "./terrainGenerator";
import { spawnText, updateEffects, updateHitStop } from "./effects";
import {
  ensureAudio,
  loadAudioSettings,
  sfx,
  shutdownAudio,
  startMusic,
  syncStoryMusic,
  updateRiverAmbience,
  tickHoofsteps,
  tickLivestockVocal,
  syncCampfireLoop,
  syncWeatherStormAmbience,
} from "../game/audio";
import {
  beginElderLevelUp,
  tryBuildFence,
  tryHorseMount,
  tryInteract,
  tryLightCampfire,
  tryMigrateGer,
  updateFencePreviewAim,
  updatePlayerMovement,
  updateSurvival,
  updateWeatherCycle,
  horseHitchPos,
} from "../game/player";
import {
  syncVisualFlock,
  updateFlock,
  updateThieves,
  updateThreatTimers,
  updateWolves,
} from "../game/enemies";
import { updateCombat, updateDog, updateProjectiles } from "../game/combat";
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
  checkHerdVictory,
} from "./livestock";
import { createRiverFish, updateFish } from "./fish";
import { updateParents } from "./parents";
import {
  createTumurShulmasEncounter,
  forceStartTumurShulmasBoss,
  loadTumurShulmasSprites,
  updateTumurShulmasEncounter,
} from "./tumurShulmas";
import { applySelectedToolInput } from "./combat/playerWeapon";
import {
  createFirstRoute,
  tryInteractFirstRoute,
  updateFirstRoute,
} from "./firstRoute";
import { clearSave, loadGame, saveGame } from "./save";
import { captureRecords, hasCompletedStory } from "./records";
import { loadLangSetting } from "./lang";
import { localizeCanvasText } from "./locale/canvasText";
import { preloadGameIcons } from "./icons";

/** Автомат хадгалалтын давтамж (сек) */
const AUTOSAVE_INTERVAL = 8;
import {
  advanceElderDialogue,
  chooseElderOption,
  closeElder,
  createElder,
  getElderUiSnapshot,
  retreatElderDialogue,
  setElderTab,
  startElderDialogue,
  tickElderHitFlash,
  tradeWithElder,
  type ElderChoiceId,
  type ElderTab,
  type ElderUiSnapshot,
} from "./elder";
import {
  advanceElderCultureQuiz,
  submitElderCultureAnswer,
} from "./elderQuiz";
import { updateSpiritWorld } from "./spirit";
import { pullFlockToPen } from "./daycycle";
import {
  createDefaultHotbar,
  ensureHotbar,
  updateHotbar,
} from "./hotbar";
import {
  createInitialStoryState,
  debugJumpToFamilyLife,
  debugJumpToSpiritWorld,
  debugGrantSpiritCombatGear,
  debugSkipCurrentStoryStage,
  ensureStoryState,
  firstNightElderCutsceneActive,
  initializeOpeningLivestock,
  openingStoryControlsWorldTime,
  startFamilyLifeRun,
  storyWolfUsesExistingAi,
  updateHearthQuest,
  updateLivestockRecoveryQuest,
  updateMilestone3,
  updateMilestone4,
  updateMilestone7,
  updateMilestone8,
  updateOpeningSequence,
  tryExitSpiritViaOvoo,
  tryCollectSpiritOvooSoul,
} from "./story";

export function createTrees(
  count: number,
  seed = DEFAULT_TERRAIN_SEED,
): Tree[] {
  const trees: Tree[] = [];
  const center: Vector2 = { x: WORLD_W / 2, y: WORLD_H / 2 };
  const random = createSeededRandom(seed + 101);

  for (let i = 0; i < count; i++) {
    let pos: Vector2;
    let attempts = 0;
    do {
      pos = sampleTreePos(center, random, seed);
      attempts++;
    } while (
      (dist(pos, center) < 220 || isInRiver(pos, 45)) &&
      attempts < 50
    );

    const roll = random();
    const kind =
      roll < 0.34 ? "pine" : roll < 0.67 ? "birch" : "leafy";
    trees.push({
      id: i,
      pos,
      hp: 3,
      maxHp: 3,
      radius: kind === "pine" ? 16 : kind === "birch" ? 15 : 18,
      respawnIn: 0,
      kind,
    });
  }
  return trees;
}

export function createBushes(
  count: number,
  seed = DEFAULT_TERRAIN_SEED,
): BerryBush[] {
  const bushes: BerryBush[] = [];
  const center: Vector2 = { x: WORLD_W / 2, y: WORLD_H / 2 };
  const random = createSeededRandom(seed + 202);

  for (let i = 0; i < count; i++) {
    let pos: Vector2;
    let attempts = 0;
    do {
      pos = sampleBushPos(center, random, seed);
      attempts++;
    } while (
      (dist(pos, center) < 140 || isInRiver(pos, 40)) &&
      attempts < 50
    );

    bushes.push({
      id: 1000 + i,
      pos,
      berries: 3 + Math.floor(random() * 3),
      maxBerries: 5,
      radius: 16,
      respawnIn: 0,
      // ~45% нэрс (blueberry), үлдсэн нь улаан жимс
      kind: random() < 0.45 ? "blue" : "red",
    });
  }
  return bushes;
}

export function createStones(
  count: number,
  seed = DEFAULT_TERRAIN_SEED,
): WorldStone[] {
  const stones: WorldStone[] = [];
  const center: Vector2 = { x: WORLD_W / 2, y: WORLD_H / 2 };
  const random = createSeededRandom(seed + 303);

  for (let i = 0; i < count; i++) {
    stones.push({
      id: 8000 + i,
      pos: sampleStonePos(center, random, seed),
      radius: 14,
      amount: 2 + Math.floor(random() * 3),
      maxAmount: 4,
      respawnIn: 0,
    });
  }
  return stones;
}

export function createInitialState(): GameState {
  const spawn: Vector2 = { x: WORLD_W / 2, y: WORLD_H / 2 };

  const state: GameState = {
    player: {
      attackVariant: 2,
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
        stone: 0,
        arrows: 0,
        fish: 0,
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
      staminaRegenMult: 1,
      hungerDrainMult: 1,
      gear: {
        dog: false,
        horse: true,
        bow: false,
        axe: false,
        basket: false,
        urga: false,
        fishingRod: false,
      },
      horseHp: 100,
      horseMaxHp: 100,
      riding: false,
      sleepCooldown: 0,
      moving: false,
      facing: { x: 0, y: 1 },
      stamina: 100,
      maxStamina: 100,
      staminaRegenDelay: 0,
      combatPhase: "idle",
      combatTimer: 0,
      attackHitDone: false,
      parryArmed: false,
      weapon: "staff",
      tool: "melee",
      hasSkySword: false,
      meleePhase: "idle",
      meleeTimer: 0,
      meleeHitDone: false,
      attackFacing: { x: 0, y: 1 },
      dodgePhase: "idle",
      dodgeTimer: 0,
      dodgeDirection: { x: 0, y: 1 },
      parryPhase: "idle",
      parryTimer: 0,
      bowCharge: 0,
      bowChargeLock: false,
    },
    world: {
      width: WORLD_W,
      height: WORLD_H,
      terrainSeed: DEFAULT_TERRAIN_SEED,
      trees: createTrees(72, DEFAULT_TERRAIN_SEED),
      bushes: createBushes(36, DEFAULT_TERRAIN_SEED),
      stones: createStones(48, DEFAULT_TERRAIN_SEED),
      campfire: {
        pos: { x: spawn.x, y: spawn.y },
        lit: false,
        fuel: 0,
        radius: 56,
        placed: false,
        igniting: 0,
      },
      fences: [],
      flock: {
        counts: {
          ...emptyCounts(),
          sheep: START_SHEEP,
          goat: START_GOATS,
          cattle: START_CATTLE,
        },
        total: START_SHEEP + START_GOATS + START_CATTLE,
        visuals: [],
        hunger: 100,
        starveAcc: 0,
      },
      wolves: [],
      thieves: [],
      elder: { ...createElder(spawn), eyeMode: "idle" as const },
      season: "autumn",
      weather: "clear",
      groundWetness: 0,
      timeOfDay: 6.5,
      dayNumber: 1,
      elapsed: 0,
      dayPhase: "dawn",
      flockOut: false,
      cattleOut: false,
      flockBreach: null,
      cattleBreach: null,
      outdoorRiskAcc: 0,
      grazedToday: false,
      pennedDays: 0,
      nextWolfIn: 72,
      nextThiefIn: 140,
      nextWildHorseIn: 60,
      dog: null,
      projectiles: [],
      firstRoute: createFirstRoute(spawn),
      tumurShulmas: createTumurShulmasEncounter(),
      campPos: { x: spawn.x, y: spawn.y },
      gerPacked: false,
      pastureGrass: 75,
      pastureSeason: "autumn",
      feeder: createFeeder(spawn),
      wildHorses: [],
      fish: [],
      mountHorse: null,
    },
    story: createInitialStoryState(),
    fencePreview: false,
    fencePreviewAngle: 0,
    fencePreviewOffset: { x: 0, y: 0 },
    fishingHook: null,
    horseLasso: null,
    unlimitedWood: false,
    unlimitedCoins: false,
    unlimitedSupplies: false,
    godMode: false,
    combatMovementLocked: false,
    combatDodgeActive: false,
    input: neutralInput(),
    fx: {
      particles: [],
      texts: [],
      souls: [],
      cameraShake: { remaining: 0, duration: 0, strength: 0 },
      screenPulse: {
        remaining: 0,
        duration: 0,
        intensity: 0,
        color: "190,24,30",
      },
      shake: 0,
      hurtFlash: 0,
      emberAcc: 0,
      dustAcc: 0,
    },
    message:
      "Үүр цайлаа! Галаа түлээд малаа бэлчээрт гарга.",
    messageTimer: 6,
    bannerAlert: null,
    score: 0,
    xp: 0,
    level: 1,
    xpNext: 90,
    skillChoices: [],
    phase: "menu",
    pauseReturnPhase: "playing",
    menuScreen: "main",
    menuIndex: 0,
    pauseIndex: 0,
    shopOpen: false,
    craftOpen: false,
    inventoryOpen: false,
    hotbar: createDefaultHotbar(),
    hotbarSelected: 0,
    hotbarInvIndex: 0,
    gerArtZoom: null,
    gerPlayer: { x: 480, y: 455 },
    gerSleepTimer: 0,
    gerSleepBed: null,
    gerStoveLit: false,
    gerStoveFuel: 0,
    requestRestart: false,
    requestSkipStory: false,
    requestLoad: false,
    nextEntityId: 100,
    spiritPoints: 0,
    spiritVisitSnapshot: null,
    elderTab: "trade",
    elderDialogueId: null,
    elderDialogueLine: 0,
    elderShowingChoices: false,
    elderHeardDialogues: [],
    elderQuizId: null,
    elderQuizOptions: [],
    elderQuizCorrectIndex: 0,
    elderQuizFeedback: "idle",
    elderQuizSelectedIndex: null,
    elderQuizRewardLabel: "",
    elderQuizAskedIds: [],
    spiritTransition: 0,
    spiritReturnPos: null,
    spiritCleared: false,
    spiritMode: "purge",
    spiritSavedWolves: null,
    spiritSavedThieves: null,
    parentsReturned: false,
    victoryShown: false,
    herdVictoryShown: false,
    winReason: null,
    parents: null,
  };

  state.world.fences = createCampPens(spawn, () => allocId(state));
  state.world.fish = createRiverFish(() => allocId(state));
  syncVisualFlock(state);
  pullFlockToPen(state, 1);
  initializeOpeningLivestock(state);
  // Opening livestock are placed outside the pen — keep them free to roam.
  state.world.flockOut = true;
  state.world.cattleOut = true;
  // Унах морь — эхнээсээ гэрийн уяан дээр
  state.world.mountHorse = {
    pos: horseHitchPos(state.world),
    face: -1,
    tied: true,
    flash: 0,
  };
  return state;
}

// ---------------------------------------------------------------------------
// Дуу — Web Audio (процедурал ая ба эффект, гадны файл шаардлагагүй)
// ---------------------------------------------------------------------------

export function bindInput(
  getInput: () => InputState,
  _getFencePreview: () => boolean = () => false,
  getPhase: () => GameState["phase"] = () => "menu",
): () => void {
  const setKey = (code: string, pressed: boolean, isRepeat = false): void => {
    const input = getInput();
    // Меню edge-trigger — key-repeat-ээр дууны түвшин/индекс унахгүй
    const menuEdge = pressed && !isRepeat;
    switch (code) {
      case "KeyW":
        input.up = pressed;
        if (menuEdge) input.menuUp = true;
        break;
      case "ArrowUp":
        if (menuEdge) input.menuUp = true;
        // Тоглоомд сум = hotbar/авдар; хөдөлгөөн зөвхөн WASD
        {
          const phase = getPhase();
          if (phase !== "playing" && phase !== "spirit") input.up = pressed;
        }
        break;
      case "KeyS":
        input.down = pressed;
        if (menuEdge) input.menuDown = true;
        break;
      case "ArrowDown":
        if (menuEdge) input.menuDown = true;
        {
          const phase = getPhase();
          if (phase !== "playing" && phase !== "spirit") input.down = pressed;
        }
        break;
      case "KeyA":
        input.left = pressed;
        if (menuEdge) input.menuLeft = true;
        break;
      case "ArrowLeft":
        if (menuEdge) input.menuLeft = true;
        {
          const phase = getPhase();
          if (phase !== "playing" && phase !== "spirit") input.left = pressed;
        }
        break;
      case "KeyD":
        input.right = pressed;
        if (menuEdge) input.menuRight = true;
        break;
      case "ArrowRight":
        if (menuEdge) input.menuRight = true;
        {
          const phase = getPhase();
          if (phase !== "playing" && phase !== "spirit") input.right = pressed;
        }
        break;
      case "KeyE":
        // Дарахад асаана, update() эсвэл хэрэглэгч нь унтраана —
        // ингэснээр маш богино даралт ч frame алгасахгүй
        if (pressed) input.interact = true;
        break;
      case "Space":
        if (pressed) {
          const phase = getPhase();
          if (phase === "playing" || phase === "spirit") {
            input.parry = true;
            input.parryPressed = true;
          } else {
            input.confirm = true;
          }
        }
        break;
      case "KeyJ":
        input.attack = pressed;
        if (pressed) input.attackPressed = true;
        // Нум: суллахад shoot унтраана — үгүй бол bowChargeLock гацаад дахин харваж чадахгүй
        if (!pressed) input.shoot = false;
        break;
      case "KeyK":
        input.herd = pressed;
        if (pressed) input.migrate = true;
        break;
      case "KeyF":
        if (pressed) input.horseMount = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        if (pressed) {
          input.dodge = true;
          input.dodgePressed = true;
        }
        break;
      case "KeyL":
        if (pressed) input.lightFire = true;
        break;
      case "Enter":
        if (pressed) input.confirm = true;
        break;
      case "KeyP":
        if (pressed) input.pause = true;
        break;
      case "Tab":
        if (pressed && !isRepeat) input.inventoryToggle = true;
        break;
      case "KeyQ":
        if (pressed) input.eat = true;
        break;
      case "Slash":
        if (pressed) input.debugCheats = true;
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
      case "Digit5":
      case "Numpad5":
        if (pressed) input.debugBoss = true;
        break;
    }
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    setKey(e.code, true, e.repeat);
    if (
      [
        "Space",
        "Tab",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.code)
    ) {
      e.preventDefault();
    }
  };
  const onKeyUp = (e: KeyboardEvent): void => setKey(e.code, false);

  /** Цонх алдах / таб солих үед WASD гацахаас сэргийлнэ */
  const clearHeldMove = (): void => {
    const input = getInput();
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
    input.attack = false;
    input.shoot = false;
    input.herd = false;
  };
  const onBlur = (): void => clearHeldMove();
  const onVis = (): void => {
    if (document.visibilityState === "hidden") clearHeldMove();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVis);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVis);
  };
}

// ---------------------------------------------------------------------------
// Threat spawning
// ---------------------------------------------------------------------------

/** Гол / туурай / малын ambient — зөвхөн playing */
function updatePlayingWorldAudio(state: GameState, dt: number): void {
  const { player, world } = state;
  const cx = riverCenterX(player.pos.y);
  const half = riverHalfWidth(player.pos.y);
  const edgeDist = Math.abs(player.pos.x - cx) - half;
  let riverProx = 0;
  if (isInRiver(player.pos, 8)) riverProx = 1;
  else if (edgeDist < 160) riverProx = clamp(1 - edgeDist / 160, 0, 1);
  updateRiverAmbience(riverProx);

  tickHoofsteps(dt, player.riding, player.moving);

  let nearSheep = false;
  let nearCattle = false;
  for (const a of world.flock.visuals) {
    if (a.hp <= 0) continue;
    if (dist(player.pos, a.pos) > 90) continue;
    if (a.kind === "cattle") nearCattle = true;
    else if (a.kind === "sheep" || a.kind === "goat") nearSheep = true;
    if (nearSheep && nearCattle) break;
  }
  tickLivestockVocal(dt, nearSheep, nearCattle);

  const fire = world.campfire;
  const outdoorBurning =
    fire.placed && (fire.lit || fire.igniting > 0);
  syncCampfireLoop(outdoorBurning);
  syncWeatherStormAmbience(world.weather === "storm", false);
}

export function update(state: GameState, dt: number): void {
  ensureStoryState(state);
  const phaseBefore = state.phase;
  if (state.phase !== "playing") {
    updateRiverAmbience(0);
    tickHoofsteps(0, false, false);
    if (state.phase !== "ger") {
      syncCampfireLoop(false);
      syncWeatherStormAmbience(false);
    }
  }

  // Меню ба пауз
  if (state.phase === "menu") {
    updateMenu(state);
  } else if (state.phase === "intro") {
    updateOpeningSequence(state, dt);
    state.fencePreview = false;
    state.inventoryOpen = false;
  } else if (state.phase === "paused") {
    updatePauseMenu(state);
    state.inventoryOpen = false;
  } else if (state.phase === "ger") {
    if (state.input.inventoryToggle) {
      state.inventoryOpen = !state.inventoryOpen;
      sfx("select");
    }
    updateGer(state, dt);
    const fire = state.world.campfire;
    const outdoorBurning =
      fire.placed && (fire.lit || fire.igniting > 0);
    syncCampfireLoop(state.gerStoveLit || outdoorBurning);
    // Гэрт байхад бороо нам дуугарна
    syncWeatherStormAmbience(state.world.weather === "storm", true);
    state.fencePreview = false;
  } else if (state.phase === "elder") {
    // React ElderModal хариуцна — P/Esc дарвал хаана
    state.inventoryOpen = false;
    if (
      state.input.interact &&
      state.story.shortDialogueStarted &&
      !state.story.shortDialogueCompleted
    ) {
      advanceElderDialogue(state);
      state.input.interact = false;
    } else if (state.input.pause && !state.elderShowingChoices) {
      closeElder(state);
    }
    state.fencePreview = false;
  } else if (state.phase === "spirit") {
    state.fencePreview = false;
    if (state.input.inventoryToggle) {
      state.inventoryOpen = !state.inventoryOpen;
      sfx("select");
    }
    // Шулмасын горимд P = пауз. Буцах = чулуун овоо / хаалга (update loop).
    if (state.input.pause) {
      state.pauseReturnPhase = "spirit";
      state.phase = "paused";
      state.pauseIndex = 0;
      state.menuScreen = "main";
      state.input.pause = false;
      state.inventoryOpen = false;
      sfx("select");
    }
  } else if (state.phase === "levelup") {
    updateLevelUp(state);
    state.fencePreview = false;
    state.inventoryOpen = false;
  } else if (state.phase === "playing" && state.input.pause) {
    state.pauseReturnPhase = "playing";
    state.phase = "paused";
    state.pauseIndex = 0;
    state.menuScreen = "main";
    state.fencePreview = false;
    state.inventoryOpen = false;
    sfx("select");
  } else if (state.phase === "playing" && state.input.inventoryToggle) {
    state.inventoryOpen = !state.inventoryOpen;
    sfx("select");
  } else if (
    state.phase === "lost" &&
    hasCompletedStory() &&
    state.input.interact
  ) {
    // Түүх нэг удаа дуусгасан бол ялагдлын дэлгэцээс шууд family life рүү
    clearSave();
    state.requestSkipStory = true;
    sfx("select");
  } else if (
    (state.phase === "won" || state.phase === "lost") &&
    (state.input.confirm || state.input.pause || state.input.mouseClicked)
  ) {
    state.requestRestart = true;
    sfx("select");
  }

  // Хашаа preview — сумнаар чиглэл/байрлал (menu flag арилгахаас өмнө)
  if (state.phase === "playing" && state.fencePreview) {
    updateFencePreviewAim(state);
  }

  ensureHotbar(state);
  updateHotbar(state);

  state.input.confirm = false;
  state.input.pause = false;
  state.input.inventoryToggle = false;
  state.input.menuUp = false;
  state.input.menuDown = false;
  state.input.menuLeft = false;
  state.input.menuRight = false;
  state.input.mouseMoved = false;
  state.input.mouseClicked = false;

  // Hotbar-аас tool; J — цохих/хашаа; K — харвах
  if (state.phase === "playing" || state.phase === "spirit") {
    applySelectedToolInput(state);
  }
  state.input.skill1 = false;
  state.input.skill2 = false;
  state.input.skill3 = false;
  state.input.skill4 = false;

  const hitStopped =
    (state.phase === "playing" || state.phase === "spirit") &&
    updateHitStop(state, dt);

  if (
    (state.phase === "playing" || state.phase === "spirit") &&
    state.input.debugCheats
  ) {
    const enable = !(
      state.godMode &&
      state.unlimitedWood &&
      state.unlimitedCoins &&
      state.unlimitedSupplies
    );
    state.godMode = enable;
    state.unlimitedWood = enable;
    state.unlimitedCoins = enable;
    state.unlimitedSupplies = enable;
    if (enable) {
      state.player.vitals.health = state.player.vitals.maxHealth;
      state.score = Math.max(state.score, 999999);
      spawnText(state, state.player.pos, "Cheat ON", "#7dffb0");
      setMessage(
        state,
        "Үхэшгүй · мод/чулуу/сум/хоол хязгааргүй · зоос хязгааргүй (/).",
        3.2,
      );
    } else {
      state.player.inventory.wood = Math.min(state.player.inventory.wood, 50);
      state.score = Math.min(state.score, 500);
      spawnText(state, state.player.pos, "Cheat OFF", "#a89880");
      setMessage(state, "Cheat унтарлаа.", 2);
    }
    sfx("buy");
  }

  if (state.phase === "playing" && !hitStopped) {
    const openingMilestoneActive =
      state.story.familyReunionEffectRemaining > 0 ||
      (state.story.activeMainObjective !== null &&
        state.story.activeMainObjective !== "growFlock");
    if (state.input.debugBoss && !openingMilestoneActive) {
      forceStartTumurShulmasBoss(state);
    }
    if (!openingStoryControlsWorldTime(state)) {
      updateWeatherCycle(state, dt);
    }
    const lighting = state.world.campfire.igniting > 0;
    const firstNightCutscene =
      firstNightElderCutsceneActive(state) ||
      state.story.familyReunionEffectRemaining > 0;
    if (!firstNightCutscene) {
      updateCombat(state, dt);
      updatePlayerMovement(state, dt);
      updatePlayingWorldAudio(state, dt);
      if (!lighting) {
        const usedRouteInteraction =
          !openingMilestoneActive && tryInteractFirstRoute(state);
        if (!usedRouteInteraction) tryInteract(state);
        tryHorseMount(state);
        tryMigrateGer(state);
      }
      tryLightCampfire(state);
      if (!lighting) tryBuildFence(state);
    } else {
      state.player.moving = false;
      updateRiverAmbience(0);
      const fire = state.world.campfire;
      syncCampfireLoop(fire.placed && (fire.lit || fire.igniting > 0));
      syncWeatherStormAmbience(state.world.weather === "storm", false);
      state.input.attack = false;
      state.input.attackPressed = false;
      state.input.parry = false;
      state.input.parryPressed = false;
      state.input.dodge = false;
      state.input.dodgePressed = false;
      state.input.shoot = false;
      state.input.interact = false;
    }
    updateGates(state, dt);
    updateFlock(state, dt);
    updateProduction(state, dt);
    updateParents(state, dt);
    updateWildHorses(state, dt);
    updateFish(state, dt);
    if (!openingMilestoneActive) {
      updateFirstRoute(state, dt);
      updateTumurShulmasEncounter(state, dt);
    }
    // Boss-ийн death frame дээр "won" болсон бол дараагийн survival/threat
    // систем ялалтын төлөвийг "lost"-оор дарж болохгүй.
    if (state.phase === "playing") {
      if (!openingMilestoneActive) {
        updateThreatTimers(state, dt);
        updateWolves(state, dt);
        updateThieves(state, dt);
      } else if (
        storyWolfUsesExistingAi(state) &&
        state.story.storyWolfId !== null
      ) {
        updateWolves(state, dt, state.story.storyWolfId);
      }
      updateDog(state, dt);
      updateProjectiles(state, dt);
      updateSurvival(state, dt);
      checkHerdVictory(state);
      if (state.messageTimer > 0) state.messageTimer -= dt;
      if (state.bannerAlert) {
        state.bannerAlert.timer -= dt;
        if (state.bannerAlert.timer <= 0) state.bannerAlert = null;
      }
    }
  } else if (state.phase === "spirit" && !hitStopped) {
    // Бодит дэлхийн цаг / мал / цаг агаар зогсоно — зөвхөн тулаан
    updateSpiritWorld(state, dt);
    if (state.phase === "spirit") {
      updateCombat(state, dt);
      updatePlayerMovement(state, dt);
      const usedRouteInteraction = tryInteractFirstRoute(state);
      if (!usedRouteInteraction) {
        if (tryCollectSpiritOvooSoul(state)) {
          // амь авсан
        } else if (state.story.spiritAllowReturn && state.input.interact) {
          tryExitSpiritViaOvoo(state);
        } else {
          tryInteract(state);
          if (
            state.input.interact &&
            state.spiritMode === "shulmas" &&
            !state.story.spiritAllowReturn
          ) {
            state.input.interact = false;
            setMessage(
              state,
              "Энэ удаа буцах хаалга байхгүй. Мангасыг дарж л гэртээ харьна.",
              2.8,
            );
            sfx("move");
          }
        }
      }
      updateFirstRoute(state, dt);
      if (state.spiritMode === "shulmas") {
        updateTumurShulmasEncounter(state, dt);
      } else {
        updateWolves(state, dt);
      }
      updateDog(state, dt);
      updateProjectiles(state, dt);
      if (state.messageTimer > 0) state.messageTimer -= dt;
      if (state.bannerAlert) {
        state.bannerAlert.timer -= dt;
        if (state.bannerAlert.timer <= 0) state.bannerAlert = null;
      }
    }
  }

  updateHearthQuest(state, dt);
  updateLivestockRecoveryQuest(state, dt);
  updateMilestone3(state, dt);
  updateMilestone4(state, dt);
  updateMilestone7(state, dt);
  updateMilestone8(state, dt);

  // Шилжилтийн манан — playing дээр ч үлдэгдэл байж болно
  if (state.phase === "playing" && state.spiritTransition > 0) {
    state.spiritTransition = Math.max(0, state.spiritTransition - dt);
  }

  // Фаз солигдоход нэг удаагийн дуут дохио
  if (state.phase !== phaseBefore) {
    if (state.phase === "won") sfx("win");
    else if (state.phase === "lost") sfx("lose");
    else if (state.phase === "levelup") sfx("levelup");
  }

  updateEffects(state, dt);
  tickElderHitFlash(state, dt);

  // Нэг удаагийн үйлдлийн товчнуудыг frame бүрийн төгсгөлд цэвэрлэнэ
  state.input.interact = false;
  state.input.eat = false;
  state.input.lightFire = false;
  state.input.buildFence = false;
  state.input.debugCheats = false;
  state.input.debugBoss = false;
  state.input.migrate = false;
  state.input.horseMount = false;

  // Hitstop үед тулааны оролтыг хадгална — дараагийн frame-д боловсруулна
  if (!hitStopped) {
    state.input.attack = false;
    state.input.attackPressed = false;
    state.input.dodge = false;
    state.input.dodgePressed = false;
    state.input.parry = false;
    state.input.parryPressed = false;
  }
}

// ---------------------------------------------------------------------------
// Terrain prerender
// ---------------------------------------------------------------------------

/** Утасны браузерын виртуал удирдлага — барих товчнууд */
export type TouchHoldAction = "attack" | "shoot" | "herd";

/** Утасны браузерын виртуал удирдлага — нэг удаагийн товчнууд */
export type TouchPulseAction =
  | "interact"
  | "dodge"
  | "parry"
  | "eat"
  | "lightFire"
  | "buildFence"
  | "migrate"
  | "horseMount"
  | "pause"
  | "inventory"
  | "confirm";

export interface HerderGameHandle {
  destroy: () => void;
  getPhase: () => GameState["phase"];
  /** Joystick: x/y ∈ [-1, 1], 0 = сулласан */
  setTouchMove: (x: number, y: number) => void;
  setTouchHold: (action: TouchHoldAction, pressed: boolean) => void;
  pulseTouch: (action: TouchPulseAction) => void;
  setElderTab: (tab: ElderTab) => void;
  levelUpWithElder: () => void;
  tradeWithElder: (itemId: string) => void;
  startElderDialogue: (id: string) => void;
  advanceElderDialogue: () => void;
  retreatElderDialogue: () => void;
  chooseElderOption: (id: ElderChoiceId) => void;
  submitElderQuizAnswer: (optionIndex: number) => void;
  advanceElderQuiz: () => void;
  closeElderModal: () => void;
  /** Түр хөгжүүлэлтийн cheat — одоогийн opening story үеийг алгасана. */
  skipStoryStage: () => void;
}

export interface MountHerderOptions {
  onElderUi?: (snapshot: ElderUiSnapshot) => void;
}

/** Canvas дээр тоглоом эхлүүлнэ. Unmount үед destroy() дуудна. */
export function mountHerderGame(
  canvas: HTMLCanvasElement,
  options: MountHerderOptions = {},
): HerderGameHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context дэмжигдэхгүй");
  bindDisplayCanvas(canvas);

  // Canvas дээрх бүх бичвэр эндээс орчуулагдана — дэлгэрэнгүйг locale/canvasText
  localizeCanvasText(ctx);

  // Логик 960×540 тогтмол — CSS viewport-ыг дүүргэж томруулна (харьцаа хадгална)
  const applyCanvasBuffer = (): void => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = VIEW_W * dpr;
    canvas.height = VIEW_H * dpr;
    canvas.style.width = "";
    canvas.style.height = "";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  applyCanvasBuffer();

  const rc: RenderContext = {
    ctx,
    terrain: renderTerrain(false, DEFAULT_TERRAIN_SEED),
    terrainWinter: renderTerrain(true, DEFAULT_TERRAIN_SEED),
    lightCanvas: (() => {
      const c = document.createElement("canvas");
      c.width = VIEW_W;
      c.height = VIEW_H;
      return c;
    })(),
    vignette: makeVignette(),
    tumurShulmasSprites: loadTumurShulmasSprites(),
  };

  const onWindowResize = (): void => {
    syncVisualViewportVars();
    applyCanvasBuffer();
  };
  window.addEventListener("resize", onWindowResize);
  window.visualViewport?.addEventListener("resize", onWindowResize);
  window.visualViewport?.addEventListener("scroll", onWindowResize);
  document.addEventListener("fullscreenchange", onWindowResize);
  document.addEventListener("webkitfullscreenchange", onWindowResize);
  syncVisualViewportVars();

  let state = createInitialState();
  const unbindInput = bindInput(
    () => state.input,
    () => state.fencePreview,
    () => state.phase,
  );

  // Түр хөгжүүлэлтийн shortcut:
  // . — одоогийн story үеийг алгасана
  // ; — сүнс (рашаан+буцах; буцахад материал хураагдана)
  // ' — шулмасыг дийлээд аав ээжтэй амьдрах үе рүү шууд орно
  // , — зэвсэг + рашаан 3 балга (орохгүй)
  const onStoryCheatKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    if (event.code === "Comma") {
      event.preventDefault();
      debugGrantSpiritCombatGear(state, { withWater: true });
      return;
    }
    if (event.code === "Period") {
      event.preventDefault();
      debugSkipCurrentStoryStage(state);
      syncStoryMusic(state);
      return;
    }
    if (event.code === "Semicolon") {
      event.preventDefault();
      debugJumpToSpiritWorld(state);
      syncStoryMusic(state);
      return;
    }
    if (event.code === "Quote") {
      event.preventDefault();
      debugJumpToFamilyLife(state);
      syncStoryMusic(state);
    }
  };
  window.addEventListener("keydown", onStoryCheatKeyDown);

  /** O — бүтэн дэлгэц (CSS + Fullscreen API) */
  const onFullscreenKey = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    const isO =
      event.code === "KeyO" ||
      event.key === "o" ||
      event.key === "O" ||
      event.key === "о" ||
      event.key === "О";
    if (!isO) return;
    const t = event.target as HTMLElement | null;
    if (
      t &&
      (t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable)
    ) {
      return;
    }
    event.preventDefault();
    void ensureImmersiveDisplay().then(() => {
      setMessage(state, "Бүтэн дэлгэц", 1.6);
      applyCanvasBuffer();
    });
  };
  window.addEventListener("keydown", onFullscreenKey, true);
  let lastElderKey = "";

  const notifyElderUi = (): void => {
    if (!options.onElderUi) return;
    const snap = getElderUiSnapshot(state);
    const quiz = snap.open ? snap.cultureQuiz : null;
    const key = snap.open
      ? [
          snap.tab,
          snap.eyeMode,
          snap.score,
          snap.level,
          snap.xp,
          snap.xpNext,
          snap.talkIsQuiz ? 1 : 0,
          quiz
            ? `${quiz.questionId}:${quiz.feedback}:${quiz.selectedIndex}:${quiz.askedCount}:${quiz.options.join("~")}`
            : "noquiz",
          snap.trades
            .map((t) => `${t.id}:${t.have}:${t.owned ? 1 : 0}:${t.canTrade ? 1 : 0}:${t.detail}`)
            .join(","),
          snap.activeDialogue
            ? `${snap.activeDialogue.id}:${snap.activeDialogue.beatIndex}:${snap.activeDialogue.showingChoices}`
            : "none",
        ].join("|")
      : "closed";
    if (key === lastElderKey) return;
    lastElderKey = key;
    options.onElderUi(snap);
  };

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
    // React modal үед canvas click хэрэггүй
    if (state.phase === "elder") return;
    const p = toView(e);
    state.input.mouseX = p.x;
    state.input.mouseY = p.y;
    state.input.mouseClicked = true;
    // Play/menu — ижил gesture дотор fullscreen (хожим frame-ээс дуудвал Android ч зөвшөөрөхгүй)
    if (state.phase === "menu") {
      void enterImmersiveDisplay().then(() => applyCanvasBuffer());
    }
  };
  /** Мэдрэгч/хулгана хоёр товшилт — бүтэн дэлгэц */
  const goImmersiveFromGesture = (): void => {
    void ensureImmersiveDisplay().then(() => {
      setMessage(state, "Бүтэн дэлгэц", 1.6);
      applyCanvasBuffer();
    });
  };
  const onDblClick = (e: MouseEvent): void => {
    if (state.phase === "elder") return;
    e.preventDefault();
    goImmersiveFromGesture();
  };
  // Touch: dblclick үгүй тул хоёр товшилтыг гараар илрүүлнэ
  let lastTapAt = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  const onTouchDoubleTap = (e: PointerEvent): void => {
    if (e.pointerType !== "touch") return;
    if (state.phase === "elder") return;
    const now = performance.now();
    const dx = e.clientX - lastTapX;
    const dy = e.clientY - lastTapY;
    if (now - lastTapAt < 320 && dx * dx + dy * dy < 40 * 40) {
      e.preventDefault();
      goImmersiveFromGesture();
      lastTapAt = 0;
      return;
    }
    lastTapAt = now;
    lastTapX = e.clientX;
    lastTapY = e.clientY;
  };
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerdown", onTouchDoubleTap);
  canvas.addEventListener("dblclick", onDblClick);

  // Аудио — browser autoplay бодлогын дагуу эхний үйлдлээр асна
  loadAudioSettings();
  loadLangSetting();
  preloadGameIcons();
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

  /** Автомат хадгалалтын үлдсэн хугацаа (сек) */
  let autosaveIn = AUTOSAVE_INTERVAL;

  // Таб хаах / нуух үед сүүлчийн байдлаа гээхгүйн тулд шууд хадгална
  const persistNow = (): void => {
    captureRecords(state);
    saveGame(state);
  };
  const onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") persistNow();
  };
  window.addEventListener("beforeunload", persistNow);
  document.addEventListener("visibilitychange", onVisibilityChange);

  const frame = (now: number): void => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (state.requestSkipStory) {
      state = createInitialState();
      startFamilyLifeRun(state);
      lastElderKey = "";
      autosaveIn = AUTOSAVE_INTERVAL;
      options.onElderUi?.({ open: false });
      syncStoryMusic(state);
    } else if (state.requestRestart) {
      state = createInitialState();
      lastElderKey = "";
      autosaveIn = AUTOSAVE_INTERVAL;
      options.onElderUi?.({ open: false });
      syncStoryMusic(state);
    }

    if (state.requestLoad) {
      const loaded = loadGame();
      if (loaded) {
        state = loaded;
        lastElderKey = "";
        options.onElderUi?.({ open: false });
        syncStoryMusic(state);
      } else {
        // Хадгалалт эвдэрсэн — цэс дээр "Үргэлжлүүлэх" харагдахаа болино
        clearSave();
        state.requestLoad = false;
      }
      autosaveIn = AUTOSAVE_INTERVAL;
    }

    const phaseBefore = state.phase;
    update(state, dt);
    syncStoryMusic(state);
    // Play дармагц браузерийн fullscreen руу орно
    if (
      phaseBefore === "menu" &&
      (state.phase === "intro" || state.phase === "playing")
    ) {
      void enterImmersiveDisplay().then(() => applyCanvasBuffer());
    }

    // Тоглолт дуусмагц амжилтыг бүртгэнэ. Ялагдвал хадгалалт цэвэрлэгдэнэ;
    // ялвал үлдэнэ — тоглогч "Үргэлжлүүлэх"-ээр сүргээ өсгөсөөр байж болно.
    if (
      (state.phase === "won" || state.phase === "lost") &&
      phaseBefore !== state.phase
    ) {
      captureRecords(state);
      if (state.phase === "lost") clearSave();
      else saveGame(state);
    }

    autosaveIn -= dt;
    if (autosaveIn <= 0) {
      autosaveIn = AUTOSAVE_INTERVAL;
      captureRecords(state);
      saveGame(state);
    }

    notifyElderUi();
    render(rc, state, now / 1000);
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);

  return {
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      unbindInput();
      bindDisplayCanvas(null);
      window.removeEventListener("resize", onWindowResize);
      window.visualViewport?.removeEventListener("resize", onWindowResize);
      window.visualViewport?.removeEventListener("scroll", onWindowResize);
      document.removeEventListener("fullscreenchange", onWindowResize);
      document.removeEventListener("webkitfullscreenchange", onWindowResize);
      window.removeEventListener("keydown", onFullscreenKey, true);
      window.removeEventListener("keydown", onStoryCheatKeyDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerdown", onTouchDoubleTap);
      canvas.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("beforeunload", persistNow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      persistNow();
      shutdownAudio();
      options.onElderUi?.({ open: false });
    },
    getPhase: () => state.phase,
    setTouchMove: (x: number, y: number) => {
      const dead = 0.18;
      state.input.left = x < -dead;
      state.input.right = x > dead;
      state.input.up = y < -dead;
      state.input.down = y > dead;
    },
    setTouchHold: (action: TouchHoldAction, pressed: boolean) => {
      if (action === "attack") {
        state.input.attack = pressed;
        if (pressed) state.input.attackPressed = true;
      } else if (action === "shoot") {
        state.input.shoot = pressed;
      } else if (action === "herd") {
        state.input.herd = pressed;
      }
    },
    pulseTouch: (action: TouchPulseAction) => {
      if (action === "interact") {
        state.input.interact = true;
        state.input.confirm = true;
      } else if (action === "dodge") {
        state.input.dodge = true;
        state.input.dodgePressed = true;
      } else if (action === "parry") {
        state.input.parry = true;
        state.input.parryPressed = true;
      } else if (action === "eat") {
        state.input.eat = true;
      } else if (action === "lightFire") {
        state.input.lightFire = true;
      } else if (action === "buildFence") {
        state.input.buildFence = true;
      } else if (action === "migrate") {
        state.input.migrate = true;
      } else if (action === "horseMount") {
        state.input.horseMount = true;
      } else if (action === "pause") {
        state.input.pause = true;
      } else if (action === "inventory") {
        state.input.inventoryToggle = true;
      } else if (action === "confirm") {
        state.input.confirm = true;
      }
    },
    setElderTab: (tab: ElderTab) => {
      setElderTab(state, tab);
      notifyElderUi();
    },
    levelUpWithElder: () => {
      beginElderLevelUp(state);
      notifyElderUi();
    },
    tradeWithElder: (itemId: string) => {
      tradeWithElder(state, itemId);
      notifyElderUi();
    },
    startElderDialogue: (id: string) => {
      startElderDialogue(state, id);
      notifyElderUi();
    },
    advanceElderDialogue: () => {
      advanceElderDialogue(state);
      notifyElderUi();
    },
    retreatElderDialogue: () => {
      retreatElderDialogue(state);
      notifyElderUi();
    },
    chooseElderOption: (id: ElderChoiceId) => {
      chooseElderOption(state, id);
      notifyElderUi();
    },
    submitElderQuizAnswer: (optionIndex: number) => {
      submitElderCultureAnswer(state, optionIndex);
      notifyElderUi();
    },
    advanceElderQuiz: () => {
      advanceElderCultureQuiz(state);
      notifyElderUi();
    },
    closeElderModal: () => {
      closeElder(state);
      notifyElderUi();
    },
    skipStoryStage: () => {
      debugSkipCurrentStoryStage(state);
      syncStoryMusic(state);
      notifyElderUi();
    },
  };
}
