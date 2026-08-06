// Авдар/өвгөний арилжааны бараа ба худалдан авалт

import { sfx } from "./audio";
import { addLivestock } from "./livestock";
import {
  LIVESTOCK_MN,
  type GameState,
  type GearId,
  type LivestockKind,
} from "./types";
import { pastureCenter, setMessage } from "./utils";

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
      key: "wool" | "cashmere" | "milk" | "felt" | "aaruul" | "fish";
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
    desc: "Сүргийг чононоос хамгаална",
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
    name: "Нум",
    desc: "Харвах — сум хэрэгтэй (урлалаар хийнэ)",
    price: 400,
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
    desc: "Зэрлэг морийг уургална",
    price: 180,
  },
  {
    type: "gear",
    id: "fishingRod",
    icon: "🎣",
    name: "Загасны уурга",
    desc: "Голоос загас барина · Q-аар иднэ",
    price: 220,
  },
  {
    type: "livestock",
    kind: "cattle",
    icon: "🐄",
    name: "Үхэр",
    desc: "Сүргийн үхэр · сүү өгнө",
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
    desc: "Сүргийн тэмээ · сүү/ноос",
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
  {
    type: "sell",
    key: "fish",
    icon: "🐟",
    name: "Загас зарах",
    desc: "1 загас → 12 оноо",
    price: 12,
  },
];

export function shopItemId(item: ShopItem): string {
  if (item.type === "gear") return item.id;
  if (item.type === "livestock") return `livestock:${item.kind}`;
  return `sell:${item.key}`;
}

export function findShopItemIndex(id: string): number {
  return SHOP_ITEMS.findIndex((it) => shopItemId(it) === id);
}

export function buyShopItemById(state: GameState, id: string): void {
  const idx = findShopItemIndex(id);
  if (idx < 0) return;
  buyItem(state, idx);
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
  if (item.id === "bow") {
    state.player.inventory.arrows += 6;
    setMessage(state, "Нум авлаа! +6 сум. Урлалаар дахин хийж болно.", 3.5);
    return;
  }
  if (item.id === "horse") {
    state.player.horseHp = 80;
    state.player.horseMaxHp = 80;
    state.player.riding = true;
    state.world.mountHorse = null;
    setMessage(
      state,
      "Унах морь авлаа! Гэрийн зүүн талд уяа бослоо. H — бууж уях.",
      3.5,
    );
    return;
  }
  setMessage(state, `${item.name} худалдаж авлаа!`, 3);
}
