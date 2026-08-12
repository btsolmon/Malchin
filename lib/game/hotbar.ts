// Minecraft шиг 4 нүхтэй hotbar — сонгоод ашиглана / богцоос онооно

import type { GameState } from "./types";
import { VIEW_H, VIEW_W } from "./types";
import { clamp, setMessage } from "./utils";
import { spawnParticles, spawnText } from "./effects";
import { sfx } from "./audio";
import { sipSpiritWater } from "./spirit";
import { t } from "./i18n";
import type { GameIconId } from "./icons";

export const HOTBAR_SIZE = 4;

export type HotbarItemId =
  | "melee"
  | "bow"
  | "fence"
  | "stone"
  | "berry"
  | "fish"
  | "aaruul"
  | "milk"
  | "spiritWater";

export interface HotbarCatalogEntry {
  /** Hotbar-т оноох id; null = хоослох эсвэл зөвхөн харах нөөц */
  id: HotbarItemId | null;
  icon: GameIconId;
  label: string;
  count: number | null;
  /** Hotbar-т оноож болох эсэх */
  assignable: boolean;
}

export function createDefaultHotbar(): Array<HotbarItemId | null> {
  // Нум — худалдаж авсны дараа богцоос онооно
  return ["melee", "fence", null, null];
}

export function hotbarIcon(id: HotbarItemId | null, hasSkySword: boolean): GameIconId {
  if (!id) return "empty";
  if (id === "melee") return hasSkySword ? "hand" : "punch";
  if (id === "bow") return "bow";
  if (id === "fence") return "wood";
  if (id === "stone") return "stone";
  if (id === "berry") return "berry";
  if (id === "fish") return "fish";
  if (id === "aaruul") return "aaruul";
  if (id === "milk") return "milk";
  return "spiritWater";
}

export function hotbarCount(state: GameState, id: HotbarItemId | null): number | null {
  if (!id) return null;
  const inv = state.player.inventory;
  if (id === "fence") return inv.wood;
  if (id === "bow") return inv.arrows;
  if (id === "stone") return inv.stone;
  if (id === "berry") return inv.berries;
  if (id === "fish") return inv.fish;
  if (id === "aaruul") return inv.aaruul;
  if (id === "milk") return inv.milk;
  if (id === "spiritWater") return state.spiritPoints;
  return null;
}

/** Богцод харагдах бүх зүйл (оноох + нөөц) */
export function listBagCatalog(state: GameState): HotbarCatalogEntry[] {
  const inv = state.player.inventory;
  const list: HotbarCatalogEntry[] = [
    {
      id: "melee",
      icon: hotbarIcon("melee", state.player.hasSkySword),
      label: state.player.hasSkySword ? t("hotbar.sword") : t("hotbar.fists"),
      count: null,
      assignable: true,
    },
    {
      id: "fence",
      icon: "wood",
      label: t("hotbar.fence"),
      count: inv.wood,
      assignable: true,
    },
  ];
  if (state.player.gear.bow || state.phase === "spirit") {
    list.push({
      id: "bow",
      icon: "bow",
      label: t("hotbar.bow"),
      count: inv.arrows,
      assignable: true,
    });
  }

  if (inv.stone > 0) {
    list.push({
      id: "stone",
      icon: "stone",
      label: t("inv.stone"),
      count: inv.stone,
      assignable: true,
    });
  }
  if (inv.hay > 0) {
    list.push({
      id: null,
      icon: "hay",
      label: t("inv.hay"),
      count: inv.hay,
      assignable: false,
    });
  }
  if (inv.wool > 0) {
    list.push({
      id: null,
      icon: "wool",
      label: t("inv.wool"),
      count: inv.wool,
      assignable: false,
    });
  }
  if (inv.cashmere > 0) {
    list.push({
      id: null,
      icon: "cashmere",
      label: t("inv.cashmere"),
      count: inv.cashmere,
      assignable: false,
    });
  }
  if (inv.felt > 0) {
    list.push({
      id: null,
      icon: "felt",
      label: t("inv.felt"),
      count: inv.felt,
      assignable: false,
    });
  }
  if (inv.berries > 0) {
    list.push({
      id: "berry",
      icon: "berry",
      label: t("consume.berry"),
      count: inv.berries,
      assignable: true,
    });
  }
  if (inv.fish > 0) {
    list.push({
      id: "fish",
      icon: "fish",
      label: t("consume.fish"),
      count: inv.fish,
      assignable: true,
    });
  }
  if (inv.aaruul > 0) {
    list.push({
      id: "aaruul",
      icon: "aaruul",
      label: t("consume.aaruul"),
      count: inv.aaruul,
      assignable: true,
    });
  }
  if (inv.milk > 0) {
    list.push({
      id: "milk",
      icon: "milk",
      label: t("consume.milk"),
      count: inv.milk,
      assignable: true,
    });
  }
  if (state.spiritPoints > 0) {
    list.push({
      id: "spiritWater",
      icon: "spiritWater",
      label: t("consume.spirit"),
      count: state.spiritPoints,
      assignable: true,
    });
  }

  // Хоослох
  list.push({
    id: null,
    icon: "empty",
    label: t("hotbar.clear"),
    count: null,
    assignable: true,
  });

  return list;
}

