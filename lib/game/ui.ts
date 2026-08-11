// Хүн 6 — меню, дэлгүүр, HUD, minimap

import {
  COLORS,
  FENCE_TIER_SHORT,
  LIVESTOCK_ICON,
  LIVESTOCK_KINDS,
  PASTURE_RADIUS,
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  type Camera,
  type GameState,
  type InputState,
  type Vector2,
} from "../game/types";
import {
  clamp,
  nearestFence,
  pastureCenter,
  roundRectPath,
  drawFrostedGlassPanel,
  setMessage,
} from "../game/utils";
import { audio, setMusicVol, setSfxVol, sfx, startSleepSnore, stopSleepSnore } from "../game/audio";
import { maybeLevelUp } from "../game/player";
import { advanceToMorning } from "../game/daycycle";
import { getLang, langLabel, setLang, t, tr, trFormat } from "./i18n";
import { hasAnyRecord, hasCompletedStory, loadRecords } from "./records";
import { clearSave, hasSave } from "./save";
import { DESERT_Y, FOREST_Y, RIVER_HALF_W, riverCenterX } from "./biomes";
import { inShulmasSpirit } from "./firstRoute";
import { drawPlayer } from "./render/entities";
import { drawGameIcon, type GameIconId } from "./icons";
import { beginOpeningSequence, drawMainObjectivePanel } from "./story";

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

export type MainMenuAction =
  | "continue"
  | "play"
  | "settings"
  | "controls"
  | "credits";

export type StoryChoiceAction = "watchStory" | "skipStory" | "back";

/**
 * Үндсэн цэсний мөрүүд. Хадгалсан тоглоом байвал "Үргэлжлүүлэх" нэмэгдэж
 * мөрийн тоо өөрчлөгдөнө — тиймээс индексээр биш action-аар шийднэ.
 */
export function mainMenuEntries(): Array<{
  action: MainMenuAction;
  label: string;
}> {
  const entries: Array<{ action: MainMenuAction; label: string }> = [];
  if (hasSave()) {
    entries.push({ action: "continue", label: t("menu.continue") });
    entries.push({ action: "play", label: t("menu.newGame") });
  } else {
    entries.push({ action: "play", label: t("menu.play") });
  }
  entries.push({ action: "settings", label: t("menu.settings") });
  entries.push({ action: "controls", label: t("menu.controls") });
  entries.push({ action: "credits", label: t("menu.credits") });
  return entries;
}

export function storyChoiceEntries(): Array<{
  action: StoryChoiceAction;
  label: string;
}> {
  return [
    { action: "watchStory", label: t("menu.watchStory") },
    { action: "skipStory", label: t("menu.skipStory") },
    { action: "back", label: t("settings.back") },
  ];
}

export function storyChoiceButtons(): UiButton[] {
  const w = 260;
  const h = 46;
  const gap = 14;
  const x = (VIEW_W - w) / 2;
  const entries = storyChoiceEntries();
  const y0 = 268;
  return entries.map((entry, i) => ({
    x,
    y: y0 + i * (h + gap),
    w,
    h,
    label: entry.label,
  }));
}

export function mainMenuButtons(): UiButton[] {
  const w = 230;
  const h = 46;
  const gap = 13;
  const x = (VIEW_W - w) / 2;
  const entries = mainMenuEntries();
  const blockH = entries.length * h + (entries.length - 1) * gap;
  // Мөр нэмэгдэхэд доод захаас багцлан дээшилнэ, гэхдээ
  // дэд гарчиг (y≈200) дээр гарахгүй.
  const y0 = Math.max(224, Math.min(244, 512 - blockH));
  return entries.map((entry, i) => ({
    x,
    y: y0 + i * (h + gap),
    w,
    h,
    label: entry.label,
  }));
}

export function pauseMenuButtons(): UiButton[] {
  const w = 250;
  const h = 44;
  const gap = 12;
  const x = (VIEW_W - w) / 2;
  const y0 = VIEW_H / 2 - 70;
  return [
    t("pause.resume"),
    t("menu.settings"),
    t("menu.controls"),
    t("pause.mainMenu"),
  ].map((label, i) => ({
    x,
    y: y0 + i * (h + gap),
    w,
    h,
    label,
  }));
}

export function settingsLayout(): {
  rows: Array<{ label: string; bar: UiButton }>;
  language: { label: string; bar: UiButton };
  back: UiButton;
} {
  const barW = 250;
  const barX = VIEW_W / 2 - 30;
  return {
    rows: [
      {
        label: t("settings.music"),
        bar: { x: barX, y: 212, w: barW, h: 20, label: "" },
      },
      {
        label: t("settings.sfx"),
        bar: { x: barX, y: 266, w: barW, h: 20, label: "" },
      },
    ],
    language: {
      label: t("settings.language"),
      bar: { x: barX, y: 320, w: barW, h: 28, label: langLabel() },
    },
    back: {
      x: (VIEW_W - 170) / 2,
      y: 388,
      w: 170,
      h: 44,
      label: t("settings.back"),
    },
  };
}

/** Тохиргооны мөрийн индексүүд — ая, эффект, хэл, буцах */
const SETTINGS_LANG_ROW = 2;
const SETTINGS_BACK_ROW = 3;

export function updateSettingsMenu(state: GameState): void {
  const input = state.input;
  const lay = settingsLayout();
  const rowCount = 4; // ая, эффект, хэл, буцах

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
    // Key-repeat-ээр түвшин 0 руу унахгүй — зөвхөн нэг алхам
    if (input.menuLeft) {
      setters[state.menuIndex](getters[state.menuIndex]() - 0.1);
      sfx("move");
      input.menuLeft = false;
    }
    if (input.menuRight) {
      setters[state.menuIndex](getters[state.menuIndex]() + 0.1);
      sfx("move");
      input.menuRight = false;
    }
  }

  // Хэл — ← → эсвэл Enter аль нь ч сольж болно (хоёр л хэл байгаа)
  if (state.menuIndex === SETTINGS_LANG_ROW) {
    if (input.menuLeft || input.menuRight || input.confirm) {
      setLang(getLang() === "mn" ? "en" : "mn");
      sfx("select");
      return;
    }
  }

  if (input.mouseMoved) {
    lay.rows.forEach((row, i) => {
      if (overButton(row.bar, input)) state.menuIndex = i;
    });
    if (overButton(lay.language.bar, input)) {
      state.menuIndex = SETTINGS_LANG_ROW;
    }
    if (overButton(lay.back, input)) state.menuIndex = SETTINGS_BACK_ROW;
  }
  if (input.mouseClicked) {
    lay.rows.forEach((row, i) => {
      if (overButton(row.bar, input)) {
        const rel = clamp((input.mouseX - row.bar.x) / row.bar.w, 0, 1);
        setters[i](Math.round(rel * 10) / 10);
        sfx("move");
      }
    });
    if (overButton(lay.language.bar, input)) {
      setLang(getLang() === "mn" ? "en" : "mn");
      sfx("select");
      return;
    }
    if (overButton(lay.back, input)) {
      if (state.phase === "paused") {
        state.menuScreen = "main";
        state.pauseIndex = 2;
      } else {
        state.menuScreen = "main";
        state.menuIndex = mainMenuIndexOf("settings");
      }
      sfx("select");
      return;
    }
  }

  if (input.pause || (input.confirm && state.menuIndex === SETTINGS_BACK_ROW)) {
    if (state.phase === "paused") {
      state.menuScreen = "main";
      state.pauseIndex = 2;
    } else {
      state.menuScreen = "main";
      state.menuIndex = mainMenuIndexOf("settings");
    }
    sfx("select");
  }
}

/** Үндсэн цэс дэх тухайн үйлдлийн мөрийн индекс (мөрийн тоо хувирдаг) */
export function mainMenuIndexOf(action: MainMenuAction): number {
  const i = mainMenuEntries().findIndex((e) => e.action === action);
  return i < 0 ? 0 : i;
}

