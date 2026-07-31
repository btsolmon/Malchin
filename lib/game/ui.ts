// Хүн 6 — меню, дэлгүүр, HUD, minimap

import {
  COLORS,
  FENCE_COST,
  FENCE_TIER_NAMES,
  FENCE_TIER_SHORT,
  FENCE_UPGRADE_COST,
  GATE_PASS_OPEN,
  LIVESTOCK_KINDS,
  LIVESTOCK_MN,
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  type Camera,
  type GameState,
  type GearId,
  type InputState,
  type LivestockKind,
  type Vector2,
  type WeatherKind,
} from "../game/types";
import {
  clamp,
  formatClock,
  nearestFence,
  pastureCenter,
  roundRectPath,
  setMessage,
  weatherLabel,
} from "../game/utils";
import { audio, setMusicVol, setSfxVol, sfx } from "../game/audio";
import { maybeLevelUp } from "../game/player";
import { addLivestock } from "./livestock";
import { dayPhaseLabel } from "./daycycle";

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
      setMessage(
        state,
        "Үүр! Гал түлээд тэжээгчийн дэргэд E — малаа бэлчээрт гарга.",
        6,
      );
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

export type ShopItem =
  | {
      type: "gear";
      id: GearId;
      icon: string;
      name: string;
      desc: string;
      price: number;
    }
  | {
      type: "livestock";
      kind: LivestockKind;
      icon: string;
      name: string;
      desc: string;
      price: number;
    }
  | {
      type: "sell";
      key: "wool" | "cashmere" | "milk" | "felt" | "aaruul";
      icon: string;
      name: string;
      desc: string;
      price: number;
    };

export const SHOP_ITEMS: ShopItem[] = [
  {
    type: "gear",
    id: "dog",
    icon: "🐕",
    name: "Нохой",
    desc: "Сүргийг чононоос өөрөө хамгаална",
    price: 300,
  },
  {
    type: "gear",
    id: "horse",
    icon: "🐎",
    name: "Унах морь",
    desc: "Унаж явахад хурд +50%",
    price: 500,
  },
  {
    type: "gear",
    id: "bow",
    icon: "🏹",
    name: "Нум сум",
    desc: "Холын зайнаас харвана",
    price: 400,
  },
  {
    type: "gear",
    id: "gun",
    icon: "🔫",
    name: "Буу",
    desc: "Хүчтэй бөгөөд хол тусна",
    price: 800,
  },
  {
    type: "gear",
    id: "axe",
    icon: "🪓",
    name: "Сүх",
    desc: "Мод/түлээ нэг цохилтоор унагана",
    price: 500,
  },
  {
    type: "gear",
    id: "urga",
    icon: "🪢",
    name: "Уурга",
    desc: "Зэрлэг морийг ойртож E-ээр барина",
    price: 180,
  },
  {
    type: "livestock",
    kind: "cattle",
    icon: "🐄",
    name: "Үхэр",
    desc: "Сүрэгт үхэр нэмнэ · сүү өгнө",
    price: 220,
  },
  {
    type: "livestock",
    kind: "horse",
    icon: "🐴",
    name: "Морь (сүрэг)",
    desc: "Сүргийн морь · сүү өгнө",
    price: 320,
  },
  {
    type: "livestock",
    kind: "camel",
    icon: "🐪",
    name: "Тэмээ",
    desc: "Сүрэгт тэмээ · сүү/ноос",
    price: 400,
  },
  {
    type: "sell",
    key: "wool",
    icon: "🧶",
    name: "Ноос зарах",
    desc: "1 ноос → 8 оноо",
    price: 8,
  },
  {
    type: "sell",
    key: "cashmere",
    icon: "🧵",
    name: "Ноолуур зарах",
    desc: "1 ноолуур → 22 оноо",
    price: 22,
  },
  {
    type: "sell",
    key: "milk",
    icon: "🥛",
    name: "Сүү зарах",
    desc: "1 сүү → 6 оноо",
    price: 6,
  },
  {
    type: "sell",
    key: "felt",
    icon: "🧺",
    name: "Эсгий зарах",
    desc: "1 эсгий → 45 оноо",
    price: 45,
  },
  {
    type: "sell",
    key: "aaruul",
    icon: "🧀",
    name: "Ааруул зарах",
    desc: "1 ааруул → 30 оноо",
    price: 30,
  },
];

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

