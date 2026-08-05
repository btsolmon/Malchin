// Хүн 6 — меню, дэлгүүр, HUD, minimap

import {
  COLORS,
  FENCE_COST,
  FENCE_TIER_NAMES,
  FENCE_TIER_SHORT,
  FENCE_UPGRADE_COST,
  GATE_PASS_OPEN,
  LIVESTOCK_EMOJI,
  LIVESTOCK_KINDS,
  PASTURE_RADIUS,
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  type Camera,
  type GameState,
  type InputState,
  type Season,
  type Vector2,
  type WeatherKind,
} from "../game/types";
import {
  clamp,
  nearestFence,
  pastureCenter,
  roundRectPath,
  setMessage,
} from "../game/utils";
import { audio, setMusicVol, setSfxVol, sfx } from "../game/audio";
import { maybeLevelUp } from "../game/player";
import { DESERT_Y, FOREST_Y, RIVER_HALF_W, riverCenterX } from "./biomes";
import { inShulmasSpirit } from "./firstRoute";
import { drawPlayer } from "./render/entities";
import { SHOP_ITEMS, buyItem } from "./shop";

export type { ShopItem } from "./shop";
export {
  SHOP_ITEMS,
  buyItem,
  buyShopItemById,
  findShopItemIndex,
  shopItemId,
} from "./shop";