/** ←→ cycle-д зөвхөн оноох боломжтой зүйлс */
export function listHotbarCatalog(state: GameState): HotbarCatalogEntry[] {
  return listBagCatalog(state).filter((e) => e.assignable && e.id !== null);
}

function isConsumable(id: HotbarItemId): boolean {
  return (
    id === "berry" ||
    id === "fish" ||
    id === "aaruul" ||
    id === "milk" ||
    id === "spiritWater"
  );
}

function applyToolFromHotbar(state: GameState, id: HotbarItemId | null): void {
  const { player } = state;
  if (id === "melee") {
    player.tool = "melee";
    player.weapon = player.hasSkySword ? "skySword" : "staff";
    state.fencePreview = false;
  } else if (id === "fence") {
    player.tool = "fence";
  } else if (id === "bow") {
    player.tool = "bow";
    state.fencePreview = false;
  } else if (id === "stone") {
    player.tool = "stone";
    state.fencePreview = false;
  } else {
    // Хоол/хоосон — нум гарт үлдэхгүй
    player.tool = "melee";
    player.weapon = player.hasSkySword ? "skySword" : "staff";
    state.fencePreview = false;
  }
}

export function selectHotbarSlot(state: GameState, index: number): void {
  const i = clamp(index, 0, HOTBAR_SIZE - 1);
  state.hotbarSelected = i;
  applyToolFromHotbar(state, state.hotbar[i] ?? null);
  sfx("select");
}

/** Сонгосон нүхэнд каталогийн дараагийн зүйлийг онооно (хоосон оруулаад) */
export function cycleHotbarSlot(state: GameState, dir: 1 | -1): void {
  const catalog = listHotbarCatalog(state);
  const options: Array<HotbarItemId | null> = [null, ...catalog.map((c) => c.id)];
  const cur = state.hotbar[state.hotbarSelected] ?? null;
  let idx = options.indexOf(cur);
  if (idx < 0) idx = 0;
  const next = options[(idx + dir + options.length) % options.length] ?? null;
  state.hotbar[state.hotbarSelected] = next;
  applyToolFromHotbar(state, next);
  sfx("select");
}

export function assignHotbarFromCatalog(
  state: GameState,
  catalogIndex: number,
): void {
  const catalog = listBagCatalog(state);
  const entry = catalog[catalogIndex];
  if (!entry || !entry.assignable) return;
  state.hotbar[state.hotbarSelected] = entry.id;
  applyToolFromHotbar(state, entry.id);
  sfx("select");
}