export function buyItem(state: GameState, idx: number): void {
  const item = SHOP_ITEMS[idx];
  if (!item) return;

  if (item.type === "sell") {
    const inv = state.player.inventory;
    if (inv[item.key] <= 0) {
      setMessage(state, `${item.name.replace(" зарах", "")} алга.`, 2);
      sfx("move");
      return;
    }
    inv[item.key] -= 1;
    state.score += item.price;
    sfx("buy");
    setMessage(state, `${item.name}: +${item.price} оноо`, 2);
    return;
  }

  if (item.type === "livestock") {
    if (state.score < item.price) {
      setMessage(state, `Оноо хүрэхгүй — ${item.price} оноо хэрэгтэй.`, 2);
      sfx("move");
      return;
    }
    state.score -= item.price;
    addLivestock(state, item.kind, 1);
    sfx("buy");
    setMessage(
      state,
      `${item.name} худалдаж авлаа! (+1 ${LIVESTOCK_MN[item.kind]})`,
      3,
    );
    return;
  }

  if (state.player.gear[item.id]) {
    setMessage(state, `${item.name} аль хэдийн бий.`, 2);
    sfx("move");
    return;
  }
  if (state.score < item.price) {
    setMessage(state, `Оноо хүрэхгүй — ${item.price} оноо хэрэгтэй.`, 2);
    sfx("move");
    return;
  }
  state.score -= item.price;
  state.player.gear[item.id] = true;
  sfx("buy");
  if (item.id === "dog") {
    const c = pastureCenter(state.world);
    state.world.dog = {
      pos: { x: c.x + 40, y: c.y + 30 },
      vel: { x: 0, y: 0 },
      face: 1,
      attackCooldown: 0,
      hp: 60,
      maxHp: 60,
      flash: 0,
    };
  }
  if (item.id === "horse") {
    state.player.horseHp = 80;
    state.player.horseMaxHp = 80;
  }
  setMessage(state, `${item.name} худалдаж авлаа!`, 3);
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
    const lay = shopLayout();
    if (input.menuUp) {
      state.menuIndex =
        (state.menuIndex + SHOP_ITEMS.length - 1) % SHOP_ITEMS.length;
      sfx("move");
    }
    if (input.menuDown) {
      state.menuIndex = (state.menuIndex + 1) % SHOP_ITEMS.length;
      sfx("move");
    }
    if (input.mouseMoved) {
      const scroll = shopScrollStart(state.menuIndex);
      lay.rows.forEach((r, i) => {
        if (overButton(r, input)) state.menuIndex = scroll + i;
      });
    }

    const direct = [
      input.skill1,
      input.skill2,
      input.skill3,
      input.skill4,
    ].findIndex(Boolean);
    if (direct >= 0) {
      buyItem(state, direct);
    } else if (input.confirm) {
      buyItem(state, state.menuIndex);
    }

    if (input.mouseClicked) {
      const scroll = shopScrollStart(state.menuIndex);
      const i = lay.rows.findIndex((r) => overButton(r, input));
      if (i >= 0) {
        buyItem(state, scroll + i);
      } else if (
        overButton(lay.close, input) ||
        !overButton(lay.panel, input)
      ) {
        state.shopOpen = false;
        sfx("select");
      }
    }
    if (input.pause) {
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
      setMessage(state, "Сая унтсан — жаахан хүлээ.", 2);
      sfx("move");
    } else {
      const bed = prox.nearBedL ? lay.bedL : lay.bedR;
      state.gerSleepBed = prox.nearBedL ? "L" : "R";
      state.gerSleepTimer = 5;
      state.gerPlayer.x = bed.x + bed.w / 2;
      state.gerPlayer.y = bed.y + bed.h * 0.38;
      player.moving = false;
      sfx("select");
      setMessage(state, "Зөөлөн орон… унтаж байна…", 5);
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
    state.phase = "playing";
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
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();

  const fillW = w * clamp(ratio, 0, 1);
  if (fillW > h / 2) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, color);
    g.addColorStop(1, shade(color, -30));
    ctx.fillStyle = g;
    roundRectPath(ctx, x, y, fillW, h, h / 2);
    ctx.fill();
    // Гялбаа
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundRectPath(
      ctx,
      x + 2,
      y + 1.5,
      Math.max(2, fillW - 4),
      h * 0.35,
      h * 0.2,
    );
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.stroke();

  ctx.fillStyle = COLORS.hudText;
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText(label, x + 1, y - 4);
}