export interface UiButton {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export function overButton(b: UiButton, input: InputState): boolean {
  return (
    input.mouseX >= b.x &&
    input.mouseX <= b.x + b.w &&
    input.mouseY >= b.y &&
    input.mouseY <= b.y + b.h
  );
}

export const MAIN_MENU_LABELS = [
  "Тоглох",
  "Тохиргоо",
  "Удирдлага",
  "Багийнхан",
];

export function mainMenuButtons(): UiButton[] {
  const w = 230;
  const h = 46;
  const gap = 13;
  const x = (VIEW_W - w) / 2;
  const y0 = 244;
  return MAIN_MENU_LABELS.map((label, i) => ({
    x,
    y: y0 + i * (h + gap),
    w,
    h,
    label,
  }));
}

export function pauseMenuButtons(): UiButton[] {
  const w = 250;
  const h = 44;
  const gap = 12;
  const x = (VIEW_W - w) / 2;
  const y0 = VIEW_H / 2 - 70;
  return ["Үргэлжлүүлэх", "Тохиргоо", "Удирдлага", "Үндсэн цэс"].map(
    (label, i) => ({
      x,
      y: y0 + i * (h + gap),
      w,
      h,
      label,
    }),
  );
}

export function settingsLayout(): {
  rows: Array<{ label: string; bar: UiButton }>;
  back: UiButton;
} {
  const barW = 250;
  const barX = VIEW_W / 2 - 30;
  return {
    rows: [
      {
        label: "Ая",
        bar: { x: barX, y: 226, w: barW, h: 20, label: "" },
      },
      {
        label: "Дууны эффект",
        bar: { x: barX, y: 288, w: barW, h: 20, label: "" },
      },
    ],
    back: { x: (VIEW_W - 170) / 2, y: 362, w: 170, h: 44, label: "Буцах" },
  };
}

export function updateSettingsMenu(state: GameState): void {
  const input = state.input;
  const lay = settingsLayout();
  const rowCount = 3; // ая, эффект, буцах

  if (input.menuUp) {
    state.menuIndex = (state.menuIndex + rowCount - 1) % rowCount;
    sfx("move");
  }
  if (input.menuDown) {
    state.menuIndex = (state.menuIndex + 1) % rowCount;
    sfx("move");
  }

  const getters = [(): number => audio.musicVol, (): number => audio.sfxVol];
  const setters = [setMusicVol, setSfxVol];
  if (state.menuIndex < 2) {
    if (input.menuLeft) {
      setters[state.menuIndex](getters[state.menuIndex]() - 0.1);
      sfx("move");
    }
    if (input.menuRight) {
      setters[state.menuIndex](getters[state.menuIndex]() + 0.1);
      sfx("move");
    }
  }

  if (input.mouseMoved) {
    lay.rows.forEach((row, i) => {
      if (overButton(row.bar, input)) state.menuIndex = i;
    });
    if (overButton(lay.back, input)) state.menuIndex = 2;
  }
  if (input.mouseClicked) {
    lay.rows.forEach((row, i) => {
      if (overButton(row.bar, input)) {
        const rel = clamp((input.mouseX - row.bar.x) / row.bar.w, 0, 1);
        setters[i](Math.round(rel * 10) / 10);
        sfx("move");
      }
    });
    if (overButton(lay.back, input)) {
      if (state.phase === "paused") {
        state.menuScreen = "main";
        state.pauseIndex = 1;
      } else {
        state.menuScreen = "main";
        state.menuIndex = 1;
      }
      sfx("select");
      return;
    }
  }

  if (input.pause || (input.confirm && state.menuIndex === 2)) {
    if (state.phase === "paused") {
      state.menuScreen = "main";
      state.pauseIndex = 1;
    } else {
      state.menuScreen = "main";
      state.menuIndex = 1;
    }
    sfx("select");
  }
}

export function updateMenu(state: GameState): void {
  const input = state.input;

  if (state.menuScreen === "main") {
    const btns = mainMenuButtons();
    if (input.menuUp) {
      state.menuIndex = (state.menuIndex + btns.length - 1) % btns.length;
      sfx("move");
    }
    if (input.menuDown) {
      state.menuIndex = (state.menuIndex + 1) % btns.length;
      sfx("move");
    }
    if (input.mouseMoved) {
      btns.forEach((b, i) => {
        if (overButton(b, input)) state.menuIndex = i;
      });
    }

    let activate = -1;
    if (input.confirm) activate = state.menuIndex;
    if (input.mouseClicked) {
      const i = btns.findIndex((b) => overButton(b, input));
      if (i >= 0) activate = i;
    }

    if (activate === 0) {
      state.phase = "playing";
      setMessage(state, "Үүр цайлаа! Галаа түлээд малаа бэлчээрт гарга.", 6);
      sfx("select");
    } else if (activate === 1) {
      state.menuScreen = "settings";
      state.menuIndex = 0;
      sfx("select");
    } else if (activate === 2) {
      state.menuScreen = "controls";
      sfx("select");
    } else if (activate === 3) {
      state.menuScreen = "credits";
      sfx("select");
    }
    return;
  }

  if (state.menuScreen === "settings") {
    updateSettingsMenu(state);
    return;
  }

  // Удирдлага / Багийнхан — дурын товч буцаана
  if (input.confirm || input.pause || input.mouseClicked) {
    state.menuIndex = state.menuScreen === "controls" ? 2 : 3;
    state.menuScreen = "main";
    sfx("select");
  }
}

// ---------------------------------------------------------------------------
// Гэр ба дэлгүүр
// ---------------------------------------------------------------------------

export const CRAFT_RECIPES: Array<{
  id: string;
  name: string;
  desc: string;
  need: Partial<Record<"wool" | "cashmere" | "milk", number>>;
  give: Partial<Record<"felt" | "aaruul", number>>;
}> = [
  {
    id: "felt",
    name: "Эсгий",
    desc: "3 ноос → 1 эсгий",
    need: { wool: 3 },
    give: { felt: 1 },
  },
  {
    id: "aaruul",
    name: "Ааруул",
    desc: "2 сүү → 1 ааруул",
    need: { milk: 2 },
    give: { aaruul: 1 },
  },
  {
    id: "cashmere_felt",
    name: "Ноолууран эсгий",
    desc: "2 ноолуур → 2 эсгий",
    need: { cashmere: 2 },
    give: { felt: 2 },
  },
];

export function gerLayout(): {
  chest: UiButton;
  door: UiButton;
  bedL: UiButton;
  bedR: UiButton;
  altar: UiButton;
} {
  return {
    chest: { x: 580, y: 255, w: 140, h: 95, label: "" },
    door: { x: 400, y: 452, w: 160, h: 72, label: "" },
    bedL: { x: 55, y: 300, w: 190, h: 84, label: "" },
    bedR: { x: 715, y: 300, w: 190, h: 84, label: "" },
    altar: { x: 390, y: 255, w: 180, h: 90, label: "" },
  };
}

/** Гэр доторх малчны ойролцоо байгаа зүйлс */
export function gerProximity(state: GameState): {
  nearChest: boolean;
  nearBed: boolean;
  nearBedL: boolean;
  nearBedR: boolean;
  nearAltar: boolean;
  atDoor: boolean;
} {
  const p = state.gerPlayer;
  const lay = gerLayout();
  const nearRect = (r: UiButton, range: number): boolean => {
    const nx = clamp(p.x, r.x, r.x + r.w);
    const ny = clamp(p.y, r.y, r.y + r.h);
    return Math.hypot(p.x - nx, p.y - ny) < range;
  };
  const nearBedL = nearRect(lay.bedL, 50);
  const nearBedR = nearRect(lay.bedR, 50);
  return {
    nearChest: nearRect(lay.chest, 55),
    nearBed: nearBedL || nearBedR,
    nearBedL,
    nearBedR,
    nearAltar: nearRect(lay.altar, 55),
    atDoor: p.y > 492 && Math.abs(p.x - 480) < 90,
  };
}

const CHEST_ITEMS: Array<{
  key: "milk" | "aaruul" | "felt" | "wool" | "cashmere";
  icon: string;
  name: string;
  desc: string;
}> = [
  { key: "milk", icon: "🥛", name: "Сүү", desc: "Цагаан идээ · хадгалсан" },
  { key: "aaruul", icon: "🧀", name: "Ааруул", desc: "Боловсруулсан сүү" },
  { key: "felt", icon: "🧺", name: "Эсгий", desc: "Ноосоор урласан" },
  { key: "wool", icon: "🧶", name: "Ноос", desc: "Хонь / тэмээний ноос" },
  { key: "cashmere", icon: "🧵", name: "Ноолуур", desc: "Ямааны ноолуур" },
];

export function chestLayout(): {
  panel: UiButton;
  rows: UiButton[];
  close: UiButton;
} {
  const w = 520;
  const h = 76 + CHEST_ITEMS.length * 54 + 70;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  const rows: UiButton[] = CHEST_ITEMS.map((_, i) => ({
    x: x + 24,
    y: y + 76 + i * 54,
    w: w - 48,
    h: 48,
    label: "",
  }));
  return {
    panel: { x, y, w, h, label: "" },
    rows,
    close: {
      x: x + w / 2 - 70,
      y: y + h - 54,
      w: 140,
      h: 40,
      label: "Хаах (P)",
    },
  };
}

const SHOP_VISIBLE = 6;

export function shopLayout(): {
  panel: UiButton;
  rows: UiButton[];
  close: UiButton;
} {
  const w = 640;
  const h = 76 + SHOP_VISIBLE * 54 + 70;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  const rows: UiButton[] = [];
  for (let i = 0; i < SHOP_VISIBLE; i++) {
    rows.push({
      x: x + 24,
      y: y + 76 + i * 54,
      w: w - 48,
      h: 48,
      label: "",
    });
  }
  return {
    panel: { x, y, w, h, label: "" },
    rows,
    close: {
      x: x + w / 2 - 70,
      y: y + h - 54,
      w: 140,
      h: 40,
      label: "Хаах (P)",
    },
  };
}

export function craftLayout(): {
  panel: UiButton;
  rows: UiButton[];
  close: UiButton;
} {
  const w = 520;
  const h = 76 + CRAFT_RECIPES.length * 58 + 70;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  const rows: UiButton[] = CRAFT_RECIPES.map((it, i) => ({
    x: x + 24,
    y: y + 76 + i * 58,
    w: w - 48,
    h: 50,
    label: it.name,
  }));
  return {
    panel: { x, y, w, h, label: "" },
    rows,
    close: {
      x: x + w / 2 - 70,
      y: y + h - 54,
      w: 140,
      h: 40,
      label: "Хаах (P)",
    },
  };
}

function shopScrollStart(menuIndex: number): number {
  return clamp(
    menuIndex - SHOP_VISIBLE + 1,
    0,
    Math.max(0, SHOP_ITEMS.length - SHOP_VISIBLE),
  );
}

export function craftItem(state: GameState, idx: number): void {
  const recipe = CRAFT_RECIPES[idx];
  if (!recipe) return;
  const inv = state.player.inventory;
  for (const [k, need] of Object.entries(recipe.need)) {
    const key = k as "wool" | "cashmere" | "milk";
    if ((inv[key] ?? 0) < (need ?? 0)) {
      setMessage(state, `Хүрэлцэхгүй — ${recipe.desc}`, 2);
      sfx("move");
      return;
    }
  }
  for (const [k, need] of Object.entries(recipe.need)) {
    const key = k as "wool" | "cashmere" | "milk";
    inv[key] -= need ?? 0;
  }
  for (const [k, give] of Object.entries(recipe.give)) {
    const key = k as "felt" | "aaruul";
    inv[key] += give ?? 0;
  }
  sfx("buy");
  setMessage(state, `${recipe.name} хийлээ!`, 2.5);
}

export function updateGer(state: GameState, dt: number): void {
  const input = state.input;

  if (state.gerSleepTimer > 0) {
    state.gerSleepTimer = Math.max(0, state.gerSleepTimer - dt);
    state.player.moving = false;
    if (state.gerSleepTimer <= 0) {
      const player = state.player;
      player.vitals.health = Math.min(
        player.vitals.maxHealth,
        player.vitals.health + 50,
      );
      player.vitals.warmth = Math.min(100, player.vitals.warmth + 40);
      player.sleepCooldown = 60;
      state.gerSleepBed = null;
      sfx("levelup");
      setMessage(state, "Сайхан унтаж амарлаа. +50 амь", 3);
    }
    return;
  }

  if (state.craftOpen) {
    const lay = craftLayout();
    if (input.menuUp) {
      state.menuIndex =
        (state.menuIndex + CRAFT_RECIPES.length - 1) % CRAFT_RECIPES.length;
      sfx("move");
    }
    if (input.menuDown) {
      state.menuIndex = (state.menuIndex + 1) % CRAFT_RECIPES.length;
      sfx("move");
    }
    if (input.mouseMoved) {
      lay.rows.forEach((r, i) => {
        if (overButton(r, input)) state.menuIndex = i;
      });
    }
    if (input.confirm) craftItem(state, state.menuIndex);
    if (input.mouseClicked) {
      const i = lay.rows.findIndex((r) => overButton(r, input));
      if (i >= 0) craftItem(state, i);
      else if (overButton(lay.close, input) || !overButton(lay.panel, input)) {
        state.craftOpen = false;
        sfx("select");
      }
    }
    if (input.pause) {
      state.craftOpen = false;
      sfx("select");
    }
    return;
  }

  if (state.shopOpen) {
    const lay = chestLayout();
    if (input.menuUp) {
      state.menuIndex =
        (state.menuIndex + CHEST_ITEMS.length - 1) % CHEST_ITEMS.length;
      sfx("move");
    }
    if (input.menuDown) {
      state.menuIndex = (state.menuIndex + 1) % CHEST_ITEMS.length;
      sfx("move");
    }
    if (input.mouseMoved) {
      lay.rows.forEach((r, i) => {
        if (overButton(r, input)) state.menuIndex = i;
      });
    }
    if (input.mouseClicked) {
      if (overButton(lay.close, input) || !overButton(lay.panel, input)) {
        state.shopOpen = false;
        sfx("select");
      }
    }
    if (input.pause || input.confirm) {
      state.shopOpen = false;
      sfx("select");
    }
    return;
  }

  const lay = gerLayout();
  const player = state.player;
  const dir = {
    x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    y: (input.down ? 1 : 0) - (input.up ? 1 : 0),
  };
  const len = Math.hypot(dir.x, dir.y);
  player.moving = len > 0;
  if (len > 0) {
    const nx = dir.x / len;
    const ny = dir.y / len;
    player.facing = { x: nx, y: ny };
    state.gerPlayer.x = clamp(state.gerPlayer.x + nx * 170 * dt, 100, 860);
    state.gerPlayer.y = clamp(state.gerPlayer.y + ny * 170 * dt, 330, 508);
  }

  const prox = gerProximity(state);

  if (
    (input.interact && prox.nearChest) ||
    (input.mouseClicked && overButton(lay.chest, input))
  ) {
    state.shopOpen = true;
    state.craftOpen = false;
    state.menuIndex = 0;
    state.input.interact = false;
    sfx("select");
    return;
  }

  if (
    (input.interact && prox.nearAltar) ||
    (input.mouseClicked && overButton(lay.altar, input))
  ) {
    state.craftOpen = true;
    state.shopOpen = false;
    state.menuIndex = 0;
    state.input.interact = false;
    sfx("select");
    return;
  }

  if (input.interact && prox.nearBed) {
    state.input.interact = false;
    if (player.sleepCooldown > 0) {
      setMessage(state, "Саяхан унтсан шүү дээ.", 2);
      sfx("move");
    } else {
      const bed = prox.nearBedL ? lay.bedL : lay.bedR;
      state.gerSleepBed = prox.nearBedL ? "L" : "R";
      state.gerSleepTimer = 5;
      state.gerPlayer.x = bed.x + bed.w / 2;
      state.gerPlayer.y = bed.y + bed.h * 0.38;
      player.moving = false;
      sfx("select");
      setMessage(state, "Унтаж байна…", 5);
    }
    return;
  }

  if (
    prox.atDoor ||
    input.pause ||
    (input.mouseClicked && overButton(lay.door, input))
  ) {
    state.phase = "playing";
    player.moving = false;
    sfx("select");
  }
}

export function updatePauseMenu(state: GameState): void {
  const input = state.input;

  // Паузаас нээгдсэн тохиргоо / удирдлага
  if (state.menuScreen === "settings") {
    updateSettingsMenu(state);
    return;
  }
  if (state.menuScreen === "controls") {
    if (input.confirm || input.pause || input.mouseClicked) {
      state.menuScreen = "main";
      state.pauseIndex = 2;
      sfx("select");
    }
    return;
  }

  const btns = pauseMenuButtons();

  if (input.menuUp) {
    state.pauseIndex = (state.pauseIndex + btns.length - 1) % btns.length;
    sfx("move");
  }
  if (input.menuDown) {
    state.pauseIndex = (state.pauseIndex + 1) % btns.length;
    sfx("move");
  }
  if (input.mouseMoved) {
    btns.forEach((b, i) => {
      if (overButton(b, input)) state.pauseIndex = i;
    });
  }

  let activate = -1;
  if (input.confirm) activate = state.pauseIndex;
  if (input.mouseClicked) {
    const i = btns.findIndex((b) => overButton(b, input));
    if (i >= 0) activate = i;
  }
  if (input.pause) activate = 0;

  if (activate === 0) {
    state.phase = state.pauseReturnPhase === "spirit" ? "spirit" : "playing";
    state.menuScreen = "main";
    sfx("select");
  } else if (activate === 1) {
    state.menuScreen = "settings";
    state.menuIndex = 0;
    sfx("select");
  } else if (activate === 2) {
    state.menuScreen = "controls";
    state.menuIndex = 0;
    sfx("select");
  } else if (activate === 3) {
    state.requestRestart = true;
    state.menuScreen = "main";
    sfx("select");
  }
}

/** Ур чадварын картуудын байрлал */
export function skillCardLayout(count: number): UiButton[] {
  const cardW = 240;
  const cardH = 130;
  const gap = 24;
  const x0 = (VIEW_W - (cardW * count + gap * (count - 1))) / 2;
  const y0 = 195;
  return Array.from({ length: count }, (_, i) => ({
    x: x0 + i * (cardW + gap),
    y: y0,
    w: cardW,
    h: cardH,
    label: "",
  }));
}

/** Түвшин ахих — ← → / Enter эсвэл хулганаар ур чадвар сонгоно */
export function updateLevelUp(state: GameState): void {
  const n = state.skillChoices.length;
  if (n <= 0) return;
  const input = state.input;
  const cards = skillCardLayout(n);

  if (input.menuLeft) {
    state.menuIndex = (state.menuIndex + n - 1) % n;
    sfx("move");
  }
  if (input.menuRight) {
    state.menuIndex = (state.menuIndex + 1) % n;
    sfx("move");
  }
  if (input.mouseMoved) {
    cards.forEach((c, i) => {
      if (overButton(c, input)) state.menuIndex = i;
    });
  }

  let pick = -1;
  if (input.confirm) pick = state.menuIndex;
  if (input.mouseClicked) {
    const i = cards.findIndex((c) => overButton(c, input));
    if (i >= 0) pick = i;
  }

  if (pick >= 0 && state.skillChoices[pick]) {
    const skill = state.skillChoices[pick];
    skill.apply(state);
    state.skillChoices = [];
    state.phase = "playing";
    setMessage(state, `Ур чадвар: ${skill.name}!`, 3);
    sfx("select");
    maybeLevelUp(state);
  }
}

export function drawBarFancy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  color: string,
  label: string,
): void {
  drawRpgBar(ctx, x, y, w, h, ratio, color, label);
}