function applyConsume(state: GameState, id: HotbarItemId): boolean {
  const { player } = state;
  if (player.eatCooldown > 0) return false;

  if (id === "spiritWater") return sipSpiritWater(state);

  if (id === "berry") {
    if (player.inventory.berries <= 0) return false;
    player.inventory.berries -= 1;
    player.vitals.hunger = clamp(
      player.vitals.hunger + 28,
      0,
      player.vitals.maxHunger,
    );
    player.vitals.health = clamp(
      player.vitals.health + 4,
      0,
      player.vitals.maxHealth,
    );
    player.eatCooldown = 0.5;
    sfx("eat");
    spawnParticles(
      state,
      { x: player.pos.x, y: player.pos.y - 16 },
      4,
      "#e04070",
      { speed: 40, gravity: -20, size: 2 },
    );
    spawnText(state, player.pos, "+28 хоол", "#ffd080");
    return true;
  }

  if (id === "fish") {
    if (player.inventory.fish <= 0) return false;
    player.inventory.fish -= 1;
    player.vitals.hunger = clamp(
      player.vitals.hunger + 36,
      0,
      player.vitals.maxHunger,
    );
    player.vitals.health = clamp(
      player.vitals.health + 20,
      0,
      player.vitals.maxHealth,
    );
    player.eatCooldown = 0.55;
    sfx("eat");
    spawnParticles(
      state,
      { x: player.pos.x, y: player.pos.y - 16 },
      5,
      "#6ab0e8",
      { speed: 40, gravity: -20, size: 2 },
    );
    spawnText(state, player.pos, "+36 хоол · +20 амь", "#7ec8ff");
    return true;
  }

  if (id === "aaruul") {
    if (player.inventory.aaruul <= 0) return false;
    player.inventory.aaruul -= 1;
    player.vitals.hunger = clamp(
      player.vitals.hunger + 40,
      0,
      player.vitals.maxHunger,
    );
    player.vitals.warmth = clamp(
      player.vitals.warmth + 8,
      0,
      player.vitals.maxWarmth,
    );
    player.eatCooldown = 0.5;
    sfx("eat");
    spawnText(state, player.pos, "+ааруул", "#f0e0b0");
    return true;
  }

  if (id === "milk") {
    if (player.inventory.milk <= 0) return false;
    player.inventory.milk -= 1;
    player.vitals.hunger = clamp(
      player.vitals.hunger + 24,
      0,
      player.vitals.maxHunger,
    );
    player.vitals.warmth = clamp(
      player.vitals.warmth + 10,
      0,
      player.vitals.maxWarmth,
    );
    player.eatCooldown = 0.45;
    sfx("eat");
    spawnText(state, player.pos, "+сүү", "#f4f0e0");
    return true;
  }

  return false;
}

/** Хоосон болсон / худалдаагүй зүйлийг цэвэрлэнэ */
export function pruneHotbar(state: GameState): void {
  const hasBow = state.player.gear.bow || state.phase === "spirit";
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    const id = state.hotbar[i];
    if (!id) continue;
    if (id === "bow" && !hasBow) {
      state.hotbar[i] = null;
      continue;
    }
    if (id === "stone" || isConsumable(id)) {
      const n = hotbarCount(state, id) ?? 0;
      if (n <= 0) state.hotbar[i] = null;
    }
  }
}

/** Q — сонгосон нүхний хоол/уухыг хэрэглэнэ */
export function useSelectedHotbarItem(state: GameState): boolean {
  const id = state.hotbar[state.hotbarSelected] ?? null;
  if (!id) {
    setMessage(state, t("hotbar.empty"), 1.4);
    return false;
  }
  if (!isConsumable(id)) {
    setMessage(state, t("hotbar.notConsumable"), 1.4);
    return false;
  }
  const ok = applyConsume(state, id);
  pruneHotbar(state);
  return ok;
}

/** Богц панелын layout — UI + click hit-test */
export function getInventoryCatalogLayout(state: GameState): {
  px: number;
  py: number;
  panelW: number;
  panelH: number;
  cols: number;
  cell: number;
  gapX: number;
  gapY: number;
  padX: number;
  padTop: number;
  catalog: HotbarCatalogEntry[];
} {
  const catalog = listBagCatalog(state);
  const cols = 4;
  const cell = 44;
  const gapX = 8;
  const gapY = 22;
  const padX = 20;
  const padTop = 52;
  const padBot = 36;
  const rows = Math.max(1, Math.ceil(Math.max(catalog.length, 1) / cols));
  const panelW = padX * 2 + cols * cell + (cols - 1) * gapX;
  const panelH = padTop + rows * cell + (rows - 1) * gapY + padBot;
  return {
    px: (VIEW_W - panelW) / 2,
    py: (VIEW_H - panelH) / 2 - 40,
    panelW,
    panelH,
    cols,
    cell,
    gapX,
    gapY,
    padX,
    padTop,
    catalog,
  };
}