/** Hex өнгийг гэрэлтүүлэх/бараанруулах */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
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
  const mw = 150;
  const mh = 100;
  const mx = VIEW_W - mw - 14;
  const my = VIEW_H - mh - 14;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;

  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, mx - 4, my - 4, mw + 8, mh + 8, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.3)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, mx - 4, my - 4, mw + 8, mh + 8, 6);
  ctx.stroke();

  ctx.fillStyle = "rgba(70,110,60,0.5)";
  ctx.fillRect(mx, my, mw, mh);

  // Гэр
  ctx.fillStyle = "#e8c56a";
  ctx.fillRect(mx + (WORLD_W / 2) * sx - 2, my + (WORLD_H / 2) * sy - 2, 4, 4);

  // Хонь
  ctx.fillStyle = "#f0ebe3";
  for (const s of state.world.flock.visuals) {
    const colors: Record<string, string> = {
      sheep: "#f0ebe3",
      goat: "#d0c0a0",
      cattle: "#8a6a48",
      horse: "#7a5538",
      camel: "#c4a06a",
    };
    ctx.fillStyle = colors[s.kind] ?? "#f0ebe3";
    ctx.fillRect(mx + s.pos.x * sx - 1, my + s.pos.y * sy - 1, 2, 2);
  }
  // Зэрлэг морь
  ctx.fillStyle = "#e8c56a";
  for (const h of state.world.wildHorses) {
    ctx.fillRect(mx + h.pos.x * sx - 1.5, my + h.pos.y * sy - 1.5, 3, 3);
  }
  // Чоно
  ctx.fillStyle = "#ff5050";
  for (const w of state.world.wolves) {
    ctx.fillRect(mx + w.pos.x * sx - 1.5, my + w.pos.y * sy - 1.5, 3, 3);
  }
  // Хулгайч
  ctx.fillStyle = "#c080ff";
  for (const t of state.world.thieves) {
    ctx.fillRect(mx + t.pos.x * sx - 1.5, my + t.pos.y * sy - 1.5, 3, 3);
  }
  // Эхний замын тулалдаанд орсон дайснууд
  ctx.fillStyle = "#ff9b55";
  for (const enemy of state.world.firstRoute.enemies) {
    if (!enemy.alive || !enemy.engaged) continue;
    const size = enemy.kind === "shulmasynBaatar" ? 4 : 3;
    ctx.fillRect(
      mx + enemy.pos.x * sx - size / 2,
      my + enemy.pos.y * sy - size / 2,
      size,
      size,
    );
  }
  // Тоглогч
  ctx.fillStyle = "#60c0ff";
  ctx.fillRect(
    mx + state.player.pos.x * sx - 2,
    my + state.player.pos.y * sy - 2,
    4,
    4,
  );

  // Камерын харах хүрээ
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(mx + cam.x * sx, my + cam.y * sy, VIEW_W * sx, VIEW_H * sy);
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
    ["1 / 2", "Модон таяг / Хөх тэнгэрийн сэлэм"],
    ["E", "Мод/жимс/өвс · бэлэн мал · тэжээгч: мал гаргах/оруулах"],
    ["Q", "Жимс эсвэл ааруул идэх"],
    ["F", "Гал түлэх (үүр/шөнө дулаац)"],
    ["B", "Хашаа preview → дахин B барих/шинэчлэх"],
    ["", `  ① ${FENCE_TIER_NAMES[1]} — ${FENCE_COST} мод`],
    [
      "",
      `  ② ${FENCE_TIER_NAMES[2]} — ${u1.wood} мод + ${u1.score} оноо`,
    ],
    [
      "",
      `  ③ ${FENCE_TIER_NAMES[3]} — ${u2.wood} мод + ${u2.score} оноо + ${u2.berries} жимс (түв. ${u2.minLevel}+)`,
    ],
    ["N", "Мал туух — орой хашаанд оруулахад"],
    ["G", "Гэр моринд ачих / буулгах (унах морь заавал)"],
    ["", "Өдөр ~24 сек: Үүр→Өдөр→Орой→Шөнө"],
    ["", "Мал бэлчээрт өвс иднэ · дууссан бол хөрс харагдана"],
    ["", "Өвс улирал солигдоход л дахин ургана · нүүдэлд морь"],
    ["", "Ямааны ноолуур — хавар · хоньны ноос — зун"],
    [".", "Мод/түлээ хязгааргүй"],
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
    ["Тоглоомын цөм", "Цолмон"],
    ["Survival механик", "Мянганнаст"],
    ["Дайсан ба AI", "Билгүүнтөгс"],
    ["Тулааны механик", "Баярцогт"],
    ["График", "Номин"],
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

  // Зүүн дээд самбар
  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, pad, pad, 296, 360, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.3)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, pad, pad, 296, 360, 10);
  ctx.stroke();

  drawBarFancy(
    ctx,
    pad + 14,
    pad + 26,
    266,
    12,
    player.vitals.health / player.vitals.maxHealth,
    "#d64545",
    `Амьдрал ${Math.ceil(player.vitals.health)}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 58,
    266,
    12,
    player.stamina / Math.max(1, player.maxStamina),
    "#5ec8e8",
    `Тамир ${Math.ceil(player.stamina)}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 90,
    266,
    12,
    player.vitals.hunger / player.vitals.maxHunger,
    "#c4a035",
    `Өлсгөлөн ${Math.ceil(player.vitals.hunger)}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 122,
    266,
    12,
    player.vitals.warmth / player.vitals.maxWarmth,
    "#ff9f5a",
    `Дулаан ${Math.ceil(player.vitals.warmth)}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 154,
    266,
    12,
    clamp(world.flock.total / 40, 0, 1),
    "#d4c4a0",
    `Мал ${world.flock.total}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 186,
    266,
    12,
    clamp(state.xp / state.xpNext, 0, 1),
    "#9060d0",
    `Түвшин ${state.level} · XP ${Math.floor(state.xp)} / ${state.xpNext}`,
  );

  // Малын төрөл
  ctx.font = "600 11px system-ui, sans-serif";
  let lx = pad + 14;
  for (const k of LIVESTOCK_KINDS) {
    const n = world.flock.counts[k];
    ctx.fillStyle = n >= 1 ? "#a0d890" : "#887860";
    const label = `${LIVESTOCK_MN[k]} ${n}`;
    ctx.fillText(label, lx, pad + 210);
    lx += ctx.measureText(label).width + 10;
  }

  // Нөөц
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillStyle = "#c49a6c";
  ctx.fillText(
    state.unlimitedWood ? "🪵 ∞" : `🪵 ${player.inventory.wood}`,
    pad + 14,
    pad + 228,
  );
  ctx.fillStyle = "#e890b0";
  ctx.fillText(`🍒 ${player.inventory.berries}`, pad + 78, pad + 228);
  ctx.fillStyle =
    world.season === "winter" && world.feeder.hay <= 0
      ? "#ff8080"
      : "#a8c050";
  ctx.fillText(`🌾 ${player.inventory.hay}`, pad + 142, pad + 228);
  ctx.fillStyle = COLORS.hudAccent;
  ctx.fillText(`Өдөр ${world.dayNumber} · ${state.score} оноо`, pad + 200, pad + 228);

  // Өвлийн сүргийн өлсгөлөн / зуны бэлчээр
  if (world.season === "winter") {
    drawBarFancy(
      ctx,
      pad + 14,
      pad + 242,
      266,
      8,
      world.flock.hunger / 100,
      world.flock.hunger < 35 ? "#d64545" : "#9aaa50",
      `Сүрэг ${Math.ceil(world.flock.hunger)}%`,
    );
  } else {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(
      `Бэлчээр ${Math.ceil(world.pastureGrass)}${world.pastureGrass <= 0 ? " (дууссан!)" : ""}`,
      pad + 14,
      pad + 250,
    );
  }

  ctx.fillStyle =
    state.unlimitedWood || player.inventory.wood >= FENCE_COST
      ? "rgba(232,197,106,0.85)"
      : "rgba(168,152,128,0.7)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText(
    state.fencePreview
      ? "B — барих · P = цуцлах"
      : state.unlimitedWood
        ? "B — preview · дахин B = барих · N — туух"
        : `B — preview (${FENCE_COST} мод) · дахин B = барих`,
    pad + 14,
    pad + 272,
  );

  // Бүтээгдэхүүн + тэжээгч
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillStyle = "#e8d8a0";
  ctx.fillText(
    `Ноос ${player.inventory.wool} · Ноолуур ${player.inventory.cashmere} · Сүү ${player.inventory.milk}`,
    pad + 14,
    pad + 292,
  );
  ctx.fillText(
    `Эсгий ${player.inventory.felt} · Ааруул ${player.inventory.aaruul} · Тэжээгч ${Math.floor(world.feeder.hay)}`,
    pad + 14,
    pad + 308,
  );

  const nearFence = nearestFence(player.pos, world.fences, 64);
  if (nearFence) {
    const tier = nearFence.tier;
    const hpPct = Math.max(0, Math.ceil((nearFence.hp / nearFence.maxHp) * 100));
    ctx.fillStyle =
      tier === 3 ? "#7ec8ff" : tier === 2 ? "#c0c0c0" : "#c49a6c";
    ctx.font = "600 11px system-ui, sans-serif";
    const gateLabel = nearFence.isGate ? "Хаалга · " : "";
    ctx.fillText(
      `${gateLabel}${FENCE_TIER_SHORT[tier]} · ${hpPct}%`,
      pad + 14,
      pad + 328,
    );
    if (nearFence.isGate) {
      ctx.fillStyle = COLORS.hudMuted;
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText(
        nearFence.gateOpen >= GATE_PASS_OPEN
          ? "хаалга нээлттэй"
          : "хаалга түлхэж нээх",
        pad + 100,
        pad + 328,
      );
    } else if (tier < 3) {
      const next = FENCE_UPGRADE_COST[tier as 1 | 2];
      const parts = [`${next.wood}м`];
      if (next.score) parts.push(`${next.score}о`);
      if (next.berries) parts.push(`${next.berries}ж`);
      ctx.fillStyle = COLORS.hudMuted;
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText(
        `→ ${FENCE_TIER_NAMES[(tier + 1) as 2 | 3]}: ${parts.join("+")}`,
        pad + 100,
        pad + 328,
      );
    } else {
      ctx.fillStyle = COLORS.hudMuted;
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText(FENCE_TIER_NAMES[3], pad + 100, pad + 328);
    }
  } else {
    ctx.fillStyle = "rgba(168,152,128,0.75)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(
      `${FENCE_TIER_NAMES[1]} → ${FENCE_TIER_NAMES[2]} → ${FENCE_TIER_NAMES[3]}`,
      pad + 14,
      pad + 328,
    );
  }

  // Баруун дээд: цаг агаар + өдрийн фаз
  const panelW = 210;
  const panelH = 78;
  const rx = VIEW_W - panelW - pad;
  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, rx, pad, panelW, panelH, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.3)";
  roundRectPath(ctx, rx, pad, panelW, panelH, 10);
  ctx.stroke();

  drawWeatherIcon(ctx, rx + 22, pad + 29, world.weather);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(weatherLabel(world.weather, world.season), rx + 40, pad + 22);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "12px system-ui, sans-serif";
  const phaseIcon =
    world.dayPhase === "night"
      ? "🌙"
      : world.dayPhase === "evening"
        ? "🌅"
        : world.dayPhase === "dawn"
          ? "🌄"
          : "☀️";
  ctx.fillText(
    `${phaseIcon} ${dayPhaseLabel(world.dayPhase)} · ${formatClock(world.timeOfDay)}`,
    rx + 40,
    pad + 42,
  );
  ctx.fillStyle =
    world.flockOut &&
    (world.dayPhase === "evening" || world.dayPhase === "night")
      ? "#ff9080"
      : world.flockOut
        ? "#a0d890"
        : "#c4b898";
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText(
    world.flockOut ? "Мал: бэлчээрт" : "Мал: хашаанд",
    rx + 40,
    pad + 62,
  );

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
  ctx.font = "700 11px system-ui, sans-serif";
  const routeWidth = Math.ceil(ctx.measureText(routeText).width) + 22;
  const routeX = VIEW_W - routeWidth - pad;
  const routeY = pad + panelH + 8;
  ctx.fillStyle = "rgba(28,18,13,0.82)";
  roundRectPath(ctx, routeX, routeY, routeWidth, 25, 12);
  ctx.fill();
  ctx.strokeStyle = route.complete
    ? "rgba(232,197,106,0.68)"
    : "rgba(255,155,85,0.55)";
  roundRectPath(ctx, routeX, routeY, routeWidth, 25, 12);
  ctx.stroke();
  ctx.fillStyle = route.complete ? "#ffe08a" : "#ffb078";
  ctx.fillText(routeText, routeX + 11, routeY + 17);

  const weaponText =
    player.weapon === "skySword"
      ? "2 · Хөх тэнгэрийн сэлэм"
      : "1 · Модон таяг";
  const weaponWidth = Math.ceil(ctx.measureText(weaponText).width) + 22;
  const weaponX = VIEW_W - weaponWidth - pad;
  const weaponY = routeY + 31;
  ctx.fillStyle =
    player.weapon === "skySword"
      ? "rgba(26,72,96,0.82)"
      : "rgba(45,31,20,0.78)";
  roundRectPath(ctx, weaponX, weaponY, weaponWidth, 25, 12);
  ctx.fill();
  ctx.strokeStyle =
    player.weapon === "skySword"
      ? "rgba(180,232,255,0.72)"
      : "rgba(205,165,104,0.52)";
  roundRectPath(ctx, weaponX, weaponY, weaponWidth, 25, 12);
  ctx.stroke();
  ctx.fillStyle =
    player.weapon === "skySword" ? "#d9f4ff" : "#e5c88d";
  ctx.fillText(weaponText, weaponX + 11, weaponY + 17);

  // Аюулын мэдээлэл
  if (world.wolves.length > 0 || world.thieves.length > 0) {
    const parts: string[] = [];
    if (world.wolves.length) parts.push(`Чоно ${world.wolves.length}`);
    if (world.thieves.length) {
      const stolen = world.thieves.reduce((s, t) => s + t.stolen, 0);
      parts.push(`Хулгайч (−${stolen} мал)`);
    }
    const text = parts.join("  ·  ");
    ctx.font = "600 13px system-ui, sans-serif";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(120,20,20,0.8)";
    roundRectPath(ctx, VIEW_W / 2 - tw / 2 - 14, pad, tw + 28, 30, 15);
    ctx.fill();
    ctx.fillStyle = "#ffc0c0";
    ctx.fillText(text, VIEW_W / 2 - tw / 2, pad + 20);
  }

  // Эзэмшсэн эд зүйлс — зүүн доод булан
  const gearIcons = SHOP_ITEMS.filter(
    (it): it is Extract<ShopItem, { type: "gear" }> =>
      it.type === "gear" && player.gear[it.id],
  )
    .map((it) => it.icon)
    .join(" ");
  if (gearIcons) {
    ctx.font = "15px system-ui, sans-serif";
    const gw = ctx.measureText(gearIcons).width;
    ctx.fillStyle = "rgba(12,10,8,0.72)";
    roundRectPath(ctx, 14, VIEW_H - 46, gw + 26, 32, 16);
    ctx.fill();
    ctx.fillText(gearIcons, 27, VIEW_H - 24);
  }

  // Мессеж
  if (state.messageTimer > 0 && state.message && state.phase === "playing") {
    const alpha = clamp(state.messageTimer / 0.4, 0, 1);
    ctx.font = "14px system-ui, sans-serif";
    const tw = ctx.measureText(state.message).width;
    const mx = (VIEW_W - tw) / 2 - 14;
    const my = VIEW_H - 46;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(12,10,8,0.78)";
    roundRectPath(ctx, mx, my, tw + 28, 30, 15);
    ctx.fill();
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText(state.message, mx + 14, my + 20);
    ctx.globalAlpha = 1;
  }

  // Пауз дэлгэц — үргэлжлүүлэх / тохиргоо / удирдлага / үндсэн цэс
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

  // Түвшин ахих — ур чадвар сонгох дэлгэц
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

  // Төгсгөлийн дэлгэц
  if (state.phase === "won" || state.phase === "lost") {
    const won = state.phase === "won";
    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = "center";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillStyle = won ? "#e8c56a" : "#ff6b6b";
    ctx.fillText(won ? "ЯЛАЛТ!" : "ЯЛАГДЛАА", VIEW_W / 2, VIEW_H / 2 - 30);

    ctx.fillStyle = COLORS.hudText;
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(state.message, VIEW_W / 2, VIEW_H / 2 + 8);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(
      `Түвшин: ${state.level} · Өдөр: ${state.world.dayNumber} · Мал: ${state.world.flock.total} · Оноо: ${state.score}`,
      VIEW_W / 2,
      VIEW_H / 2 + 36,
    );
    ctx.fillStyle = COLORS.hudAccent;
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillText("Enter / P — үндсэн цэс", VIEW_W / 2, VIEW_H / 2 + 70);
    ctx.textAlign = "left";
  }
}

// ---------------------------------------------------------------------------
// Гэрийн дотор
// ---------------------------------------------------------------------------

/** Монгол гэрийн дотор — тооно, унь, хана, зуух, авдар, ор */

export function drawShop(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const lay = shopLayout();
  const { panel, rows, close } = lay;
  const scroll = shopScrollStart(state.menuIndex);

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
  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText(`Оноо: ${state.score}`, panel.x + panel.w - 26, panel.y + 40);
  ctx.textAlign = "left";

  rows.forEach((r, i) => {
    const item = SHOP_ITEMS[scroll + i];
    if (!item) return;
    const selected = state.menuIndex === scroll + i;
    let owned = false;
    let rightLabel = "";
    let afford = true;
    if (item.type === "gear") {
      owned = state.player.gear[item.id];
      afford = state.score >= item.price;
      rightLabel = owned ? "Эзэмшсэн ✓" : `${item.price} оноо`;
    } else if (item.type === "livestock") {
      afford = state.score >= item.price;
      rightLabel = `${item.price} оноо`;
    } else {
      const have = state.player.inventory[item.key];
      afford = have > 0;
      rightLabel = have > 0 ? `×${have} · +${item.price}` : "Алга";
    }

    ctx.fillStyle = owned
      ? "rgba(70,95,55,0.35)"
      : selected
        ? "rgba(232,197,106,0.14)"
        : "rgba(12,10,8,0.6)";
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
    ctx.fillStyle = owned
      ? "#a0d890"
      : afford
        ? "#ffd060"
        : "#e07070";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(rightLabel, r.x + r.w - 14, r.y + 30);
    ctx.textAlign = "left";
  });

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText(
    `↑↓ гүйлгэх · ${scroll + 1}–${Math.min(scroll + SHOP_VISIBLE, SHOP_ITEMS.length)} / ${SHOP_ITEMS.length}`,
    VIEW_W / 2,
    panel.y + panel.h - 62,
  );
  ctx.textAlign = "left";

  drawUiButton(ctx, close, false);
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
      if ((inv[k as "wool" | "cashmere" | "milk"] ?? 0) < (need ?? 0)) can = false;
    }

    ctx.fillStyle = selected
      ? "rgba(232,197,106,0.14)"
      : "rgba(12,10,8,0.6)";
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