/** Pixel RPG хэлбэрийн тэгш өнцөгт бар (HP/MP маягтай) */
export function drawRpgBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  color: string,
  label: string,
): void {
  const r = clamp(ratio, 0, 1);
  // Гадна хүрээ
  ctx.fillStyle = "#1a1520";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = "#3a2e48";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  // Хоосон суурь
  ctx.fillStyle = shade(color, -70);
  ctx.fillRect(x, y, w, h);
  // Дүүргэлт
  const fillW = Math.floor(w * r);
  if (fillW > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fillW, h);
    ctx.fillStyle = "rgba(300,300,300,0.28)";
    ctx.fillRect(x, y, fillW, Math.max(2, Math.floor(h * 0.35)));
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(x, y + h - 2, fillW, 2);
  }
  // Текст
  ctx.textAlign = "center";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = 3;
  ctx.strokeText(label, x + w / 2, y + h - 3);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, x + w / 2, y + h - 3);
  ctx.textAlign = "left";
}

function drawHudPortrait(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.save();

  // Dark outer rim and warm metal inner rim, matching the reference HUD.
  ctx.fillStyle = "#342521";
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8e5b35";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#b7763f";
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e0a15b";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#30435b";
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Reuse the actual player renderer so the HUD portrait follows their gear.
  ctx.translate(cx, cy + 34);
  ctx.scale(2.45, 2.45);
  drawPlayer(
    ctx,
    state.player,
    { x: state.player.pos.x, y: state.player.pos.y },
    performance.now() / 1000,
    false,
  );
  ctx.restore();
}

function drawHudMeter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  color: string,
): void {
  const cut = Math.min(8, height / 2);
  const meterPath = (meterWidth: number): void => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + meterWidth - cut, y);
    ctx.lineTo(x + meterWidth, y + height / 2);
    ctx.lineTo(x + meterWidth - cut, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  };

  meterPath(width + 8);
  ctx.fillStyle = "#35231d";
  ctx.fill();
  ctx.strokeStyle = "#8d5a35";
  ctx.lineWidth = 3;
  ctx.stroke();

  meterPath(width);
  ctx.fillStyle = "#25191b";
  ctx.fill();

  const fillWidth = Math.max(0, width * clamp(ratio, 0, 1));
  if (fillWidth > 1) {
    ctx.save();
    meterPath(width);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fillWidth, height);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x, y + 1, fillWidth, Math.max(2, height * 0.28));
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, y + height - 3, fillWidth, 3);
    ctx.restore();
  }
}

function drawSeasonTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  season: Season,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";

  // Pixel-art trunk and branches; the clock is drawn over their center.
  ctx.strokeStyle = "#2a1a16";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, 48);
  ctx.lineTo(-1, 5);
  ctx.lineTo(-20, -13);
  ctx.moveTo(-2, 13);
  ctx.lineTo(19, -9);
  ctx.moveTo(-10, -3);
  ctx.lineTo(-9, -28);
  ctx.moveTo(10, 1);
  ctx.lineTo(28, -25);
  ctx.stroke();
  ctx.strokeStyle = "#684126";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#3a241b";
  ctx.fillRect(-8, 43, 15, 6);

  const leafBlocks: Array<[number, number, number]> = [
    [-29, -23, 11],
    [-17, -35, 13],
    [-2, -29, 12],
    [14, -24, 14],
    [27, -34, 11],
    [35, -18, 10],
    [-36, -8, 10],
    [23, -7, 12],
  ];

  if (season === "summer" || season === "autumn") {
    const palette =
      season === "summer"
        ? ["#244f2b", "#39713a", "#5a8f43"]
        : ["#8d4f20", "#c47a24", "#e0a83a"];
    for (let i = 0; i < leafBlocks.length; i++) {
      const [lx, ly, size] = leafBlocks[i];
      ctx.fillStyle = "#231813";
      ctx.fillRect(lx - 2, ly - 2, size + 4, size + 4);
      ctx.fillStyle = palette[i % palette.length];
      ctx.fillRect(lx, ly, size, size);
      ctx.fillStyle = palette[(i + 1) % palette.length];
      ctx.fillRect(lx + 2, ly + 2, Math.max(3, size - 5), 3);
    }
  } else if (season === "winter") {
    // Snow rests on the otherwise bare branches.
    const snowCaps: Array<[number, number, number]> = [
      [-31, -27, 19],
      [-14, -39, 20],
      [8, -32, 22],
      [25, -39, 18],
      [23, -12, 20],
    ];
    for (const [sx, sy, width] of snowCaps) {
      ctx.fillStyle = "#9eb8c7";
      ctx.fillRect(sx, sy + 3, width, 5);
      ctx.fillStyle = "#edf6f7";
      ctx.fillRect(sx, sy, width, 5);
      ctx.fillRect(sx + 3, sy - 2, Math.max(4, width - 7), 3);
    }
  }

  ctx.restore();
}

