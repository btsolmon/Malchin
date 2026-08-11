// Авдар/өвгөний арилжааны бараа ба худалдан авалт

import { sfx } from "./audio";
import type { GameIconId } from "./icons";
import { addLivestock } from "./livestock";
import {
  LIVESTOCK_MN,
  type GameState,
  type GearId,
  type LivestockKind,
} from "./types";
import { setMessage } from "./utils";
import { tr, trFormat } from "./i18n";

export type ShopItem =
  | {
      type: "gear";
      id: GearId;
      icon: GameIconId;
      name: string;
      desc: string;
      price: number;
    }
  | {
      type: "livestock";
      kind: LivestockKind;
      icon: GameIconId;
      name: string;
      desc: string;
      price: number;
    }
  | {
      type: "sell";
      key: "wool" | "cashmere" | "milk" | "felt" | "aaruul" | "fish";
      icon: GameIconId;
      name: string;
      desc: string;
      price: number;
    };

export const SHOP_ITEMS: ShopItem[] = [
  {
    type: "gear",
    id: "dog",
    icon: "dog",
    name: "Нохой",
    desc: "Сүргийг чононоос хамгаална",
    price: 300,
  },
  {
    type: "gear",
    id: "horse",
    icon: "horse",
    name: "Унах морь",
    desc: "Унаж явахад хурд +50%",
    price: 500,
  },
  {
    type: "gear",
    id: "bow",
    icon: "bow",
    name: "Нум",
    desc: "Харвах — сум хэрэгтэй (урлалаар хийнэ)",
    price: 400,
  },
  {
    type: "gear",
    id: "axe",
    icon: "axe",
    name: "Сүх",
    desc: "Мод/түлээ нэг цохилтоор унагана",
    price: 500,
  },
  {
    type: "gear",
    id: "basket",
    icon: "basket",
    name: "Сагс",
    desc: "Бутны бүх жимсийг нэг даралтаар түүнэ",
    price: 280,
  },
  {
    type: "gear",
    id: "urga",
    icon: "urga",
    name: "Уурга",
    desc: "Зэрлэг морийг уургална",
    price: 180,
  },
  {
    type: "gear",
    id: "fishingRod",
    icon: "fishingRod",
    name: "Загасны уурга",
    desc: "Голоос загас барина · Q-аар иднэ",
    price: 220,
  },
  {
    type: "livestock",
    kind: "sheep",
    icon: "sheep",
    name: "Хонь",
    desc: "Сүргийн хонь · ноос өгнө",
    price: 80,
  },
  {
    type: "livestock",
    kind: "goat",
    icon: "goat",
    name: "Ямаа",
    desc: "Сүргийн ямаа · сүү/ноос",
    price: 100,
  },
  {
    type: "livestock",
    kind: "cattle",
    icon: "cattle",
    name: "Үхэр",
    desc: "Сүргийн үхэр · сүү өгнө",
    price: 220,
  },
  {
    type: "livestock",
    kind: "horse",
    icon: "horseHerd",
    name: "Морь (сүрэг)",
    desc: "Сүргийн морь · сүү өгнө",
    price: 320,
  },
  {
    type: "livestock",
    kind: "camel",
    icon: "camel",
    name: "Тэмээ",
    desc: "Сүргийн тэмээ · сүү/ноос",
    price: 400,
  },
  {
    type: "sell",
    key: "wool",
    icon: "wool",
    name: "Ноос зарах",
    desc: "1 ноос → 8 зоос",
    price: 8,
  },
  {
    type: "sell",
    key: "cashmere",
    icon: "cashmere",
    name: "Ноолуур зарах",
    desc: "1 ноолуур → 22 зоос",
    price: 22,
  },
  {
    type: "sell",
    key: "milk",
    icon: "milk",
    name: "Сүү зарах",
    desc: "1 сүү → 6 зоос",
    price: 6,
  },
  {
    type: "sell",
    key: "felt",
    icon: "felt",
    name: "Эсгий зарах",
    desc: "1 эсгий → 45 зоос",
    price: 45,
  },
  {
    type: "sell",
    key: "aaruul",
    icon: "aaruul",
    name: "Ааруул зарах",
    desc: "1 ааруул → 30 зоос",
    price: 30,
  },
  {
    type: "sell",
    key: "fish",
    icon: "fish",
    name: "Загас зарах",
    desc: "1 загас → 12 зоос",
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
      setMessage(
        state,
        trFormat("{name} алга.", {
          name: tr(item.name.replace(" зарах", "")),
        }),
        2,
      );
      sfx("move");
      return;
    }
    inv[item.key] -= 1;
    state.score += item.price;
    sfx("buy");
    setMessage(
      state,
      trFormat("{name}: +{price} зоос", {
        name: tr(item.name),
        price: item.price,
      }),
      2,
    );
    return;
  }

  if (item.type === "livestock") {
    if (!state.unlimitedCoins && state.score < item.price) {
      setMessage(
        state,
        trFormat("Зоос хүрэхгүй — {price} зоос хэрэгтэй.", {
          price: item.price,
        }),
        2,
      );
      sfx("move");
      return;
    }
    if (!state.unlimitedCoins) state.score -= item.price;
    addLivestock(state, item.kind, 1);
    sfx("buy");
    setMessage(
      state,
      trFormat("{name} худалдаж авлаа! (+1 {kind})", {
        name: tr(item.name),
        kind: tr(LIVESTOCK_MN[item.kind]),
      }),
      3,
    );
    return;
  }

  if (state.player.gear[item.id]) {
    setMessage(
      state,
      trFormat("{name} аль хэдийн бий.", { name: tr(item.name) }),
      2,
    );
    sfx("move");
    return;
  }
  if (!state.unlimitedCoins && state.score < item.price) {
    setMessage(
      state,
      trFormat("Зоос хүрэхгүй — {price} зоос хэрэгтэй.", {
        price: item.price,
      }),
      2,
    );
    sfx("move");
    return;
  }
  if (!state.unlimitedCoins) state.score -= item.price;
  state.player.gear[item.id] = true;
  sfx("buy");
  if (item.id === "dog") {
    const p = state.player.pos;
    state.world.dog = {
      pos: { x: p.x + 28, y: p.y + 18 },
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
      "Унах морь авлаа! Гэрийн баруун талд уяа бослоо. E — бууж уях.",
      3.5,
    );
    return;
  }
  setMessage(
    state,
    trFormat("{name} худалдаж авлаа!", { name: tr(item.name) }),
    3,
  );
}