function handleHotbarMouse(state: GameState): void {
  if (!state.input.mouseClicked) return;
  const { mouseX: mx, mouseY: my } = state.input;

  const lay = getHotbarLayout();
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    const x = lay.x + 6 + i * (lay.slot + lay.gap);
    const y = lay.y + 6;
    if (
      mx >= x &&
      mx <= x + lay.slot &&
      my >= y &&
      my <= y + lay.slot
    ) {
      selectHotbarSlot(state, i);
      state.input.mouseClicked = false;
      return;
    }
  }

  if (!state.inventoryOpen) return;
  const inv = getInventoryCatalogLayout(state);
  for (let i = 0; i < inv.catalog.length; i++) {
    const col = i % inv.cols;
    const row = Math.floor(i / inv.cols);
    const x = inv.px + inv.padX + col * (inv.cell + inv.gapX);
    const y = inv.py + inv.padTop + row * (inv.cell + inv.gapY);
    if (
      mx >= x &&
      mx <= x + inv.cell &&
      my >= y &&
      my <= y + inv.cell
    ) {
      state.hotbarInvIndex = i;
      assignHotbarFromCatalog(state, i);
      state.input.mouseClicked = false;
      return;
    }
  }
}

/**
 * Hotbar оролт:
 * - 1–4 / клик — нүх сонгох
 * - Tab богц: WASD/сум — сонго, Enter — оноо
 * - Богц хаалттай: ←→ зүйл солих
 * - Q — хоол/уух
 */
export function updateHotbar(state: GameState): void {
  const phaseOk =
    state.phase === "playing" ||
    state.phase === "spirit" ||
    state.phase === "ger";
  if (!phaseOk) return;

  pruneHotbar(state);
  handleHotbarMouse(state);

  if (state.input.skill1) selectHotbarSlot(state, 0);
  if (state.input.skill2) selectHotbarSlot(state, 1);
  if (state.input.skill3) selectHotbarSlot(state, 2);
  if (state.input.skill4) selectHotbarSlot(state, 3);

  applyToolFromHotbar(state, state.hotbar[state.hotbarSelected] ?? null);

  if (state.inventoryOpen) {
    const catalog = listBagCatalog(state);
    if (catalog.length > 0) {
      state.hotbarInvIndex = clamp(
        state.hotbarInvIndex,
        0,
        catalog.length - 1,
      );
      if (state.input.menuLeft) {
        state.hotbarInvIndex =
          (state.hotbarInvIndex + catalog.length - 1) % catalog.length;
        sfx("select");
      }
      if (state.input.menuRight) {
        state.hotbarInvIndex =
          (state.hotbarInvIndex + 1) % catalog.length;
        sfx("select");
      }
      if (state.input.menuUp) {
        state.hotbarInvIndex = Math.max(0, state.hotbarInvIndex - 4);
        sfx("select");
      }
      if (state.input.menuDown) {
        state.hotbarInvIndex = Math.min(
          catalog.length - 1,
          state.hotbarInvIndex + 4,
        );
        sfx("select");
      }
      if (state.input.confirm) {
        assignHotbarFromCatalog(state, state.hotbarInvIndex);
        state.input.confirm = false;
      }
    }
    state.input.left = false;
    state.input.right = false;
    state.input.up = false;
    state.input.down = false;
  } else {
    if (state.input.menuLeft && !state.input.left) {
      cycleHotbarSlot(state, -1);
    }
    if (state.input.menuRight && !state.input.right) {
      cycleHotbarSlot(state, 1);
    }
  }

  if (state.input.eat) {
    state.input.eat = false;
    useSelectedHotbarItem(state);
  }
}

export function getHotbarLayout(): {
  x: number;
  y: number;
  slot: number;
  gap: number;
  w: number;
  h: number;
} {
  const slot = 44;
  const gap = 6;
  const w = HOTBAR_SIZE * slot + (HOTBAR_SIZE - 1) * gap + 12;
  const h = slot + 12;
  return {
    x: (VIEW_W - w) / 2,
    y: VIEW_H - h - 14,
    slot,
    gap,
    w,
    h,
  };
}

export function syncToolFromHotbar(state: GameState): void {
  applyToolFromHotbar(state, state.hotbar[state.hotbarSelected] ?? null);
}

export function ensureHotbar(state: GameState): void {
  if (!Array.isArray(state.hotbar) || state.hotbar.length !== HOTBAR_SIZE) {
    state.hotbar = createDefaultHotbar();
  }
  state.hotbarSelected = clamp(state.hotbarSelected ?? 0, 0, HOTBAR_SIZE - 1);
  state.hotbarInvIndex = state.hotbarInvIndex ?? 0;
}