function drawRoundClock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  timeOfDay: number,
  dayNumber: number,
): void {
  const hours = ((timeOfDay % 24) + 24) % 24;
  const handAngle = (hours / 24) * Math.PI * 2 - Math.PI / 2;
  const segments = [
    "#28364c",
    "#34445a",
    "#d7a943",
    "#f1cd55",
    "#e9b94b",
    "#ad685e",
    "#8d4f55",
    "#513c4e",
  ];

  ctx.save();
  ctx.translate(cx, cy);

  // Pixel-art shadow and scalloped cream outer frame.
  ctx.fillStyle = "rgba(16,12,10,0.55)";
  ctx.beginPath();
  ctx.arc(3, 4, radius + 10, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    ctx.fillStyle = i % 2 === 0 ? "#f1d889" : "#d9b963";
    ctx.beginPath();
    ctx.arc(
      Math.round(Math.cos(angle) * (radius + 5)),
      Math.round(Math.sin(angle) * (radius + 5)),
      7,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.strokeStyle = "#fff0b0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#3a271d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 1, 0, Math.PI * 2);
  ctx.stroke();

  // Eight flat-color day/night slices.
  for (let i = 0; i < segments.length; i++) {
    const start = (i / segments.length) * Math.PI * 2 - Math.PI / 2;
    const end = ((i + 1) / segments.length) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = segments[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 4, start, end);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "#5a3927";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 3, 0, Math.PI * 2);
  ctx.stroke();

  // Single chunky pointer, like the reference clock.
  ctx.save();
  ctx.rotate(handAngle);
  ctx.fillStyle = "#161414";
  ctx.beginPath();
  ctx.moveTo(-3, 5);
  ctx.lineTo(0, -radius + 5);
  ctx.lineTo(4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Dark center badge keeps the day label readable over every slice.
  ctx.fillStyle = "rgba(31,22,20,0.78)";
  ctx.beginPath();
  ctx.arc(0, 3, radius * 0.49, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d7b36b";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff2cc";
  ctx.strokeStyle = "#241813";
  ctx.lineWidth = 3;
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const dayLabel = `Өдөр ${dayNumber}`;
  ctx.strokeText(dayLabel, 0, 4);
  ctx.fillText(dayLabel, 0, 4);
  ctx.restore();
}

function drawStatusIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  bg: string,
  draw: () => void,
): void {
  ctx.fillStyle = "#1a1520";
  ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  draw();
  ctx.restore();
}

function drawWoodFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  thickness = 6,
): void {
  ctx.fillStyle = "#5a3a22";
  ctx.fillRect(
    x - thickness,
    y - thickness,
    w + thickness * 2,
    h + thickness * 2,
  );
  ctx.fillStyle = "#8a5a32";
  ctx.fillRect(
    x - thickness + 2,
    y - thickness + 2,
    w + thickness * 2 - 4,
    h + thickness * 2 - 4,
  );
  ctx.fillStyle = "#3a2414";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  // Булангийн багана
  const peg = 5;
  const pegs = [
    [x - thickness - 1, y - thickness - 1],
    [x + w + thickness - peg + 1, y - thickness - 1],
    [x - thickness - 1, y + h + thickness - peg + 1],
    [x + w + thickness - peg + 1, y + h + thickness - peg + 1],
  ];
  for (const [px, py] of pegs) {
    ctx.fillStyle = "#6e4428";
    ctx.fillRect(px, py, peg, peg);
    ctx.fillStyle = "#c49a6c";
    ctx.fillRect(px + 1, py + 1, peg - 2, peg - 2);
  }
}

function drawHotSlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  key: string,
  icon: string,
  active = false,
): void {
  ctx.fillStyle = active ? "#6a4a28" : "#4a3020";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = active ? "#3a2818" : "#2a1c12";
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
  ctx.strokeStyle = active ? "#e8c56a" : "#8a6a42";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
  ctx.font = `${Math.floor(size * 0.45)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.fillText(icon, x + size / 2, y + size * 0.62);
  ctx.font = "bold 9px 'Courier New', monospace";
  ctx.fillStyle = "#e8c56a";
  ctx.fillText(key, x + size / 2, y + size - 3);
  ctx.textAlign = "left";
}

/** Hex өнгийг гэрэлтүүлэх/бараанруулах */
export function shade(hex: string, amt: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return hex;
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

export function drawWeatherIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  weather: WeatherKind,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = COLORS.hudAccent;
  ctx.fillStyle = COLORS.hudAccent;
  ctx.lineWidth = 1.5;

  if (weather === "clear") {
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5);
      ctx.stroke();
    }
  } else if (weather === "wind") {
    for (const oy of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.moveTo(-8, oy);
      ctx.quadraticCurveTo(0, oy - 3, 8, oy);
      ctx.stroke();
    }
  } else if (weather === "storm") {
    ctx.beginPath();
    ctx.arc(-3, -2, 4, 0, Math.PI * 2);
    ctx.arc(3, -2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(-6, 9);
    ctx.moveTo(1, 4);
    ctx.lineTo(-1, 9);
    ctx.moveTo(6, 4);
    ctx.lineTo(4, 9);
    ctx.stroke();
  } else {
    // snow
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -7, Math.sin(a) * -7);
      ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  const mw = 128;
  const mh = 128;
  const mx = 44;
  const my = VIEW_H - mh - 28;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;

  drawWoodFrame(ctx, mx, my, mw, mh, 7);

  // ===== Биом газрын зураг — маш зөөлөн уусгалттай =====
  const winter = state.world.season === "winter";
  const steppe = winter ? "#a8b8a0" : "#5a8a42";
  const forest = winter ? "#6a8a72" : "#2f5a32";
  const desert = winter ? "#c4b89a" : "#c9a86a";
  const riverDeep = winter ? "#6a8aa0" : "#2f6a88";
  const riverLite = winter ? "rgba(170,205,225,0.4)" : "rgba(130,195,215,0.38)";

  // Төв тал суурь
  ctx.fillStyle = steppe;
  ctx.fillRect(mx, my, mw, mh);

  // Хойд ой — өргөн зөөлөн уусгалт
  {
    const fh = FOREST_Y * sy;
    const fade = Math.max(28, mh * 0.22);
    const g = ctx.createLinearGradient(mx, my, mx, my + fh + fade);
    g.addColorStop(0, forest);
    g.addColorStop(0.35, forest);
    g.addColorStop(
      0.65,
      winter ? "rgba(106,138,114,0.4)" : "rgba(47,90,50,0.38)",
    );
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(mx, my, mw, fh + fade);
    for (let i = 0; i < 26; i++) {
      const fx = mx + ((i * 37 + 11) % mw);
      const fy = my + ((i * 19 + 7) % Math.max(4, fh + fade * 0.35));
      const edge = clamp(1 - (fy - my) / (fh + fade * 0.5), 0, 1);
      const a = (0.08 + (i % 4) * 0.035) * edge;
      if (a < 0.02) continue;
      ctx.fillStyle = winter ? `rgba(70,100,80,${a})` : `rgba(22,58,30,${a})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.6 + (i % 3) * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Өмнөд элс — өргөн зөөлөн уусгалт
  {
    const desertTop = my + DESERT_Y * sy;
    const fade = Math.max(28, mh * 0.22);
    const g = ctx.createLinearGradient(mx, desertTop - fade, mx, my + mh);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(
      0.4,
      winter ? "rgba(196,184,154,0.35)" : "rgba(201,168,106,0.32)",
    );
    g.addColorStop(0.7, desert);
    g.addColorStop(1, desert);
    ctx.fillStyle = g;
    ctx.fillRect(mx, desertTop - fade, mw, my + mh - (desertTop - fade));
    for (let i = 0; i < 16; i++) {
      const dx = mx + 6 + ((i * 29) % (mw - 12));
      const dy =
        desertTop -
        fade * 0.25 +
        ((i * 17) % Math.max(6, my + mh - desertTop + fade * 0.25));
      const edge = clamp((dy - (desertTop - fade)) / fade, 0, 1);
      const a = 0.12 * edge;
      if (a < 0.02) continue;
      ctx.fillStyle = winter
        ? `rgba(175,160,125,${a})`
        : `rgba(175,135,65,${a})`;
      ctx.beginPath();
      ctx.ellipse(dx, dy, 5.5 + (i % 3), 2.2, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Зүүн гол — зөөлөн өргөн урсгал
  {
    const riverSteps = 32;
    // Маш өргөн бүдэг эрэг
    ctx.strokeStyle = winter
      ? "rgba(120,155,175,0.22)"
      : "rgba(80,145,170,0.22)";
    ctx.lineWidth = Math.max(8, RIVER_HALF_W * sx * 5);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i <= riverSteps; i++) {
      const wy = (i / riverSteps) * WORLD_H;
      const px = mx + riverCenterX(wy) * sx;
      const py = my + wy * sy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Дунд давхарга
    ctx.strokeStyle = winter
      ? "rgba(110,145,165,0.4)"
      : "rgba(55,120,150,0.42)";
    ctx.lineWidth = Math.max(4.5, RIVER_HALF_W * sx * 3);
    ctx.beginPath();
    for (let i = 0; i <= riverSteps; i++) {
      const wy = (i / riverSteps) * WORLD_H;
      const px = mx + riverCenterX(wy) * sx;
      const py = my + wy * sy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Гүн гол
    ctx.strokeStyle = riverDeep;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = Math.max(2.4, RIVER_HALF_W * sx * 1.7);
    ctx.beginPath();
    for (let i = 0; i <= riverSteps; i++) {
      const wy = (i / riverSteps) * WORLD_H;
      const px = mx + riverCenterX(wy) * sx;
      const py = my + wy * sy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Гэрэлт гол
    ctx.strokeStyle = riverLite;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(1, RIVER_HALF_W * sx * 0.55);
    ctx.beginPath();
    for (let i = 0; i <= riverSteps; i++) {
      const wy = (i / riverSteps) * WORLD_H;
      const px = mx + riverCenterX(wy) * sx;
      const py = my + wy * sy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Бэлчээр — өргөн ууссан
  const center = pastureCenter(state.world);
  {
    const rx = PASTURE_RADIUS * sx;
    const ry = PASTURE_RADIUS * sy * 0.85;
    const cx = mx + center.x * sx;
    const cy = my + center.y * sy;
    const pg = ctx.createRadialGradient(cx, cy, rx * 0.15, cx, cy, rx * 1.15);
    if (winter) {
      pg.addColorStop(0, "rgba(210,218,220,0.42)");
      pg.addColorStop(0.45, "rgba(200,210,215,0.22)");
      pg.addColorStop(0.78, "rgba(200,210,215,0.08)");
      pg.addColorStop(1, "rgba(200,210,215,0)");
    } else {
      pg.addColorStop(0, "rgba(110,160,65,0.42)");
      pg.addColorStop(0.45, "rgba(100,150,60,0.2)");
      pg.addColorStop(0.78, "rgba(100,150,60,0.07)");
      pg.addColorStop(1, "rgba(100,150,60,0)");
    }
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Гэр — бүдэг цэнхэр
  if (!state.world.gerPacked) {
    ctx.fillStyle = "#6a98b0";
    ctx.fillRect(mx + center.x * sx - 3, my + center.y * sy - 3, 6, 6);
  }

  // Мал — цагаан
  ctx.fillStyle = "#ffffff";
  for (const s of state.world.flock.visuals) {
    ctx.fillRect(mx + s.pos.x * sx - 1, my + s.pos.y * sy - 1, 2, 2);
  }
  // Зэрлэг морь
  ctx.fillStyle = "#e8c56a";
  for (const h of state.world.wildHorses) {
    ctx.fillRect(mx + h.pos.x * sx - 1.5, my + h.pos.y * sy - 1.5, 3, 3);
  }
  // Унах морь (буусан / уясан)
  if (state.world.mountHorse && !state.player.riding) {
    const mh = state.world.mountHorse;
    ctx.fillStyle = mh.tied ? "#8ab4d8" : "#c8a060";
    ctx.fillRect(mx + mh.pos.x * sx - 2, my + mh.pos.y * sy - 2, 4, 4);
  }
  // Чоно
  ctx.fillStyle = "#ff3030";
  for (const w of state.world.wolves) {
    ctx.fillRect(mx + w.pos.x * sx - 2, my + w.pos.y * sy - 2, 4, 4);
  }
  // Хулгайч
  ctx.fillStyle = "#c080ff";
  for (const t of state.world.thieves) {
    ctx.fillRect(mx + t.pos.x * sx - 2, my + t.pos.y * sy - 2, 4, 4);
  }
  // Эхний замын дайснууд — зөвхөн шулмасын сүнсэнд
  if (inShulmasSpirit(state)) {
    ctx.fillStyle = "#ff9b55";
    for (const enemy of state.world.firstRoute.enemies) {
      if (!enemy.alive || !enemy.engaged) continue;
      const size = enemy.kind === "shulmasynBaatar" ? 5 : 3;
      ctx.fillRect(
        mx + enemy.pos.x * sx - size / 2,
        my + enemy.pos.y * sy - size / 2,
        size,
        size,
      );
    }
  }
  // Тоглогч — тод хөх
  ctx.fillStyle = "#1a6eff";
  ctx.fillRect(
    mx + state.player.pos.x * sx - 2.5,
    my + state.player.pos.y * sy - 2.5,
    5,
    5,
  );
  ctx.strokeStyle = "#c8e0ff";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mx + state.player.pos.x * sx - 2.5,
    my + state.player.pos.y * sy - 2.5,
    5,
    5,
  );

  // Камерын харах хүрээ
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + cam.x * sx, my + cam.y * sy, VIEW_W * sx, VIEW_H * sy);

  // N S E W
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff5050";
  ctx.fillText("N", mx + mw / 2, my - 10);
  ctx.fillStyle = "#e8a040";
  ctx.fillText("S", mx + mw / 2, my + mh + 16);
  ctx.fillText("W", mx - 12, my + mh / 2 + 4);
  ctx.fillText("E", mx + mw + 12, my + mh / 2 + 4);
  ctx.textAlign = "left";
}

export function drawThreatArrows(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  const threats: Array<{ pos: Vector2; color: string }> = [];
  for (const w of state.world.wolves)
    threats.push({ pos: w.pos, color: "#ff5050" });
  for (const t of state.world.thieves)
    threats.push({ pos: t.pos, color: "#c080ff" });
  for (const enemy of state.world.firstRoute.enemies) {
    if (!inShulmasSpirit(state)) break;
    if (!enemy.alive || !enemy.engaged) continue;
    threats.push({
      pos: enemy.pos,
      color: enemy.kind === "shulmasynBaatar" ? "#d993ff" : "#ff9b55",
    });
  }

  for (const th of threats) {
    const sx = th.pos.x - cam.x;
    const sy = th.pos.y - cam.y;
    if (sx > -10 && sx < VIEW_W + 10 && sy > -10 && sy < VIEW_H + 10) continue;

    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;
    const dx = sx - cx;
    const dy = sy - cy;
    const ang = Math.atan2(dy, dx);
    // Ирмэг дээрх байрлал
    const margin = 26;
    const tx = clamp(cx + Math.cos(ang) * 1000, margin, VIEW_W - margin);
    const ty = clamp(cy + Math.sin(ang) * 1000, margin, VIEW_H - margin);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(ang);
    ctx.fillStyle = th.color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

export function drawUiButton(
  ctx: CanvasRenderingContext2D,
  b: UiButton,
  selected: boolean,
): void {
  ctx.fillStyle = selected ? "rgba(232,197,106,0.18)" : "rgba(12,10,8,0.72)";
  roundRectPath(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.strokeStyle = selected ? "#e8c56a" : "rgba(232,197,106,0.28)";
  ctx.lineWidth = selected ? 2 : 1;
  roundRectPath(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.stroke();

  ctx.fillStyle = selected ? "#e8c56a" : COLORS.hudText;
  ctx.font = "600 17px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6);
  ctx.textAlign = "left";
}

export function drawMenuTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
): void {
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.fillText(title, VIEW_W / 2, 150);
  ctx.textAlign = "left";
}

export function drawBackHint(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText("P / Enter — буцах", VIEW_W / 2, y);
  ctx.textAlign = "left";
}

export function drawMenuMain(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  t: number,
): void {
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText("АМЬД ҮЛД", VIEW_W / 2, 106);
  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 58px system-ui, sans-serif";
  ctx.fillText("МАЛЧИН", VIEW_W / 2, 166);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillText("Талын малчны амьдрал", VIEW_W / 2, 200);
  ctx.textAlign = "left";

  const btns = mainMenuButtons();
  btns.forEach((b, i) => drawUiButton(ctx, b, i === state.menuIndex));

  ctx.textAlign = "center";
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText("", VIEW_W / 2, 516);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

export function drawMenuSettings(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  drawMenuTitle(ctx, "ТОХИРГОО");

  const lay = settingsLayout();
  const vols = [audio.musicVol, audio.sfxVol];

  lay.rows.forEach((row, i) => {
    const sel = state.menuIndex === i;
    const cy = row.bar.y + row.bar.h / 2;

    ctx.textAlign = "right";
    ctx.fillStyle = sel ? "#e8c56a" : COLORS.hudText;
    ctx.font = sel
      ? "600 15px system-ui, sans-serif"
      : "15px system-ui, sans-serif";
    ctx.fillText(row.label, row.bar.x - 22, cy + 5);
    ctx.textAlign = "left";

    // Дууны түвшний зурвас
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRectPath(ctx, row.bar.x, row.bar.y, row.bar.w, row.bar.h, 9);
    ctx.fill();
    if (vols[i] > 0.01) {
      ctx.fillStyle = sel ? "#e8c56a" : "#a08850";
      roundRectPath(
        ctx,
        row.bar.x,
        row.bar.y,
        row.bar.w * vols[i],
        row.bar.h,
        9,
      );
      ctx.fill();
    }
    ctx.strokeStyle = sel ? "#e8c56a" : "rgba(232,197,106,0.3)";
    ctx.lineWidth = sel ? 2 : 1;
    roundRectPath(ctx, row.bar.x, row.bar.y, row.bar.w, row.bar.h, 9);
    ctx.stroke();

    ctx.fillStyle = COLORS.hudText;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(
      `${Math.round(vols[i] * 100)}%`,
      row.bar.x + row.bar.w + 16,
      cy + 5,
    );
  });

  drawUiButton(ctx, lay.back, state.menuIndex === 2);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(
    "← → — түвшин өөрчлөх · зурвас дээр хулганаар дарж болно",
    VIEW_W / 2,
    460,
  );
  ctx.textAlign = "left";
}

export function drawMenuControls(ctx: CanvasRenderingContext2D): void {
  drawMenuTitle(ctx, "УДИРДЛАГА");

  const u1 = FENCE_UPGRADE_COST[1];
  const u2 = FENCE_UPGRADE_COST[2];
  const lines: Array<[string, string]> = [
    ["WASD", "Алхах"],
    ["J", "Цохих (тамир зарцуулна)"],
    ["K", "Буудах / Харвах"],
    ["Shift", "Бултах — invuln цонх"],
    ["L", "Сөрөх (parry) — дайралт няцаах"],
    ["1 / 2", "Нударга / Хөх тэнгэрийн сэлэм"],
    ["E", "Мод / жимс / өвс / тэвш / мал гаргах·оруулах"],
    ["Q", "Жимс / ааруул идэх"],
    ["F", "Хүссэн газартаа гал түлэх (түлээ)"],
    ["B", "Хашаа барих / шинэчлэх"],
    ["N", "Мал туух"],
    ["G", "Гэр моринд ачих / буулгах"],
    ["H", "Морь унах / буух (гэрийн дэргэд уяна)"],
    ["P", "Түр зогсоох"],
  ];
  const boxW = 520;
  const boxH = lines.length * 22 + 26;
  const bx = (VIEW_W - boxW) / 2;
  const by = 180;
  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, bx, by, boxW, boxH, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.25)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, bx, by, boxW, boxH, 10);
  ctx.stroke();

  lines.forEach(([key, desc], i) => {
    const ly = by + 28 + i * 22;
    if (key) {
      ctx.textAlign = "right";
      ctx.fillStyle = COLORS.hudAccent;
      ctx.font = "600 13px system-ui, sans-serif";
      ctx.fillText(key, bx + 140, ly);
    }
    ctx.textAlign = "left";
    ctx.fillStyle = key ? COLORS.hudText : COLORS.hudMuted;
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(desc, bx + 158, ly);
  });

  drawBackHint(ctx, by + boxH + 36);
}

export function drawMenuCredits(ctx: CanvasRenderingContext2D): void {
  drawMenuTitle(ctx, "БАГИЙНХАН");

  const lines: Array<[string, string]> = [
    ["Тоглоомын цөм (Core Mechanics)", "Цолмон"],
    ["Амьд үлдэх систем (Survival Mechanics)", "Мянганнаст"],
    ["Дайсан ба AI", "Билгүүнтөгс"],
    ["Тулааны систем (Combat Mechanics)", "Баярцогт"],
    ["График дизайн ба Визуал стиль", "Номин"],
    ["UI/UX ба дуу", "Тэмүүлэн"],
  ];

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillText("Pinecone 4A", VIEW_W / 2, 192);
  ctx.textAlign = "left";

  lines.forEach(([role, name], i) => {
    const ly = 236 + i * 30;
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.hudAccent;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(role, VIEW_W / 2 - 14, ly);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(name, VIEW_W / 2 + 14, ly);
  });

  drawBackHint(ctx, 420);
}

/** Меню — үндсэн, тохиргоо, удирдлага, багийнхан дэлгэцүүд */
export function drawMenu(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const t = performance.now() / 1000;

  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "rgba(10,8,6,0.85)");
  g.addColorStop(1, "rgba(10,8,6,0.62)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (state.menuScreen === "main") drawMenuMain(ctx, state, t);
  else if (state.menuScreen === "settings") drawMenuSettings(ctx, state);
  else if (state.menuScreen === "controls") drawMenuControls(ctx);
  else drawMenuCredits(ctx);
}

export function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { player, world } = state;
  const pad = 14;

  // Эхлэх меню — HUD-ын оронд зөвхөн меню харуулна
  if (state.phase === "menu") {
    drawMenu(ctx, state);
    return;
  }

  // —— Зүүн дээд: character portrait + HP/stamina/hunger ——
  const portraitX = pad + 34;
  const portraitY = pad + 38;
  const portraitRadius = 29;
  const barX = portraitX + portraitRadius - 2;
  const barW = 166;
  const barH = 13;
  const barGap = 18;
  drawHudMeter(
    ctx,
    barX,
    pad + 19,
    barW,
    barH,
    player.vitals.health / player.vitals.maxHealth,
    "#c83b32",
  );
  drawHudMeter(
    ctx,
    barX,
    pad + 19 + barGap,
    barW - 26,
    barH,
    player.stamina / Math.max(1, player.maxStamina),
    "#3299d0",
  );
  drawHudMeter(
    ctx,
    barX,
    pad + 19 + barGap * 2,
    barW - 48,
    barH,
    player.vitals.hunger / player.vitals.maxHunger,
    "#d7a629",
  );
  drawHudPortrait(ctx, state, portraitX, portraitY, portraitRadius);

  // Статус дүрсүүд (buff мөр) — эможи
  const iconY = pad + 90;
  const iconS = 18;
  let ix = barX;
  ctx.textAlign = "left";

  if (player.gear.horse) {
    ctx.font = `${iconS - 2}px system-ui, sans-serif`;
    ctx.fillText(player.riding ? "🏇" : "🐎", ix, iconY + iconS - 2);
    ix += iconS + 6;
  }
  if (player.gear.dog) {
    ctx.font = `${iconS - 2}px system-ui, sans-serif`;
    ctx.fillText("🐕", ix, iconY + iconS - 2);
    ix += iconS + 6;
  }
  if (player.weapon === "skySword") {
    ctx.font = `${iconS - 2}px system-ui, sans-serif`;
    ctx.fillText("⚔️", ix, iconY + iconS - 2);
  }

  // —— Баруун дээд: Монгол гэрийн тооно хэлбэртэй цаг ——
  const clockX = VIEW_W - pad - 47;
  const clockY = pad + 47;
  drawSeasonTree(ctx, clockX - 12, clockY + 24, world.season);
  drawRoundClock(ctx, clockX, clockY, 38, world.timeOfDay, world.dayNumber);

  const route = world.firstRoute;
  const routeText = world.tumurShulmas.defeated
    ? "Төмөр шулмас дарагдав"
    : world.tumurShulmas.active
      ? `Төмөр шулмас · Үе ${world.tumurShulmas.bossPhase}`
      : route.bossDefeated
        ? route.swordDrop.collected
          ? "Хар төмөр хаалга нээгдсэн"
          : "Mini-boss унав · Сэлмээ ав"
        : route.bossStarted
          ? "Mini-boss · Шулмасын баатар"
          : route.complete
            ? "Хараалт хаалга нээгдсэн"
            : `Эхний зам ${route.defeated}/${route.total}`;
  ctx.font = "bold 11px 'Courier New', monospace";
  const routeWidth = Math.ceil(ctx.measureText(routeText).width) + 16;
  const routeX = VIEW_W - routeWidth - pad;
  const routeY = pad + 72;
  ctx.fillStyle = "rgba(28,18,13,0.88)";
  ctx.fillRect(routeX, routeY, routeWidth, 22);
  ctx.strokeStyle = route.complete
    ? "rgba(232,197,106,0.7)"
    : "rgba(255,155,85,0.55)";
  ctx.strokeRect(routeX + 0.5, routeY + 0.5, routeWidth - 1, 21);
  ctx.fillStyle = route.complete ? "#ffe08a" : "#ffb078";
  ctx.fillText(routeText, routeX + 8, routeY + 15);

  // —— Доод төв: EXP + hotbar ——
  const expW = 280;
  const expX = (VIEW_W - expW) / 2;
  const expY = VIEW_H - 78;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `EXP ${Math.floor(state.xp)} / ${state.xpNext}`,
    VIEW_W / 2,
    expY - 4,
  );
  ctx.textAlign = "left";
  drawRpgBar(
    ctx,
    expX,
    expY,
    expW,
    10,
    clamp(state.xp / state.xpNext, 0, 1),
    "#e8c040",
    "",
  );

  const slots: Array<{ key: string; icon: string; active: boolean }> = [
    { key: "J", icon: "👊", active: player.meleePhase !== "idle" },
    {
      key: "K",
      icon: player.gear.gun ? "🔫" : player.gear.bow ? "🏹" : "—",
      active: !!state.input.shoot,
    },
    { key: "⇧", icon: "💨", active: player.dodgePhase !== "idle" },
    { key: "L", icon: "🛡", active: player.parryPhase !== "idle" },
    { key: "E", icon: "🖐", active: false },
    { key: "Q", icon: "🍒", active: false },
    { key: "F", icon: "🔥", active: world.campfire.lit || world.campfire.igniting > 0 },
    { key: "B", icon: "🪵", active: state.fencePreview },
  ];
  const slotSize = 34;
  const slotGap = 4;
  const hotW = slots.length * (slotSize + slotGap) - slotGap + 10;
  const hotX = (VIEW_W - hotW) / 2;
  const hotY = VIEW_H - 58;
  drawWoodFrame(ctx, hotX, hotY, hotW, slotSize + 8, 4);
  ctx.fillStyle = "#2a1c12";
  ctx.fillRect(hotX, hotY, hotW, slotSize + 8);
  slots.forEach((s, i) => {
    drawHotSlot(
      ctx,
      hotX + 5 + i * (slotSize + slotGap),
      hotY + 4,
      slotSize,
      s.key,
      s.icon,
      s.active,
    );
  });

  // —— Баруун доод: нөөц ——
  const qSize = 36;
  const qY = VIEW_H - qSize - 20;
  const qItems: Array<{ icon: string; val: string }> = [
    {
      icon: "🪵",
      val: state.unlimitedWood ? "∞" : String(player.inventory.wood),
    },
    { icon: "🍒", val: String(player.inventory.berries) },
    { icon: "🌾", val: String(player.inventory.hay) },
  ];
  const qW = qItems.length * (qSize + 4) - 4 + 8;
  const qX = VIEW_W - qW - 16;
  drawWoodFrame(ctx, qX, qY, qW, qSize + 8, 4);
  ctx.fillStyle = "#2a1c12";
  ctx.fillRect(qX, qY, qW, qSize + 8);
  qItems.forEach((it, i) => {
    const sx = qX + 4 + i * (qSize + 4);
    drawHotSlot(ctx, sx, qY + 4, qSize, it.val, it.icon, false);
  });

  // Малын төрөл — эможи + тоо (нэг мөр дээш)
  ctx.font = "13px system-ui, sans-serif";
  let lx = barX;
  const hasBuff =
    player.gear.horse || player.gear.dog || player.weapon === "skySword";
  const ly = hasBuff ? iconY + iconS + 2 : iconY + 12;
  for (const k of LIVESTOCK_KINDS) {
    const n = world.flock.counts[k];
    if (n <= 0) continue;
    const emoji = LIVESTOCK_EMOJI[k];
    ctx.fillText(emoji, lx, ly);
    lx += 16;
    ctx.fillStyle = "#c8e0a8";
    ctx.font = "bold 10px 'Courier New', monospace";
    const num = String(n);
    ctx.fillText(num, lx, ly);
    lx += ctx.measureText(num).width + 10;
    ctx.font = "13px system-ui, sans-serif";
  }

  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillText(`Өдөр ${world.dayNumber} · ${state.score}`, barX, ly + 14);

  ctx.fillStyle = "#d8c898";
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillText(
    `Ноос${player.inventory.wool} Ноол${player.inventory.cashmere} Сүү${player.inventory.milk}`,
    barX,
    ly + 28,
  );
  ctx.fillStyle = "#a8c8e8";
  ctx.fillText(`Тэвш ${Math.floor(world.feeder.hay)}`, barX, ly + 42);

  const nearFence = nearestFence(player.pos, world.fences, 64);
  if (nearFence) {
    const tier = nearFence.tier;
    const hpPct = Math.max(
      0,
      Math.ceil((nearFence.hp / nearFence.maxHp) * 100),
    );
    ctx.fillStyle = tier === 3 ? "#7ec8ff" : tier === 2 ? "#c0c0c0" : "#c49a6c";
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.fillText(
      `${nearFence.isGate ? "Хаалга " : ""}${FENCE_TIER_SHORT[tier]} ${hpPct}%`,
      barX,
      ly + 70,
    );
  }

  if (world.wolves.length > 0 || world.thieves.length > 0) {
    const parts: string[] = [];
    if (world.wolves.length) parts.push(`Чоно ${world.wolves.length}`);
    if (world.thieves.length) {
      const stolen = world.thieves.reduce((s, t) => s + t.stolen, 0);
      parts.push(`Хулгайч (−${stolen})`);
    }
    const text = parts.join("  ·  ");
    ctx.font = "bold 13px 'Courier New', monospace";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(120,20,20,0.85)";
    ctx.fillRect(VIEW_W / 2 - tw / 2 - 12, pad, tw + 24, 26);
    ctx.strokeStyle = "#ff8080";
    ctx.strokeRect(VIEW_W / 2 - tw / 2 - 12.5, pad + 0.5, tw + 23, 25);
    ctx.fillStyle = "#ffc0c0";
    ctx.fillText(text, VIEW_W / 2 - tw / 2, pad + 18);
  }

  if (
    state.messageTimer > 0 &&
    state.message &&
    (state.phase === "playing" || state.phase === "spirit")
  ) {
    const alpha = clamp(state.messageTimer / 0.4, 0, 1);
    ctx.font = "13px 'Courier New', monospace";
    const tw = ctx.measureText(state.message).width;
    const mx = (VIEW_W - tw) / 2 - 12;
    const my = VIEW_H - 108;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(12,10,8,0.82)";
    ctx.fillRect(mx, my, tw + 24, 26);
    ctx.strokeStyle = "rgba(232,197,106,0.45)";
    ctx.strokeRect(mx + 0.5, my + 0.5, tw + 23, 25);
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText(state.message, mx + 12, my + 17);
    ctx.globalAlpha = 1;
  }

  if (state.phase === "paused") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (state.menuScreen === "settings") {
      drawMenuSettings(ctx, state);
    } else if (state.menuScreen === "controls") {
      drawMenuControls(ctx);
    } else {
      ctx.textAlign = "center";
      ctx.fillStyle = "#e8c56a";
      ctx.font = "bold 40px system-ui, sans-serif";
      ctx.fillText("ТҮР ЗОГССОН", VIEW_W / 2, VIEW_H / 2 - 110);
      ctx.textAlign = "left";

      const btns = pauseMenuButtons();
      btns.forEach((b, i) => drawUiButton(ctx, b, state.pauseIndex === i));

      ctx.textAlign = "center";
      ctx.fillStyle = COLORS.hudMuted;
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(
        "↑↓ / Enter · хулгана · P — үргэлжлүүлэх",
        VIEW_W / 2,
        VIEW_H / 2 + 170,
      );
      ctx.textAlign = "left";
    }
  }

  if (state.phase === "levelup") {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#c0a0ff";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.fillText(`ТҮВШИН ${state.level}!`, VIEW_W / 2, 120);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText("← → гүйлгээд Enter · эсвэл хулганаар сонго", VIEW_W / 2, 152);

    const cards = skillCardLayout(state.skillChoices.length);
    state.skillChoices.forEach((skill, i) => {
      const card = cards[i];
      const sel = state.menuIndex === i;
      ctx.fillStyle = sel ? "rgba(45,30,70,0.95)" : "rgba(25,20,35,0.92)";
      roundRectPath(ctx, card.x, card.y, card.w, card.h, 12);
      ctx.fill();
      ctx.strokeStyle = sel ? "#c0a0ff" : "rgba(192,160,255,0.5)";
      ctx.lineWidth = sel ? 2.5 : 1.5;
      roundRectPath(ctx, card.x, card.y, card.w, card.h, 12);
      ctx.stroke();

      ctx.fillStyle = sel ? "#c0a0ff" : "#9060d0";
      ctx.beginPath();
      ctx.arc(card.x + card.w / 2, card.y + 32, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.fillText(sel ? "✓" : "•", card.x + card.w / 2, card.y + 37);

      ctx.fillStyle = COLORS.hudAccent;
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText(skill.name, card.x + card.w / 2, card.y + 76);
      ctx.fillStyle = COLORS.hudMuted;
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(skill.desc, card.x + card.w / 2, card.y + 100);
    });
    ctx.textAlign = "left";
  }

  if (state.phase === "won" || state.phase === "lost") {
    const won = state.phase === "won";
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = "center";
    ctx.fillStyle = won ? "#e8c56a" : "#ff8080";
    ctx.font = "bold 48px system-ui, sans-serif";
    ctx.fillText(won ? "ЯЛАЛТ!" : "ЯЛАГДЛАА", VIEW_W / 2, VIEW_H / 2 - 30);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(state.message, VIEW_W / 2, VIEW_H / 2 + 8);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(
      `Оноо ${state.score} · Мал ${world.flock.total} · Өдөр ${world.dayNumber}`,
      VIEW_W / 2,
      VIEW_H / 2 + 36,
    );
    ctx.fillText("Enter / P — үндсэн цэс", VIEW_W / 2, VIEW_H / 2 + 70);
    ctx.textAlign = "left";
  }

  if (state.phase === "ger") {
    if (state.shopOpen) drawChest(ctx, state);
    else if (state.craftOpen) drawCraft(ctx, state);
  }
}

export function drawChest(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const lay = chestLayout();
  const { panel, rows, close } = lay;
  const inv = state.player.inventory;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = "rgba(26,17,10,0.97)";
  roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.fill();
  ctx.strokeStyle = "#e8c56a";
  ctx.lineWidth = 2;
  roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.fillText("АВДАР", VIEW_W / 2, panel.y + 40);
  ctx.textAlign = "left";

  rows.forEach((r, i) => {
    const item = CHEST_ITEMS[i];
    if (!item) return;
    const have = inv[item.key];
    const selected = state.menuIndex === i;

    ctx.fillStyle = selected
      ? "rgba(232,197,106,0.14)"
      : have > 0
        ? "rgba(12,10,8,0.6)"
        : "rgba(12,10,8,0.35)";
    roundRectPath(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = selected ? "#e8c56a" : "rgba(232,197,106,0.22)";
    ctx.lineWidth = selected ? 2 : 1;
    roundRectPath(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.stroke();

    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText(item.icon, r.x + 12, r.y + 34);

    ctx.fillStyle = selected ? "#e8c56a" : COLORS.hudText;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(item.name, r.x + 48, r.y + 20);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(item.desc, r.x + 48, r.y + 38);

    ctx.textAlign = "right";
    ctx.fillStyle = have > 0 ? "#ffd060" : "#a89880";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(have > 0 ? `×${have}` : "Алга", r.x + r.w - 14, r.y + 30);
    ctx.textAlign = "left";
  });

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText(
    "Хадгалсан бараа · зарах бол өвгөнтэй арилжаа",
    VIEW_W / 2,
    panel.y + panel.h - 62,
  );
  ctx.textAlign = "left";

  drawUiButton(ctx, close, false);
}

export function drawShop(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  drawChest(ctx, state);
}

export function drawCraft(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const lay = craftLayout();
  const { panel, rows, close } = lay;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = "rgba(26,17,10,0.97)";
  roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.fill();
  ctx.strokeStyle = "#e8c56a";
  ctx.lineWidth = 2;
  roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText("УРЛАЛ", VIEW_W / 2, panel.y + 40);
  ctx.textAlign = "left";

  const inv = state.player.inventory;
  rows.forEach((r, i) => {
    const recipe = CRAFT_RECIPES[i];
    const selected = state.menuIndex === i;
    let can = true;
    for (const [k, need] of Object.entries(recipe.need)) {
      if ((inv[k as "wool" | "cashmere" | "milk"] ?? 0) < (need ?? 0))
        can = false;
    }

    ctx.fillStyle = selected ? "rgba(232,197,106,0.14)" : "rgba(12,10,8,0.6)";
    roundRectPath(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = selected ? "#e8c56a" : "rgba(232,197,106,0.22)";
    ctx.lineWidth = selected ? 2 : 1;
    roundRectPath(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.stroke();

    ctx.fillStyle = selected ? "#e8c56a" : COLORS.hudText;
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillText(recipe.name, r.x + 16, r.y + 22);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(recipe.desc, r.x + 16, r.y + 40);

    ctx.textAlign = "right";
    ctx.fillStyle = can ? "#a0d890" : "#e07070";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(can ? "Хийх" : "Хүрэлцэхгүй", r.x + r.w - 14, r.y + 30);
    ctx.textAlign = "left";
  });

  drawUiButton(ctx, close, false);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