export function updateMenu(state: GameState): void {
  const input = state.input;

  if (state.menuScreen === "main") {
    const entries = mainMenuEntries();
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
    if (activate < 0 || activate >= entries.length) return;

    const action = entries[activate].action;
    if (action === "continue") {
      // Төлөвийг engine солино — requestRestart-тай ижил хэв маяг
      state.requestLoad = true;
      sfx("select");
    } else if (action === "play") {
      if (hasCompletedStory()) {
        // Cutscene-ээс өмнө түүх үзэх/алгасах — хадгалалтыг сонгосны дараа устгана
        state.menuScreen = "storyChoice";
        state.menuIndex = 0;
      } else {
        clearSave();
        beginOpeningSequence(state);
      }
      sfx("select");
    } else if (action === "settings") {
      state.menuScreen = "settings";
      state.menuIndex = 0;
      sfx("select");
    } else if (action === "controls") {
      state.menuScreen = "controls";
      sfx("select");
    } else if (action === "credits") {
      state.menuScreen = "credits";
      sfx("select");
    }
    return;
  }

  if (state.menuScreen === "storyChoice") {
    const entries = storyChoiceEntries();
    const btns = storyChoiceButtons();
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
    if (input.pause) {
      state.menuScreen = "main";
      state.menuIndex = mainMenuIndexOf("play");
      sfx("select");
      return;
    }

    let activate = -1;
    if (input.confirm) activate = state.menuIndex;
    if (input.mouseClicked) {
      const i = btns.findIndex((b) => overButton(b, input));
      if (i >= 0) activate = i;
    }
    if (activate < 0 || activate >= entries.length) return;

    const action = entries[activate].action;
    if (action === "watchStory") {
      clearSave();
      beginOpeningSequence(state);
      state.menuScreen = "main";
      sfx("select");
    } else if (action === "skipStory") {
      clearSave();
      state.requestSkipStory = true;
      state.menuScreen = "main";
      sfx("select");
    } else if (action === "back") {
      state.menuScreen = "main";
      state.menuIndex = mainMenuIndexOf("play");
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
    state.menuIndex = mainMenuIndexOf(
      state.menuScreen === "controls" ? "controls" : "credits",
    );
    state.menuScreen = "main";
    sfx("select");
  }
}

// ---------------------------------------------------------------------------
// Гэр ба дэлгүүр
// ---------------------------------------------------------------------------

export interface CraftRecipe {
  id: string;
  name: string;
  desc: string;
  icon: GameIconId;
  need: Partial<Record<"wool" | "cashmere" | "milk" | "wood" | "stone", number>>;
  give: Partial<Record<"felt" | "aaruul" | "arrows", number>>;
}

/** Жорын нэр/тайлбар хэлээс хамаарна — тиймээс дуудах үед бүрдүүлнэ */
export function craftRecipes(): CraftRecipe[] {
  return [
    {
      id: "arrows",
      name: t("craft.arrows.name"),
      desc: t("craft.arrows.desc"),
      icon: "arrow",
      need: { wood: 1, stone: 1 },
      give: { arrows: 2 },
    },
    {
      id: "felt",
      name: t("craft.felt.name"),
      desc: t("craft.felt.desc"),
      icon: "felt",
      need: { wool: 3 },
      give: { felt: 1 },
    },
    {
      id: "aaruul",
      name: t("craft.aaruul.name"),
      desc: t("craft.aaruul.desc"),
      icon: "aaruul",
      need: { milk: 2 },
      give: { aaruul: 1 },
    },
    {
      id: "cashmere_felt",
      name: t("craft.cashmereFelt.name"),
      desc: t("craft.cashmereFelt.desc"),
      icon: "felt",
      need: { cashmere: 2 },
      give: { felt: 2 },
    },
  ];
}

export function gerLayout(): {
  chestL: UiButton;
  chestR: UiButton;
  chestC: UiButton;
  door: UiButton;
  bedL: UiButton;
  bedR: UiButton;
  stove: UiButton;
  woodBox: UiButton;
  artHorse: UiButton;
  artFamily: UiButton;
  artTara: UiButton;
} {
  // Хаалганаас (урдаас/өмнөд) дотогш харсан байрлал:
  // доод = хаалга, дээд = хоймор, зүүн/баруун = ор + авдар
  const carpetCx = 480;
  const carpetCy = 400;
  const stoveW = 100;
  const stoveH = 72;
  const stove = {
    x: carpetCx - stoveW / 2,
    y: carpetCy - stoveH * 0.55,
    w: stoveW,
    h: stoveH,
    label: "",
  };
  // Түлээний дөрвөлж — зуухны урд (хаалга руу)
  const woodBox = {
    x: carpetCx - 34,
    y: stove.y + stove.h - 4,
    w: 68,
    h: 40,
    label: "",
  };
  const chestL = { x: 250, y: 248, w: 130, h: 90, label: "" };
  const chestR = { x: 580, y: 248, w: 130, h: 90, label: "" };
  const chestC = { x: 425, y: 242, w: 110, h: 82, label: "" };
  const taraW = 36;
  const taraH = 52;
  // Бурхан тахил — голын авдар дээр
  const taraX = chestC.x + chestC.w / 2 - 10 - taraW / 2;
  const taraY = chestC.y - 2 - taraH - 4;
  // Гэр бүлийн зураг — баруун авдрын хойно (хана)
  const familyW = 110;
  const familyH = 78;
  const familyX = chestR.x + chestR.w / 2 - familyW / 2;
  const familyY = chestR.y - familyH - 8;
  return {
    chestL,
    chestR,
    chestC,
    // Хаалга — дэлгэцийн доод (урд)
    door: { x: 390, y: 488, w: 180, h: 48, label: "" },
    // Ор — өргөн нарийн, урт (хоймор↔хаалга чиглэл) илүү
    bedL: { x: 52, y: 298, w: 132, h: 112, label: "" },
    bedR: { x: 776, y: 298, w: 132, h: 112, label: "" },
    stove,
    woodBox,
    artHorse: { x: 145, y: 178, w: 110, h: 76, label: "" },
    artFamily: { x: familyX, y: familyY, w: familyW, h: familyH, label: "" },
    artTara: { x: taraX, y: taraY, w: taraW, h: taraH, label: "" },
  };
}

/** Гэр доторх малчны ойролцоо байгаа зүйлс */
export function gerProximity(state: GameState): {
  nearChestL: boolean;
  nearChestR: boolean;
  nearChestC: boolean;
  nearChest: boolean;
  nearBed: boolean;
  nearBedL: boolean;
  nearBedR: boolean;
  nearStove: boolean;
  atDoor: boolean;
} {
  const p = state.gerPlayer;
  const lay = gerLayout();
  const nearRect = (r: UiButton, range: number): boolean => {
    const nx = clamp(p.x, r.x, r.x + r.w);
    const ny = clamp(p.y, r.y, r.y + r.h);
    return Math.hypot(p.x - nx, p.y - ny) < range;
  };
  const nearBedL = nearRect(lay.bedL, 40);
  const nearBedR = nearRect(lay.bedR, 40);
  const nearChestL = nearRect(lay.chestL, 55);
  const nearChestR = nearRect(lay.chestR, 55);
  const nearChestC = nearRect(lay.chestC, 55);
  const nearStove =
    nearRect(lay.stove, 48) || nearRect(lay.woodBox, 42);
  return {
    nearChestL,
    nearChestR,
    nearChestC,
    nearChest: nearChestL || nearChestR || nearChestC,
    nearBed: nearBedL || nearBedR,
    nearBedL,
    nearBedR,
    nearStove,
    atDoor: p.y > 492 && Math.abs(p.x - 480) < 90,
  };
}

interface ChestItem {
  key: "milk" | "aaruul" | "felt" | "wool" | "cashmere";
  icon: GameIconId;
  name: string;
  desc: string;
}

/** Нэр/тайлбар хэлээс хамаарна — тиймээс дуудах үед бүрдүүлнэ */
function chestItems(): ChestItem[] {
  return [
    {
      key: "milk",
      icon: "milk",
      name: t("item.milk.name"),
      desc: t("item.milk.desc"),
    },
    {
      key: "aaruul",
      icon: "aaruul",
      name: t("item.aaruul.name"),
      desc: t("item.aaruul.desc"),
    },
    {
      key: "felt",
      icon: "felt",
      name: t("item.felt.name"),
      desc: t("item.felt.desc"),
    },
    {
      key: "wool",
      icon: "wool",
      name: t("item.wool.name"),
      desc: t("item.wool.desc"),
    },
    {
      key: "cashmere",
      icon: "cashmere",
      name: t("item.cashmere.name"),
      desc: t("item.cashmere.desc"),
    },
  ];
}

export function chestLayout(): {
  panel: UiButton;
  rows: UiButton[];
  close: UiButton;
} {
  const w = 520;
  const h = 76 + chestItems().length * 54 + 70;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  const rows: UiButton[] = chestItems().map((_, i) => ({
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

export function craftLayout(): {
  panel: UiButton;
  rows: UiButton[];
  close: UiButton;
} {
  const w = 520;
  const rowH = 58;
  const rowGap = 8;
  const h = 76 + craftRecipes().length * (rowH + rowGap) + 70;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  const rows: UiButton[] = craftRecipes().map((it, i) => ({
    x: x + 24,
    y: y + 76 + i * (rowH + rowGap),
    w: w - 48,
    h: rowH,
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

export function craftItem(state: GameState, idx: number): void {
  const recipe = craftRecipes()[idx];
  if (!recipe) return;
  const inv = state.player.inventory;
  type NeedKey = "wool" | "cashmere" | "milk" | "wood" | "stone";
  type GiveKey = "felt" | "aaruul" | "arrows";
  for (const [k, need] of Object.entries(recipe.need)) {
    const key = k as NeedKey;
    if ((inv[key] ?? 0) < (need ?? 0)) {
      setMessage(
        state,
        trFormat("Хүрэлцэхгүй — {desc}", { desc: tr(recipe.desc) }),
        2,
      );
      sfx("move");
      return;
    }
  }
  for (const [k, need] of Object.entries(recipe.need)) {
    const key = k as NeedKey;
    inv[key] -= need ?? 0;
  }
  for (const [k, give] of Object.entries(recipe.give)) {
    const key = k as GiveKey;
    inv[key] += give ?? 0;
  }
  sfx("buy");
  setMessage(
    state,
    trFormat("{name} хийлээ!", { name: tr(recipe.name) }),
    2.5,
  );
}

function tryLightGerStove(state: GameState): void {
  const cost = 3;
  const player = state.player;
  if (!state.unlimitedWood && player.inventory.wood < cost) {
    setMessage(
      state,
      trFormat("Зууханд {need} түлээ хэрэгтэй.", { need: cost }),
      2,
    );
    sfx("move");
    return;
  }
  if (!state.unlimitedWood) player.inventory.wood -= cost;

  if (state.gerStoveLit) {
    state.gerStoveFuel += 24;
    sfx("fire");
    setMessage(state, "Зууханд түлээ нэмлээ.", 3.5);
    return;
  }

  state.gerStoveLit = true;
  state.gerStoveFuel = 30;
  sfx("fire");
  if (
    state.story.activeMainObjective === "restoreHearth" &&
    !state.story.campfireRelit
  ) {
    setMessage(state, "Зууханд гал асаалаа! Голомт сэргэж байна…", 5);
  } else {
    setMessage(state, "Зууханд гал асаалаа!", 3.5);
  }
}

export function updateGer(state: GameState, dt: number): void {
  const input = state.input;

  // Зуухны түлш шатах + дулаан
  if (state.gerStoveLit) {
    state.gerStoveFuel -= dt;
    if (state.gerStoveFuel <= 0) {
      state.gerStoveFuel = 0;
      state.gerStoveLit = false;
      setMessage(state, "Зуухны гал унтарлаа.", 2);
    } else {
      state.player.vitals.warmth = Math.min(
        100,
        state.player.vitals.warmth + 8 * dt,
      );
    }
  }

  if (state.gerSleepTimer > 0) {
    const prev = state.gerSleepTimer;
    state.gerSleepTimer = Math.max(0, state.gerSleepTimer - dt);
    state.player.moving = false;
    // Харанхуй дунд өглөө рүү шилжинэ — нүд нээгдэхэд өглөө харагдана
    const midDark = 5 * (1 - 0.5);
    if (prev > midDark && state.gerSleepTimer <= midDark) {
      const player = state.player;
      player.vitals.health = Math.min(
        player.vitals.maxHealth,
        player.vitals.health + 50,
      );
      player.vitals.warmth = Math.min(100, player.vitals.warmth + 40);
      player.sleepCooldown = 60;
      advanceToMorning(state);
      stopSleepSnore();
      sfx("levelup");
      setMessage(
        state,
        tr("Сайхан унтаж амарлаа. Өглөө болов · +50 амь"),
        3.5,
      );
    }
    if (state.gerSleepTimer <= 0) {
      state.gerSleepBed = null;
      stopSleepSnore();
    }
    return;
  }

  if (state.craftOpen) {
    const lay = craftLayout();
    if (input.menuUp) {
      state.menuIndex =
        (state.menuIndex + craftRecipes().length - 1) % craftRecipes().length;
      sfx("move");
    }
    if (input.menuDown) {
      state.menuIndex = (state.menuIndex + 1) % craftRecipes().length;
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
        (state.menuIndex + chestItems().length - 1) % chestItems().length;
      sfx("move");
    }
    if (input.menuDown) {
      state.menuIndex = (state.menuIndex + 1) % chestItems().length;
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

  if (state.gerArtZoom) {
    if (
      input.mouseClicked ||
      input.pause ||
      input.confirm ||
      input.interact
    ) {
      state.gerArtZoom = null;
      input.mouseClicked = false;
      input.interact = false;
      input.confirm = false;
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
    state.gerPlayer.x = clamp(state.gerPlayer.x + nx * 170 * dt, 70, 890);
    state.gerPlayer.y = clamp(state.gerPlayer.y + ny * 170 * dt, 285, 505);
  }

  const prox = gerProximity(state);

  if (input.mouseClicked) {
    if (overButton(lay.artFamily, input)) {
      state.gerArtZoom = "family";
      input.mouseClicked = false;
      sfx("select");
      return;
    }
    if (overButton(lay.artHorse, input)) {
      state.gerArtZoom = "horse";
      input.mouseClicked = false;
      sfx("select");
      return;
    }
    if (overButton(lay.artTara, input)) {
      state.gerArtZoom = "tara";
      input.mouseClicked = false;
      sfx("select");
      return;
    }
  }

  if (
    (input.interact && prox.nearStove) ||
    (input.lightFire && prox.nearStove) ||
    (input.mouseClicked &&
      (overButton(lay.stove, input) || overButton(lay.woodBox, input)))
  ) {
    input.interact = false;
    input.lightFire = false;
    tryLightGerStove(state);
    return;
  }
  if (input.lightFire) input.lightFire = false;

  if (
    (input.interact && prox.nearChestL) ||
    (input.mouseClicked && overButton(lay.chestL, input))
  ) {
    state.craftOpen = true;
    state.shopOpen = false;
    state.menuIndex = 0;
    state.input.interact = false;
    sfx("select");
    return;
  }

  if (
    (input.interact && prox.nearChestR) ||
    (input.interact && prox.nearChestC) ||
    (input.mouseClicked && overButton(lay.chestR, input)) ||
    (input.mouseClicked && overButton(lay.chestC, input))
  ) {
    state.shopOpen = true;
    state.craftOpen = false;
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
      startSleepSnore();
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
    sfx("door");
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
      state.pauseIndex = 3;
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
    setMessage(
      state,
      trFormat("Ур чадвар: {name}!", { name: tr(skill.name) }),
      3,
    );
    sfx("select");
    maybeLevelUp(state);
  }
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
  // Морь унасан ч портретад зөвхөн царай харагдана.
  ctx.translate(cx, cy + 34);
  ctx.scale(2.45, 2.45);
  const portraitPlayer = {
    ...state.player,
    riding: false,
    moving: false,
  };
  drawPlayer(
    ctx,
    portraitPlayer,
    { x: state.player.pos.x, y: state.player.pos.y },
    performance.now() / 1000,
    false,
  );
  ctx.restore();

  // Даарахад аватарын тойрог цэнхэрлэж мөстөнө
  drawPortraitColdFrost(ctx, state, cx, cy, radius);
}

/** Дулаан багасахад зүүн дээд аватарын хүрээ мөстөнө */
function drawPortraitColdFrost(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cx: number,
  cy: number,
  radius: number,
): void {
  if (
    state.phase === "menu" ||
    state.phase === "intro" ||
    state.phase === "spirit"
  ) {
    return;
  }

  const { warmth, maxWarmth } = state.player.vitals;
  const ratio = maxWarmth > 0 ? warmth / maxWarmth : 1;
  if (ratio >= 0.45) return;

  const intensity = Math.min(1, (0.45 - ratio) / 0.45);
  const time = performance.now() / 1000;
  const shimmer = 0.85 + Math.sin(time * 2.8) * 0.15;
  const rimR = radius + 5;

  ctx.save();

  // Гадна цэнхэр гэрэл / мөсөн хүрээ
  ctx.globalAlpha = (0.35 + intensity * 0.55) * shimmer;
  ctx.strokeStyle = `rgba(${140 + intensity * 80},${200 + intensity * 40},255,0.95)`;
  ctx.lineWidth = 3 + intensity * 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, rimR + 1 + intensity * 2, 0, Math.PI * 2);
  ctx.stroke();

  // Дотор мөстөн цагираг
  ctx.globalAlpha = (0.25 + intensity * 0.45) * shimmer;
  ctx.strokeStyle = "rgba(210,235,255,0.9)";
  ctx.lineWidth = 2 + intensity * 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, rimR - 2, 0, Math.PI * 2);
  ctx.stroke();

  // Мөстөн ширхэг — тойргийн дагуу
  ctx.globalAlpha = (0.4 + intensity * 0.5) * shimmer;
  ctx.strokeStyle = "rgba(230,245,255,0.95)";
  ctx.fillStyle = "rgba(200,230,255,0.7)";
  ctx.lineWidth = 1.1;
  const spikes = 10 + Math.floor(intensity * 8);
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 + time * 0.15;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const base = rimR + 0.5;
    const len = 3 + (i % 3) * 1.6 + intensity * 4;
    ctx.beginPath();
    ctx.moveTo(cx + cos * base, cy + sin * base);
    ctx.lineTo(cx + cos * (base + len), cy + sin * (base + len));
    const mid = base + len * 0.45;
    const px = -sin;
    const py = cos;
    ctx.moveTo(cx + cos * mid, cy + sin * mid);
    ctx.lineTo(cx + cos * mid + px * 2.2, cy + sin * mid + py * 2.2);
    ctx.moveTo(cx + cos * mid, cy + sin * mid);
    ctx.lineTo(cx + cos * mid - px * 2.2, cy + sin * mid - py * 2.2);
    ctx.stroke();

    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.arc(
        cx + cos * (base + 1.2),
        cy + sin * (base + 1.2),
        1.1 + intensity * 0.8,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // Хүчтэй даарахад доторх цэнхэр бүрхүүл
  if (intensity > 0.35) {
    ctx.globalAlpha = (intensity - 0.35) * 0.35 * shimmer;
    ctx.fillStyle = "rgba(90,160,230,0.55)";
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.fill();
  }

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
  const cut = Math.min(6, height / 2 + 1);
  const meterPath = (meterWidth: number): void => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + meterWidth - cut, y);
    ctx.lineTo(x + meterWidth, y + height / 2);
    ctx.lineTo(x + meterWidth - cut, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  };

  meterPath(width + 6);
  ctx.fillStyle = "#35231d";
  ctx.fill();
  ctx.strokeStyle = "#8d5a35";
  ctx.lineWidth = 2;
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
    ctx.fillRect(x, y + 1, fillWidth, Math.max(1, height * 0.28));
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, y + height - 2, fillWidth, 2);
    ctx.restore();
  }
}

type HudMeterIcon = "heart" | "bolt" | "steak" | "snow";

/** Баруудын зүүн талд — амь / стамина / өлсгөлөн / даарах */
function drawHudMeterIcon(
  ctx: CanvasRenderingContext2D,
  kind: HudMeterIcon,
  cx: number,
  cy: number,
  size: number,
): void {
  const s = size / 16;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  if (kind === "heart") {
    ctx.fillStyle = "#e84840";
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-1, 2.5, -7.5, -1.5, -7.5, -5);
    ctx.bezierCurveTo(-7.5, -8.2, -5, -10, -2.2, -10);
    ctx.bezierCurveTo(-0.6, -10, 0.6, -9.2, 0, -7.8);
    ctx.bezierCurveTo(-0.6, -9.2, 0.6, -10, 2.2, -10);
    ctx.bezierCurveTo(5, -10, 7.5, -8.2, 7.5, -5);
    ctx.bezierCurveTo(7.5, -1.5, 1, 2.5, 0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,220,210,0.45)";
    ctx.beginPath();
    ctx.ellipse(-3.2, -5.5, 1.6, 1.1, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "bolt") {
    ctx.fillStyle = "#f0d040";
    ctx.beginPath();
    ctx.moveTo(1.5, -10);
    ctx.lineTo(-5.5, 1);
    ctx.lineTo(-0.5, 1);
    ctx.lineTo(-2.5, 10);
    ctx.lineTo(6.5, -2);
    ctx.lineTo(1.5, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(120,80,10,0.45)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  } else if (kind === "steak") {
    // 3D T-bone — зузаан хажуу, өөхний ирмэг, улаан мах, T яс
    const steakBlob = (ox: number, oy: number) => {
      ctx.beginPath();
      ctx.moveTo(-6.6 + ox, -1.4 + oy);
      ctx.bezierCurveTo(
        -8.8 + ox, -5.6 + oy,
        -5.4 + ox, -9.4 + oy,
        -0.4 + ox, -8.8 + oy,
      );
      ctx.bezierCurveTo(
        5.2 + ox, -8.2 + oy,
        9.0 + ox, -5.2 + oy,
        8.6 + ox, -0.4 + oy,
      );
      ctx.bezierCurveTo(
        8.2 + ox, 4.0 + oy,
        5.0 + ox, 7.0 + oy,
        0.6 + ox, 7.4 + oy,
      );
      ctx.bezierCurveTo(
        -4.0 + ox, 7.8 + oy,
        -8.2 + ox, 5.0 + oy,
        -8.2 + ox, 1.4 + oy,
      );
      ctx.bezierCurveTo(
        -8.2 + ox, 0.0 + oy,
        -7.8 + ox, 0.6 + oy,
        -6.6 + ox, -1.4 + oy,
      );
      ctx.closePath();
    };
    ctx.fillStyle = "#c4a06a";
    steakBlob(0.2, 3.2);
    ctx.fill();
    ctx.fillStyle = "#f0e2bc";
    steakBlob(0, 0);
    ctx.fill();
    ctx.fillStyle = "#8a2a1c";
    ctx.beginPath();
    ctx.moveTo(-5.0, -1.2);
    ctx.bezierCurveTo(-6.6, -4.4, -4.0, -7.2, -0.3, -6.8);
    ctx.bezierCurveTo(3.8, -6.4, 6.8, -4.0, 6.5, -0.4);
    ctx.bezierCurveTo(6.2, 3.0, 3.8, 5.2, 0.4, 5.5);
    ctx.bezierCurveTo(-3.0, 5.8, -6.2, 3.6, -6.2, 0.8);
    ctx.bezierCurveTo(-6.2, -0.2, -5.8, 0.2, -5.0, -1.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f6eed8";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(-2.5, -3.8);
    ctx.lineTo(-0.9, 3.4);
    ctx.moveTo(-1.7, -0.3);
    ctx.lineTo(4.8, 0.4);
    ctx.stroke();
  } else {
    // Цас
    ctx.strokeStyle = "#7ec8ff";
    ctx.fillStyle = "#a8dcff";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -8, Math.sin(a) * -8);
      ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/** Гэрийн тооно — тэнгэрээр нар/сар явж цаг харуулна */
function drawRoundClock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  timeOfDay: number,
  dayNumber: number,
): void {
  const hours = ((timeOfDay % 24) + 24) % 24;
  const orange = "#e85820";
  const orangeDeep = "#c04014";
  const orangeLite = "#f87838";
  const patBlue = "#4ab0d8";
  const patYellow = "#f0d050";
  const patGreen = "#5caa40";
  const patCream = "#f2e8d0";
  const rim = radius + 2;
  const skyR = radius - 5;
  const hubR = radius * 0.28;
  const isDay = hours >= 5.5 && hours < 20;

  // Нар: 5.5→20 зүүн→баруун нум; сар: шөнөөр ижил нум
  let bodyT: number;
  if (isDay) {
    bodyT = (hours - 5.5) / (20 - 5.5);
  } else {
    const nightH = hours >= 20 ? hours - 20 : hours + 4;
    bodyT = nightH / 9.5;
  }
  bodyT = Math.max(0, Math.min(1, bodyT));
  const bodyAngle = -Math.PI * 0.92 + bodyT * Math.PI * 1.84;
  const bodyDist = skyR * (0.22 + Math.sin(bodyT * Math.PI) * 0.38);
  const bodyX = Math.cos(bodyAngle) * bodyDist;
  const bodyY = Math.sin(bodyAngle) * bodyDist * 0.92;

  ctx.save();
  ctx.translate(cx, cy);

  // Сүүдэр
  ctx.fillStyle = "rgba(16,12,10,0.45)";
  ctx.beginPath();
  ctx.arc(2.5, 3.5, rim + 8, 0, Math.PI * 2);
  ctx.fill();

  // Гадна унь (тооноос радиал)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const x0 = Math.cos(a) * (rim - 1);
    const y0 = Math.sin(a) * (rim - 1);
    const x1 = Math.cos(a) * (rim + 11);
    const y1 = Math.sin(a) * (rim + 11);
    ctx.strokeStyle = i % 3 === 0 ? orangeDeep : orange;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (i % 4 === 0) {
      ctx.fillStyle = patBlue;
      ctx.beginPath();
      ctx.arc(x0 * 0.98, y0 * 0.98, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // —— Тэнгэр (clip) ——
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, skyR, 0, Math.PI * 2);
  ctx.clip();

  // Тэнгэрийн өнгө — цагаар
  let skyTop: string;
  let skyBot: string;
  if (hours >= 5.5 && hours < 7.5) {
    const t = (hours - 5.5) / 2;
    skyTop = lerpColor("#1a2048", "#4a90d0", t);
    skyBot = lerpColor("#e87840", "#87b8e8", t);
  } else if (hours >= 7.5 && hours < 17) {
    skyTop = "#3a8ad0";
    skyBot = "#7eb8ea";
  } else if (hours >= 17 && hours < 20) {
    const t = (hours - 17) / 3;
    skyTop = lerpColor("#3a8ad0", "#1a1840", t);
    skyBot = lerpColor("#e87840", "#2a1848", t);
  } else {
    skyTop = "#0c1028";
    skyBot = "#1a2048";
  }
  const skyGrad = ctx.createLinearGradient(0, -skyR, 0, skyR);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(1, skyBot);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-skyR, -skyR, skyR * 2, skyR * 2);

  // Шөнийн од
  if (!isDay) {
    for (let i = 0; i < 14; i++) {
      const a = (i * 2.4) % (Math.PI * 2);
      const d = ((i * 7) % 10) * 0.07 * skyR + skyR * 0.25;
      const sx = Math.cos(a) * d;
      const sy = Math.sin(a) * d * 0.9;
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(hours * 3 + i));
      ctx.fillStyle = `rgba(240,245,255,${twinkle})`;
      ctx.beginPath();
      ctx.arc(sx, sy, i % 3 === 0 ? 1.2 : 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Нар эсвэл сар
  if (isDay) {
    const sunGlow = ctx.createRadialGradient(bodyX, bodyY, 1, bodyX, bodyY, 16);
    sunGlow.addColorStop(0, "rgba(255,250,200,0.95)");
    sunGlow.addColorStop(0.35, "rgba(255,210,80,0.55)");
    sunGlow.addColorStop(1, "rgba(255,160,40,0)");
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(bodyX, bodyY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff6c8";
    ctx.beginPath();
    ctx.arc(bodyX, bodyY, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe070";
    ctx.beginPath();
    ctx.arc(bodyX - 1, bodyY - 1, 4.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const moonGlow = ctx.createRadialGradient(bodyX, bodyY, 1, bodyX, bodyY, 12);
    moonGlow.addColorStop(0, "rgba(200,220,255,0.55)");
    moonGlow.addColorStop(1, "rgba(120,140,200,0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(bodyX, bodyY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8eef8";
    ctx.beginPath();
    ctx.arc(bodyX, bodyY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // Сарны хавирга
    ctx.fillStyle = skyBot;
    ctx.beginPath();
    ctx.arc(bodyX + 2.2, bodyY - 1.2, 4.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // clip

  // Гадна цагираг
  ctx.strokeStyle = orangeDeep;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.arc(0, 0, rim, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = orange;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.arc(0, 0, rim, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = orangeLite;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, rim + 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = patCream;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, rim + 5.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = patBlue;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, 0, rim - 4.5, 0, Math.PI * 2);
  ctx.stroke();

  // Цагиргийн угалз цэгүүд
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const px = Math.cos(a) * rim;
    const py = Math.sin(a) * rim;
    ctx.fillStyle =
      i % 3 === 0 ? patYellow : i % 3 === 1 ? patBlue : patGreen;
    ctx.beginPath();
    ctx.arc(px, py, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 8 хараац
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x0 = Math.cos(a) * (hubR + 1);
    const y0 = Math.sin(a) * (hubR + 1);
    const x1 = Math.cos(a) * (rim - 5);
    const y1 = Math.sin(a) * (rim - 5);
    ctx.strokeStyle = orangeDeep;
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = orange;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    // Хээ
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    ctx.fillStyle = i % 2 === 0 ? patBlue : patYellow;
    ctx.beginPath();
    ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = patCream;
    ctx.beginPath();
    ctx.arc(x0 + (x1 - x0) * 0.72, y0 + (y1 - y0) * 0.72, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Дотор цагираг (hub)
  ctx.strokeStyle = orangeDeep;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, hubR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = orangeLite;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, hubR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = patBlue;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 0, hubR - 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = orange;
  ctx.beginPath();
  ctx.arc(0, 0, hubR - 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff2cc";
  ctx.strokeStyle = "#241813";
  ctx.lineWidth = 2.5;
  ctx.font = "bold 9px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const dayLabel = `${dayNumber}`;
  ctx.strokeText(dayLabel, 0, 0.5);
  ctx.fillText(dayLabel, 0, 0.5);

  ctx.restore();
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ] as const;
  };
  const [r0, g0, b0] = parse(a);
  const [r1, g1, b1] = parse(b);
  const r = Math.round(r0 + (r1 - r0) * t);
  const g = Math.round(g0 + (g1 - g0) * t);
  const bl = Math.round(b0 + (b1 - b0) * t);
  return `rgb(${r},${g},${bl})`;
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
  icon: GameIconId,
  active = false,
): void {
  const r = 6;
  // Гадна хүрээ
  const rim = ctx.createLinearGradient(x, y, x, y + size);
  rim.addColorStop(0, active ? "#c49a4a" : "#8a6a42");
  rim.addColorStop(1, active ? "#6a4820" : "#4a3220");
  ctx.fillStyle = rim;
  roundRectPath(ctx, x, y, size, size, r);
  ctx.fill();

  // Дотор хонхор
  const inset = 2.5;
  const well = ctx.createLinearGradient(x, y, x, y + size);
  well.addColorStop(0, active ? "#4a3018" : "#1a120c");
  well.addColorStop(0.45, active ? "#3a2414" : "#14100c");
  well.addColorStop(1, active ? "#5a3820" : "#221810");
  ctx.fillStyle = well;
  roundRectPath(
    ctx,
    x + inset,
    y + inset,
    size - inset * 2,
    size - inset * 2,
    r - 2,
  );
  ctx.fill();

  if (active) {
    ctx.strokeStyle = "rgba(255,220,120,0.85)";
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, x + 1, y + 1, size - 2, size - 2, r - 1);
    ctx.stroke();
  }

  drawGameIcon(ctx, icon, x + size / 2, y + size * 0.4, size * 0.66);
  ctx.font = "bold 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = active ? "#ffe090" : "#e8c56a";
  ctx.fillText(key, x + size / 2, y + size - 4);
  ctx.textAlign = "left";
}

function drawInventoryPanel(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  if (!state.inventoryOpen) return;
  if (
    state.phase !== "playing" &&
    state.phase !== "spirit" &&
    state.phase !== "ger"
  ) {
    return;
  }

  const { player } = state;
  const inv = player.inventory;
  const items: Array<{ icon: GameIconId; label: string; val: string }> = [
    {
      icon: "wood",
      label: t("inv.wood"),
      val: state.unlimitedWood ? "∞" : String(inv.wood),
    },
    { icon: "stone", label: t("inv.stone"), val: String(inv.stone) },
    { icon: "arrow", label: t("inv.arrows"), val: String(inv.arrows) },
    { icon: "berry", label: t("inv.berries"), val: String(inv.berries) },
    { icon: "fish", label: t("inv.fish"), val: String(inv.fish) },
    { icon: "hay", label: t("inv.hay"), val: String(inv.hay) },
    { icon: "wool", label: t("inv.wool"), val: String(inv.wool) },
    { icon: "cashmere", label: t("inv.cashmere"), val: String(inv.cashmere) },
    { icon: "milk", label: t("inv.milk"), val: String(inv.milk) },
    { icon: "felt", label: t("inv.felt"), val: String(inv.felt) },
    { icon: "aaruul", label: t("inv.aaruul"), val: String(inv.aaruul) },
  ];
  if (state.story.spiritOvooSoulCollected || state.spiritPoints > 0) {
    items.push({
      icon: "spiritWater",
      label: t("inv.spiritWater"),
      val: String(state.spiritPoints),
    });
  }

  const cols = 4;
  const cell = 68;
  const gapX = 12;
  const gapY = 26;
  const padX = 22;
  const padTop = 52;
  const padBot = 36;
  const rows = Math.ceil(items.length / cols);
  const panelW = padX * 2 + cols * cell + (cols - 1) * gapX;
  const panelH = padTop + rows * cell + (rows - 1) * gapY + padBot;
  const px = (VIEW_W - panelW) / 2;
  const py = (VIEW_H - panelH) / 2 - 12;

  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawFrostedGlassPanel(ctx, px, py, panelW, panelH, 12);

  ctx.textAlign = "center";
  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillText(t("hud.inventory"), VIEW_W / 2, py + 28);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillText(t("hud.inventoryHint"), VIEW_W / 2, py + panelH - 14);

  items.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = px + padX + col * (cell + gapX);
    const y = py + padTop + row * (cell + gapY);
    drawHotSlot(ctx, x, y, cell, it.val, it.icon, false);
    ctx.fillStyle = "#d8c898";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(it.label, x + cell / 2, y + cell + 12);
  });
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
  // Баригдаагүй морь
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
  // Чоно / баавгай
  for (const w of state.world.wolves) {
    ctx.fillStyle = w.kind === "bear" ? "#a07040" : "#b0b4b8";
    ctx.fillRect(mx + w.pos.x * sx - 2, my + w.pos.y * sy - 2, 4, 4);
  }
  // Хулгайч
  ctx.fillStyle = "#a050d8";
  for (const t of state.world.thieves) {
    ctx.fillRect(mx + t.pos.x * sx - 2, my + t.pos.y * sy - 2, 4, 4);
  }
  // Эхний замын дайснууд — зөвхөн шулмасын сүнсэнд
  if (inShulmasSpirit(state)) {
    ctx.fillStyle = "#ff9b55";
    for (const enemy of state.world.firstRoute.enemies) {
      if (!enemy.alive || !enemy.engaged) continue;
      if (enemy.kind === "zurgaanNar") continue;
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
    threats.push({
      pos: w.pos,
      color: w.kind === "bear" ? "#a87848" : "#b0b4b8",
    });
  for (const t of state.world.thieves)
    threats.push({ pos: t.pos, color: "#a050d8" });
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
  const r = 11;
  // Зөөлөн сүүдэр
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRectPath(ctx, b.x + 1.5, b.y + 2.5, b.w, b.h, r);
  ctx.fill();

  // Модон/арьсан өнгөөр
  const fill = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
  if (selected) {
    fill.addColorStop(0, "rgba(120,80,28,0.95)");
    fill.addColorStop(0.45, "rgba(70,45,16,0.96)");
    fill.addColorStop(1, "rgba(42,28,10,0.98)");
  } else {
    fill.addColorStop(0, "rgba(38,28,18,0.92)");
    fill.addColorStop(0.5, "rgba(18,14,10,0.94)");
    fill.addColorStop(1, "rgba(12,10,8,0.96)");
  }
  ctx.fillStyle = fill;
  roundRectPath(ctx, b.x, b.y, b.w, b.h, r);
  ctx.fill();

  // Дээд гэрэл
  ctx.fillStyle = selected
    ? "rgba(255,220,140,0.14)"
    : "rgba(255,230,180,0.06)";
  roundRectPath(ctx, b.x + 2, b.y + 2, b.w - 4, b.h * 0.42, r - 2);
  ctx.fill();

  // Гадна хүрээ
  ctx.strokeStyle = selected ? "#e8c56a" : "rgba(232,197,106,0.32)";
  ctx.lineWidth = selected ? 2.2 : 1.2;
  roundRectPath(ctx, b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, r);
  ctx.stroke();

  // Дотор нимгэн шугам
  ctx.strokeStyle = selected
    ? "rgba(255,230,160,0.35)"
    : "rgba(232,197,106,0.12)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, b.x + 3.5, b.y + 3.5, b.w - 7, b.h - 7, r - 3);
  ctx.stroke();

  ctx.fillStyle = selected ? "#ffe9a0" : COLORS.hudText;
  ctx.font = "600 17px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 0.5);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

/** Авдар/урлалын мөр дээрх icon-ийн жижиг хүрээ */
function drawItemIconWell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  icon: GameIconId,
  selected: boolean,
): void {
  const half = size / 2;
  const x = cx - half;
  const y = cy - half;
  const fill = ctx.createLinearGradient(x, y, x, y + size);
  fill.addColorStop(0, selected ? "#5a3c1c" : "#2a1c12");
  fill.addColorStop(1, selected ? "#3a2810" : "#16100a");
  ctx.fillStyle = fill;
  roundRectPath(ctx, x, y, size, size, 7);
  ctx.fill();
  ctx.strokeStyle = selected ? "#e8c56a" : "rgba(232,197,106,0.35)";
  ctx.lineWidth = selected ? 1.6 : 1;
  roundRectPath(ctx, x, y, size, size, 7);
  ctx.stroke();
  drawGameIcon(ctx, icon, cx, cy, size * 0.72);
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
  ctx.fillText(t("common.backHint"), VIEW_W / 2, y);
  ctx.textAlign = "left";
}

export function drawMenuMain(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(t("menu.eyebrow"), VIEW_W / 2, 106);
  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 58px system-ui, sans-serif";
  ctx.fillText(t("menu.title"), VIEW_W / 2, 166);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillText(t("menu.subtitle"), VIEW_W / 2, 200);
  ctx.textAlign = "left";

  const btns = mainMenuButtons();
  btns.forEach((b, i) => drawUiButton(ctx, b, i === state.menuIndex));

  drawRecordsPanel(ctx);
}

export function drawMenuStoryChoice(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  drawMenuTitle(ctx, t("menu.storyChoiceTitle"));
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(t("menu.storyChoiceHint"), VIEW_W / 2, 210);
  ctx.textAlign = "left";

  const btns = storyChoiceButtons();
  btns.forEach((b, i) => drawUiButton(ctx, b, i === state.menuIndex));
  drawBackHint(ctx, VIEW_H - 36);
}

/** Өөрийн дээд амжилтууд — үндсэн цэсний баруун доод хэсэгт */
function recordsPanelRect(): { x: number; y: number; w: number; h: number } {
  const rows = 3;
  const w = 210;
  const h = 26 + rows * 20 + 12;
  return {
    w,
    h,
    x: VIEW_W - w - 20,
    y: VIEW_H - h - 20,
  };
}

/** Цэсний харанхуй бүрхүүл — шаардлагатай бол нэг цонхны нүх үлдээнэ */
function fillMenuDim(
  ctx: CanvasRenderingContext2D,
  hole: { x: number; y: number; w: number; h: number } | null,
): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "rgba(10,8,6,0.85)");
  g.addColorStop(1, "rgba(10,8,6,0.62)");
  ctx.fillStyle = g;
  if (!hole) {
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }
  const { x, y, w, h } = hole;
  // Дөрвөн хэсгээр нүх үлдээнэ — frosted panel ард газрыг шууд харна
  if (y > 0) ctx.fillRect(0, 0, VIEW_W, y);
  if (y + h < VIEW_H) ctx.fillRect(0, y + h, VIEW_W, VIEW_H - (y + h));
  if (x > 0) ctx.fillRect(0, y, x, h);
  if (x + w < VIEW_W) ctx.fillRect(x + w, y, VIEW_W - (x + w), h);
}

function drawRecordsPanel(ctx: CanvasRenderingContext2D): void {
  if (!hasAnyRecord()) return;

  const r = loadRecords();
  const rows: Array<[string, number]> = [
    [t("records.days"), r.bestDays],
    [t("records.livestock"), r.bestLivestock],
    [t("records.coins"), r.bestCoins],
  ];
  const { x, y, w, h } = recordsPanelRect();

  // Меню dim-ийн нүхэнд үлдсэн газрыг бүрсийтэй шилээр харуулна
  drawFrostedGlassPanel(ctx, x, y, w, h, 10);

  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.hudAccent;
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillText(t("records.title"), x + 14, y + 22);

  rows.forEach(([label, value], i) => {
    const ly = y + 44 + i * 20;
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(label, x + 14, ly);
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText(String(value), x + w - 14, ly);
  });
  ctx.textAlign = "left";
}

/** Меню — үндсэн, тохиргоо, удирдлага, багийнхан дэлгэцүүд */
export function drawMenu(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const hole =
    state.menuScreen === "main" && hasAnyRecord()
      ? recordsPanelRect()
      : null;
  fillMenuDim(ctx, hole);

  if (state.menuScreen === "main") drawMenuMain(ctx, state);
  else if (state.menuScreen === "storyChoice") drawMenuStoryChoice(ctx, state);
  else if (state.menuScreen === "settings") drawMenuSettings(ctx, state);
  else if (state.menuScreen === "controls") drawMenuControls(ctx);
  else drawMenuCredits(ctx);
}

export function drawMenuSettings(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  drawMenuTitle(ctx, t("settings.title"));

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

  // Хэлний мөр — түвшний зурвас биш, сонголтын товч
  const langSel = state.menuIndex === SETTINGS_LANG_ROW;
  const lb = lay.language.bar;
  ctx.textAlign = "right";
  ctx.fillStyle = langSel ? "#e8c56a" : COLORS.hudText;
  ctx.font = langSel
    ? "600 15px system-ui, sans-serif"
    : "15px system-ui, sans-serif";
  ctx.fillText(lay.language.label, lb.x - 22, lb.y + lb.h / 2 + 5);
  ctx.textAlign = "left";

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRectPath(ctx, lb.x, lb.y, lb.w, lb.h, 9);
  ctx.fill();
  ctx.strokeStyle = langSel ? "#e8c56a" : "rgba(232,197,106,0.3)";
  ctx.lineWidth = langSel ? 2 : 1;
  roundRectPath(ctx, lb.x, lb.y, lb.w, lb.h, 9);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = langSel ? "#e8c56a" : COLORS.hudText;
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText(`‹ ${lb.label} ›`, lb.x + lb.w / 2, lb.y + lb.h / 2 + 5);
  ctx.textAlign = "left";

  drawUiButton(ctx, lay.back, state.menuIndex === SETTINGS_BACK_ROW);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(t("settings.hint"), VIEW_W / 2, 470);
  ctx.textAlign = "left";
}

export function drawMenuControls(ctx: CanvasRenderingContext2D): void {
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillText(t("controls.title"), VIEW_W / 2, 72);
  ctx.textAlign = "left";

  const lines: Array<[string, string]> = [
    ["WASD", t("controls.walk")],
    ["J", t("controls.attack")],
    ["K", t("controls.bow")],
    ["Shift", t("controls.dodge")],
    ["L", t("controls.parry")],
    ["1 / 2", t("controls.weapon")],
    ["E", t("controls.interact")],
    ["Q", t("controls.eat")],
    ["F", t("controls.fire")],
    ["B", t("controls.fence")],
    ["N", t("controls.herd")],
    ["G", t("controls.packGer")],
    ["H", t("controls.horse")],
    ["Tab", t("controls.inventory")],
  ];

  const cols = 2;
  const perCol = Math.ceil(lines.length / cols);
  const rowH = 24;
  const padX = 16;
  const padY = 14;
  const boxW = Math.min(820, VIEW_W - 48);
  const boxH = perCol * rowH + padY * 2;
  const bx = (VIEW_W - boxW) / 2;
  const by = 92;
  const colW = (boxW - padX * 2) / cols;
  const keyColW = 78;

  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, bx, by, boxW, boxH, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.25)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, bx, by, boxW, boxH, 10);
  ctx.stroke();

  lines.forEach(([key, desc], i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x0 = bx + padX + col * colW;
    const ly = by + padY + 16 + row * rowH;
    const descMaxW = colW - keyColW - 12;

    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.hudAccent;
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText(key, x0 + keyColW, ly);

    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "12px system-ui, sans-serif";
    let text = desc;
    if (ctx.measureText(text).width > descMaxW) {
      while (text.length > 1 && ctx.measureText(`${text}…`).width > descMaxW) {
        text = text.slice(0, -1);
      }
      text = `${text}…`;
    }
    ctx.fillText(text, x0 + keyColW + 10, ly);
  });

  drawBackHint(ctx, Math.min(VIEW_H - 24, by + boxH + 28));
}

export function drawMenuCredits(ctx: CanvasRenderingContext2D): void {
  drawMenuTitle(ctx, t("credits.title"));

  const lines: Array<[string, string]> = [
    [t("credits.core"), "Цолмон"],
    [t("credits.survival"), "Мянганнаст"],
    [t("credits.enemyAi"), "Билгүүнтөгс"],
    [t("credits.combat"), "Баярцогт"],
    [t("credits.art"), "Номин"],
    [t("credits.uiSound"), "Тэмүүлэн"],
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

function drawBannerAlert(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const alert = state.bannerAlert;
  if (!alert || alert.timer <= 0) return;
  if (
    state.phase !== "playing" &&
    state.phase !== "spirit" &&
    state.phase !== "ger"
  ) {
    return;
  }

  const duration = Math.max(0.1, alert.duration);
  const elapsed = duration - alert.timer;
  const fadeIn = clamp(elapsed / 0.18, 0, 1);
  const fadeOut = clamp(alert.timer / 0.5, 0, 1);
  const alpha = fadeIn * fadeOut;
  if (alpha <= 0.01) return;

  const pulse = 0.92 + Math.sin(state.world.elapsed * 6) * 0.08;
  const isHunger = alert.kind === "hunger";
  const isCold = alert.kind === "cold";
  const isDanger = alert.kind === "danger";
  const isWolf = alert.kind === "wolf";
  const isThief = alert.kind === "thief";
  const isBear = alert.kind === "bear";
  const fill = isCold
    ? "#b8e4ff"
    : isHunger
      ? "#ffe566"
      : isWolf
        ? "#d0d2d6"
        : isThief
          ? "#d4a0ff"
          : isBear
            ? "#d4a574"
            : isDanger
              ? "#ffb080"
              : "#ff8a8a";
  const tint = isCold
    ? "rgba(6,24,48,1)"
    : isHunger
      ? "rgba(72,28,4,1)"
      : isWolf
        ? "rgba(22,24,28,1)"
        : isThief
          ? "rgba(36,8,48,1)"
          : isBear
            ? "rgba(42,24,10,1)"
            : isDanger
              ? "rgba(70,18,8,1)"
              : "rgba(70,8,8,1)";
  const edge = isCold
    ? "rgba(140,210,255,1)"
    : isHunger
      ? "rgba(255,210,70,1)"
      : isWolf
        ? "rgba(170,175,180,1)"
        : isThief
          ? "rgba(170,80,230,1)"
          : isBear
            ? "rgba(160,110,55,1)"
            : "rgba(255,90,90,1)";
  // Өлсгөлөн/даарах — илүү тод; дайсан анхааруулга бага зэрэг зөөлөн
  const softAlert = isHunger || isCold;
  const tintA = softAlert ? 0.4 : 0.22;
  const edgeA = softAlert ? 0.62 : 0.35;

  ctx.save();
  ctx.globalAlpha = alpha * tintA * pulse;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const border = 14 + Math.sin(state.world.elapsed * 7) * 2;
  ctx.globalAlpha = alpha * edgeA * pulse;
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VIEW_W, border);
  ctx.fillRect(0, VIEW_H - border, VIEW_W, border);
  ctx.fillRect(0, 0, border, VIEW_H);
  ctx.fillRect(VIEW_W - border, 0, border, VIEW_H);

  const text = tr(alert.text);
  const fontSize = Math.min(72, Math.max(36, VIEW_W * 0.085));
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
  const cx = VIEW_W / 2;
  const cy = VIEW_H * 0.4;
  // Текст илүү тод — хар хүрээ
  ctx.lineWidth = Math.max(4, fontSize * 0.08);
  ctx.strokeStyle = softAlert
    ? "rgba(0,0,0,0.75)"
    : "rgba(0,0,0,0.45)";
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = fill;
  ctx.fillText(text, cx, cy);

  ctx.font = `700 ${Math.max(16, fontSize * 0.28)}px system-ui, sans-serif`;
  ctx.fillStyle = softAlert
    ? "rgba(255,255,255,0.95)"
    : "rgba(255,255,255,0.82)";
  const sub = isCold
    ? tr("F — гал асаа · гэртээ дулаац")
    : isHunger
      ? tr("Q дарж ид · эсвэл малдаа өвс өг")
      : tr("Бэлэн бай — хамгаал!");
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 3;
  if (softAlert) ctx.strokeText(sub, cx, cy + fontSize * 0.7);
  ctx.fillText(sub, cx, cy + fontSize * 0.7);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

export function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { player, world } = state;
  const pad = 14;

  // Эхлэх меню — HUD-ын оронд зөвхөн меню харуулна
  if (state.phase === "menu") {
    drawMenu(ctx, state);
    return;
  }

  // —— Зүүн дээд: character portrait + HP/stamina/hunger/warmth ——
  const portraitX = pad + 34;
  const portraitY = pad + 42;
  const portraitRadius = 29;
  // Баруудын зүүн үзүүр аватарын доор; icon — баруун үзүүрт
  const barX = portraitX - 10;
  const barW = 168;
  const barH = 10;
  const barStep = 13;
  const barCount = 4;
  const stackH = barH + (barCount - 1) * barStep;
  const barStartY = portraitY - stackH / 2;
  const iconGap = 12;
  const meters: Array<{
    width: number;
    ratio: number;
    color: string;
    icon: HudMeterIcon;
  }> = [
    {
      width: barW,
      ratio: player.vitals.health / player.vitals.maxHealth,
      color: "#d43830",
      icon: "heart",
    },
    {
      width: barW - 20,
      ratio: player.stamina / Math.max(1, player.maxStamina),
      color: "#e8c040",
      icon: "bolt",
    },
    {
      width: barW - 40,
      ratio: player.vitals.hunger / player.vitals.maxHunger,
      color: "#b04030",
      icon: "steak",
    },
    {
      width: barW - 60,
      ratio: player.vitals.warmth / Math.max(1, player.vitals.maxWarmth),
      color: "#5eb0e8",
      icon: "snow",
    },
  ];
  meters.forEach((m, i) => {
    const my = barStartY + barStep * i;
    drawHudMeter(ctx, barX, my, m.width, barH, m.ratio, m.color);
    // Бар бүрийн баруун үзүүрийн хажууд
    drawHudMeterIcon(ctx, m.icon, barX + m.width + iconGap, my + barH / 2, 13);
  });
  drawHudPortrait(ctx, state, portraitX, portraitY, portraitRadius);

  // —— Баруун дээд: Монгол гэрийн тооно — нар/сараар цаг ——
  const clockX = VIEW_W - pad - 52;
  const clockY = pad + 52;
  drawRoundClock(ctx, clockX, clockY, 40, world.timeOfDay, world.dayNumber);

  if (!state.story.activeMainObjective) {
    const route = world.firstRoute;
    const routeText = world.tumurShulmas.defeated
      ? "Төмөр шулмас дарагдав"
      : world.tumurShulmas.active
        ? trFormat("Төмөр шулмас · Үе {n}", {
            n: world.tumurShulmas.bossPhase,
          })
        : route.bossDefeated
          ? route.swordDrop.collected
            ? "Хар төмөр хаалга нээгдсэн"
            : "Mini-boss унав · Сэлмээ ав"
          : route.bossStarted
            ? "Mini-boss · Шулмасын баатар"
            : route.complete
              ? "Хараалт хаалга нээгдсэн"
              : trFormat("Эхний зам {have}/{total}", {
                  have: route.defeated,
                  total: route.total,
                });
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
  }
  drawMainObjectivePanel(ctx, state);

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

  const slots: Array<{ key: string; icon: GameIconId; active: boolean }> = [
    { key: "J", icon: "punch", active: player.combatPhase !== "idle" },
    {
      key: "K",
      icon: player.gear.bow ? "bow" : "empty",
      active: !!state.input.shoot,
    },
    { key: "⇧", icon: "dodge", active: player.dodgePhase !== "idle" },
    { key: "L", icon: "shield", active: player.parryPhase !== "idle" },
    { key: "E", icon: "hand", active: false },
    { key: "Q", icon: "berry", active: false },
    {
      key: "F",
      icon: "fire",
      active: world.campfire.lit || world.campfire.igniting > 0,
    },
    { key: "B", icon: "fence", active: state.fencePreview },
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

  // Нөөц — зөвхөн Tab авдарт (баруун доод мөр байхгүй)
  let lx = barX;
  const ly = portraitY + portraitRadius + 26;
  if (player.gear.horse) {
    drawGameIcon(
      ctx,
      player.riding ? "horseRide" : "horse",
      lx + 7,
      ly - 4,
      14,
    );
    lx += 26;
  }
  for (const k of LIVESTOCK_KINDS) {
    const n = world.flock.counts[k];
    if (n <= 0) continue;
    drawGameIcon(ctx, LIVESTOCK_ICON[k], lx + 7, ly - 4, 14);
    lx += 16;
    ctx.fillStyle = "#c8e0a8";
    ctx.font = "bold 10px 'Courier New', monospace";
    const num = String(n);
    ctx.fillText(num, lx, ly);
    lx += ctx.measureText(num).width + 10;
  }

  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillText(
    `${t("hud.day")} ${world.dayNumber} · ${state.unlimitedCoins ? "∞" : state.score}`,
    barX,
    ly + 14,
  );

  ctx.fillStyle = "#d8c898";
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillText(
    `${t("hud.wool")}${player.inventory.wool} ${t("hud.cashmere")}${player.inventory.cashmere} ${t("hud.milk")}${player.inventory.milk}`,
    barX,
    ly + 28,
  );
  ctx.fillStyle = "#a8c8e8";
  ctx.fillText(`${t("hud.trough")} ${Math.floor(world.feeder.hay)}`, barX, ly + 42);

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
      `${nearFence.isGate ? `${t("hud.gate")} ` : ""}${tr(FENCE_TIER_SHORT[tier])} ${hpPct}%`,
      barX,
      ly + 70,
    );
  }

  if (world.wolves.length > 0 || world.thieves.length > 0) {
    const parts: string[] = [];
    if (world.wolves.length)
      parts.push(trFormat("Чоно {n}", { n: world.wolves.length }));
    if (world.thieves.length) {
      const stolen = world.thieves.reduce((s, t) => s + t.stolen, 0);
      parts.push(trFormat("Хулгайч (−{n})", { n: stolen }));
    }
    const text = parts.join("  ·  ");
    const onlyThief = world.wolves.length === 0 && world.thieves.length > 0;
    const onlyWolf = world.wolves.length > 0 && world.thieves.length === 0;
    ctx.font = "bold 13px 'Courier New', monospace";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = onlyThief
      ? "rgba(48,12,64,0.88)"
      : onlyWolf
        ? "rgba(32,34,38,0.88)"
        : "rgba(40,20,48,0.88)";
    ctx.fillRect(VIEW_W / 2 - tw / 2 - 12, pad, tw + 24, 26);
    ctx.strokeStyle = onlyThief
      ? "#a050d8"
      : onlyWolf
        ? "#b0b4b8"
        : "#c080ff";
    ctx.strokeRect(VIEW_W / 2 - tw / 2 - 12.5, pad + 0.5, tw + 23, 25);
    ctx.fillStyle = onlyThief
      ? "#e0b8ff"
      : onlyWolf
        ? "#d8dce0"
        : "#e8d0ff";
    ctx.fillText(text, VIEW_W / 2 - tw / 2, pad + 18);
  }

  if (
    state.messageTimer > 0 &&
    state.message &&
    (state.phase === "playing" ||
      state.phase === "spirit" ||
      state.phase === "ger")
  ) {
    const alpha = clamp(state.messageTimer / 0.4, 0, 1);
    ctx.font = "13px 'Courier New', monospace";
    // Төлөвт монголоор хадгалж, зурахдаа орчуулна — хэл солиход шууд өөрчлөгдөнө
    const message = tr(state.message);
    const maxToastW = Math.min(VIEW_W - 48, 520);
    const words = message.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxToastW) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    const clamped = lines.slice(0, 3);
    if (lines.length > 3) {
      const last = clamped[2] ?? "";
      clamped[2] =
        last.length > 2 ? `${last.slice(0, Math.max(1, last.length - 1))}…` : "…";
    }
    const lineH = 16;
    const padX = 12;
    const padY = 8;
    const boxW =
      Math.max(...clamped.map((l) => ctx.measureText(l).width), 40) + padX * 2;
    const boxH = padY * 2 + clamped.length * lineH - 2;
    const mx = (VIEW_W - boxW) / 2;
    const my = VIEW_H - 108 - Math.max(0, (clamped.length - 1) * lineH);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(12,10,8,0.82)";
    ctx.fillRect(mx, my, boxW, boxH);
    ctx.strokeStyle = "rgba(232,197,106,0.45)";
    ctx.strokeRect(mx + 0.5, my + 0.5, boxW - 1, boxH - 1);
    ctx.fillStyle = COLORS.hudText;
    ctx.textAlign = "center";
    clamped.forEach((l, i) => {
      ctx.fillText(l, VIEW_W / 2, my + padY + 11 + i * lineH);
    });
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }

  drawBannerAlert(ctx, state);

  drawInventoryPanel(ctx, state);

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
      ctx.fillText(t("pause.title"), VIEW_W / 2, VIEW_H / 2 - 110);
      ctx.textAlign = "left";

      const btns = pauseMenuButtons();
      btns.forEach((b, i) => drawUiButton(ctx, b, state.pauseIndex === i));

      ctx.textAlign = "center";
      ctx.fillStyle = COLORS.hudMuted;
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(
        t("pause.hint"),
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
    ctx.fillText(`${t("hud.level")} ${state.level}!`, VIEW_W / 2, 120);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(t("hud.levelHint"), VIEW_W / 2, 152);

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
    const herdWin = won && state.winReason === "herd";
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = "center";
    ctx.fillStyle = won ? "#e8c56a" : "#ff8080";
    const titleSize = won ? 92 : 56;
    ctx.font = `900 ${titleSize}px system-ui, sans-serif`;
    ctx.fillText(
      won
        ? herdWin
          ? t("end.winHerd")
          : t("end.win")
        : t("end.lose"),
      VIEW_W / 2,
      VIEW_H / 2 - (won ? 48 : 30),
    );
    ctx.fillStyle = won ? "#ffe9a8" : COLORS.hudText;
    ctx.font = won
      ? "700 26px system-ui, sans-serif"
      : "16px system-ui, sans-serif";
    ctx.fillText(
      won
        ? herdWin
          ? t("end.winHerdSubtitle")
          : t("end.winSubtitle")
        : tr(state.message),
      VIEW_W / 2,
      VIEW_H / 2 + (won ? 18 : 8),
    );
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(
      `${t("hud.coins")} ${state.unlimitedCoins ? "∞" : state.score} · ${t("hud.livestock")} ${world.flock.total} · ${t("hud.day")} ${world.dayNumber}`,
      VIEW_W / 2,
      VIEW_H / 2 + (won ? 52 : 36),
    );
    ctx.fillText(
      won
        ? t("end.hint")
        : hasCompletedStory()
          ? t("end.loseHintSkip")
          : t("end.loseHint"),
      VIEW_W / 2,
      VIEW_H / 2 + (won ? 86 : 70),
    );
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
  ctx.fillText(t("chest.title"), VIEW_W / 2, panel.y + 40);
  ctx.textAlign = "left";

  rows.forEach((r, i) => {
    const item = chestItems()[i];
    if (!item) return;
    const have = inv[item.key];
    const selected = state.menuIndex === i;

    const rowFill = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    if (selected) {
      rowFill.addColorStop(0, "rgba(100,70,24,0.45)");
      rowFill.addColorStop(1, "rgba(40,28,10,0.55)");
    } else if (have > 0) {
      rowFill.addColorStop(0, "rgba(28,20,12,0.85)");
      rowFill.addColorStop(1, "rgba(12,10,8,0.75)");
    } else {
      rowFill.addColorStop(0, "rgba(16,12,8,0.45)");
      rowFill.addColorStop(1, "rgba(10,8,6,0.4)");
    }
    ctx.fillStyle = rowFill;
    roundRectPath(ctx, r.x, r.y, r.w, r.h, 9);
    ctx.fill();
    ctx.strokeStyle = selected ? "#e8c56a" : "rgba(232,197,106,0.22)";
    ctx.lineWidth = selected ? 1.8 : 1;
    roundRectPath(ctx, r.x, r.y, r.w, r.h, 9);
    ctx.stroke();

    drawItemIconWell(ctx, r.x + 26, r.y + r.h / 2, 32, item.icon, selected);

    ctx.fillStyle = selected ? "#e8c56a" : COLORS.hudText;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(item.name, r.x + 52, r.y + 20);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(item.desc, r.x + 52, r.y + 38);

    ctx.textAlign = "right";
    ctx.fillStyle = have > 0 ? "#ffd060" : "#a89880";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(
      have > 0 ? `×${have}` : t("chest.empty"),
      r.x + r.w - 14,
      r.y + 30,
    );
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
  ctx.fillText(t("craft.title"), VIEW_W / 2, panel.y + 40);
  ctx.textAlign = "left";

  const inv = state.player.inventory;
  const needIcon: Record<"wool" | "cashmere" | "milk" | "wood" | "stone", GameIconId> =
    {
      wool: "wool",
      cashmere: "cashmere",
      milk: "milk",
      wood: "wood",
      stone: "stone",
    };

  rows.forEach((r, i) => {
    const recipe = craftRecipes()[i];
    const selected = state.menuIndex === i;
    let can = true;
    for (const [k, need] of Object.entries(recipe.need)) {
      if (
        (inv[k as "wool" | "cashmere" | "milk" | "wood" | "stone"] ?? 0) <
        (need ?? 0)
      )
        can = false;
    }

    const rowFill = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    if (selected) {
      rowFill.addColorStop(0, "rgba(100,70,24,0.45)");
      rowFill.addColorStop(1, "rgba(40,28,10,0.55)");
    } else {
      rowFill.addColorStop(0, "rgba(28,20,12,0.85)");
      rowFill.addColorStop(1, "rgba(12,10,8,0.75)");
    }
    ctx.fillStyle = rowFill;
    roundRectPath(ctx, r.x, r.y, r.w, r.h, 9);
    ctx.fill();
    ctx.strokeStyle = selected ? "#e8c56a" : "rgba(232,197,106,0.22)";
    ctx.lineWidth = selected ? 1.8 : 1;
    roundRectPath(ctx, r.x, r.y, r.w, r.h, 9);
    ctx.stroke();

    drawItemIconWell(ctx, r.x + 28, r.y + r.h / 2, 34, recipe.icon, selected);

    ctx.fillStyle = selected ? "#e8c56a" : COLORS.hudText;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(recipe.name, r.x + 56, r.y + 18);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(recipe.desc, r.x + 56, r.y + 34);

    // Шаардлага — жижиг icon + тоо
    let nx = r.x + 56;
    const ny = r.y + r.h - 10;
    for (const [k, need] of Object.entries(recipe.need)) {
      const key = k as "wool" | "cashmere" | "milk" | "wood" | "stone";
      const have = inv[key] ?? 0;
      const enough = have >= (need ?? 0);
      drawGameIcon(ctx, needIcon[key], nx + 7, ny - 4, 14);
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.fillStyle = enough ? "#a0d890" : "#e07070";
      ctx.fillText(`×${need}`, nx + 16, ny);
      nx += 44;
    }

    ctx.textAlign = "right";
    ctx.fillStyle = can ? "#a0d890" : "#e07070";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(
      can ? t("craft.make") : t("craft.short"),
      r.x + r.w - 14,
      r.y + 30,
    );
    ctx.textAlign = "left";
  });

  drawUiButton(ctx, close, false);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
