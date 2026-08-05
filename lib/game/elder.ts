// Өвгөн NPC — авдрын арилжаа + сүнсний хаалганы яриа

import { sfx } from "./audio";
import { spawnText } from "./effects";
import { ensureShulmasHelpers } from "./firstRoute";
import { enterSpiritWorld } from "./spirit";
import {
  SHOP_ITEMS,
  buyShopItemById,
  shopItemId,
  type ShopItem,
} from "./shop";
import { dist, setMessage } from "./utils";
import type { GameState, Vector2 } from "./types";
import { WORLD_H, WORLD_W } from "./types";

/** Авдрын дэлгүүрийн бараа — өвгөний арилжаанд тэр чигт нь */
export const ELDER_TRADE_LIST: ShopItem[] = SHOP_ITEMS;

export type DialogueSpeaker = "boy" | "elder";

export interface DialogueBeat {
  speaker: DialogueSpeaker;
  text: string;

  stage?: string;
}

export interface ElderDialogue {
  id: string;
  title: string;
  beats: DialogueBeat[];
  spirit?: boolean;
}

export const SPIRIT_GATE_DIALOGUE: ElderDialogue = {
  id: "spirit_gate",
  title: "Аав ээжийн тухай",
  spirit: true,
  beats: [
    {
      speaker: "elder",
      text: "Ивий жаахан үр минь эцэж юунд цуцав, энэ биеийг нь төрүүлсэн эцэг эх чинь алив?",
    },
    {
      speaker: "boy",
      text: "Өвгөн ах минь, би эжий аавтайгаа хамт энэ нутагт суудагсан. Гэтэл гэнэт өчигдөр газар тэнгэрийг нийлүүлсэн гамшигт их шуурга дэгдэж, хахир муухай хоолой хачин чангаар инээж, эгэл бор гэрээс минь эжий аавыг минь аван одов.",
    },
    {
      speaker: "boy",
      text: "Шүүгих их шуургыг чухам хэн дэгдээв? Эцэг эх хоёрыг минь эндээс юу авч одов?",
    },
    {
      speaker: "elder",
      stage:
        "Өндөр наст өвгөний хөвд сахал чичирч, хүрэн бор царай нь хүйт дааж харагданa...",
      text: "",
    },
    {
      speaker: "boy",
      text: "Юу гэсэн үг вэ? Тэд минь... энэ дэлхийд байхгүй гэж үү?!",
    },
    {
      speaker: "elder",
      text: 'Тэд чинь амьд, гэхдээ бодит ба далд ертөнцийн зааг болох "Сүнсний орон"-д хүлээстэй байна. Эртний шулмас, сүнсний эзэд тэднийг татаж одсон юм. Би чиний насны хүүг тийшээ явуулж, аюулд унагамааргүй байна... Гэвч чиний аав ээжээ гэсэн халуун сэтгэл, цуглуулсан шим тэжээл чинь Сүнсний замын хаалгыг нээх хэмжээнд хүрэв.',
    },
    {
      speaker: "boy",
      stage: "Ташуураа чанга атган, тууштай харна",
      text: "Надад ямар ч аюул тохиосон хамаагүй! Би аав, ээжийгээ заавал буцааж авчирна. Би яаж тийшээ очих вэ?",
    },
    {
      speaker: "elder",
      text: "Би бөөгийн толиороо орон зайн заагийг нээнэ. Тэр ертөнцөд ороход бодит дэлхийн цаг хугацаа зогсох тул чиний хонь, ямаанд аюул тохиолдохгүй, тайван явж болно. Гэвч тэнд сүнсний аюултай дайснууд хүлээж байгааг санагтун! Чи явахад бэлэн үү?",
    },
  ],
};

export const ELDER_DIALOGUES: ElderDialogue[] = [SPIRIT_GATE_DIALOGUE];

export type ElderChoiceId = "enter_spirit" | "prepare";

export interface ElderChoice {
  id: ElderChoiceId;
  label: string;
  boyLine: string;
}

export const SPIRIT_GATE_CHOICES: ElderChoice[] = [
  {
    id: "enter_spirit",
    label: "Сүнсний ертөнц рүү одох",
    boyLine: "Би бэлэн байна, Өвгөн ахаа! Замыг минь нээж өгнө үү.",
  },
  {
    id: "prepare",
    label: "Бэлтгэл хангах",
    boyLine:
      "Надад тулааны зэвсэг, хоол хүнсээ арай сайн бэлдэх цаг хэрэгтэй байна.",
  },
];

export type ElderEyeMode = "idle" | "spirit" | "rare";
export type ElderTab = "trade" | "talk";

export interface ElderUiTradeRow {
  id: string;
  icon: string;
  nameMn: string;
  desc: string;
  action: "buy" | "sell";
  price: number;
  have: number;
  owned: boolean;
  canTrade: boolean;
  detail: string;
  rare: boolean;
}

export interface ElderUiState {
  open: true;
  tab: ElderTab;
  eyeMode: ElderEyeMode;
  score: number;
  trades: ElderUiTradeRow[];
  dialogues: Array<{ id: string; title: string; heard: boolean }>;
  activeDialogue: {
    id: string;
    title: string;
    beat: DialogueBeat;
    beatIndex: number;
    beatCount: number;
    showingChoices: boolean;
  } | null;
}

export type ElderUiSnapshot = ElderUiState | { open: false };

export function createElder(camp: Vector2): {
  pos: Vector2;
  gerPos: Vector2;
  radius: number;
} {
  let gerPos = {
    x: camp.x + 320,
    y: camp.y + 210,
  };
  gerPos = {
    x: Math.max(120, Math.min(WORLD_W - 120, gerPos.x)),
    y: Math.max(120, Math.min(WORLD_H - 120, gerPos.y)),
  };
  const pos = { x: gerPos.x - 36, y: gerPos.y + 18 };
  return { pos, gerPos, radius: 42 };
}

export function nearElder(state: GameState): boolean {
  const e = state.world.elder;
  return dist(state.player.pos, e.pos) < e.radius + state.player.radius + 20;
}

export function openElder(state: GameState): void {
  state.phase = "elder";
  state.elderTab = "trade";
  state.elderDialogueId = null;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.menuIndex = 0;
  state.world.elder.eyeMode = "idle";
  sfx("select");
  setMessage(state, "Өвгөн: «За, юу авах, юу зарах вэ?»", 2.5);
}

export function closeElder(state: GameState): void {
  if (state.phase !== "elder") return;
  state.phase = "playing";
  state.elderTab = "trade";
  state.elderDialogueId = null;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.world.elder.eyeMode = "idle";
}

export function setElderTab(state: GameState, tab: ElderTab): void {
  if (state.phase !== "elder") return;
  state.elderTab = tab;
  if (tab === "trade") {
    state.elderDialogueId = null;
    state.elderDialogueLine = 0;
    state.elderShowingChoices = false;
    if (state.world.elder.eyeMode === "spirit") {
      state.world.elder.eyeMode = "idle";
    }
  } else {
    // Яриа руу ороход шууд гол скрипт эхэлнэ
    startElderDialogue(state, SPIRIT_GATE_DIALOGUE.id);
  }
}

export function startElderDialogue(state: GameState, dialogueId: string): void {
  const d = ELDER_DIALOGUES.find((x) => x.id === dialogueId);
  if (!d) return;
  state.elderTab = "talk";
  state.elderDialogueId = d.id;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.menuIndex = 0;
  if (d.spirit) state.world.elder.eyeMode = "spirit";
  else state.world.elder.eyeMode = "idle";
  if (!state.elderHeardDialogues.includes(d.id)) {
    state.elderHeardDialogues = [...state.elderHeardDialogues, d.id];
  }
  sfx("select");
}

export function advanceElderDialogue(state: GameState): void {
  if (!state.elderDialogueId || state.elderShowingChoices) return;
  const d = ELDER_DIALOGUES.find((x) => x.id === state.elderDialogueId);
  if (!d) return;
  if (state.elderDialogueLine < d.beats.length - 1) {
    state.elderDialogueLine += 1;
    sfx("select");
    return;
  }
  // Сүүлийн мөр — сонголт харуулна
  state.elderShowingChoices = true;
  state.menuIndex = 0;
  sfx("select");
}

/** Өмнөх ярианы мөр рүү буцах (сонголт дээр байвал сүүлийн мөр рүү) */
export function retreatElderDialogue(state: GameState): void {
  if (!state.elderDialogueId) return;
  if (state.elderShowingChoices) {
    state.elderShowingChoices = false;
    sfx("select");
    return;
  }
  if (state.elderDialogueLine <= 0) return;
  state.elderDialogueLine -= 1;
  sfx("select");
}

export function chooseElderOption(
  state: GameState,
  choiceId: ElderChoiceId,
): void {
  const choice = SPIRIT_GATE_CHOICES.find((c) => c.id === choiceId);
  if (!choice) return;

  state.elderDialogueId = null;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.world.elder.eyeMode = "idle";

  if (choiceId === "enter_spirit") {
    setMessage(state, `Хүү: «${choice.boyLine}»`, 2);
    // Фазыг elder-ээс гаргаад сүнс рүү — туслахуудыг шууд босгоно
    state.phase = "playing";
    ensureShulmasHelpers(state);
    enterSpiritWorld(state);
    return;
  }

  // Бэлтгэл
  closeElder(state);
  setMessage(state, `Хүү: «${choice.boyLine}»`, 3.5);
  sfx("select");
}

export function tradeWithElder(state: GameState, itemId: string): boolean {
  if (state.phase !== "elder") return false;
  const item = ELDER_TRADE_LIST.find((it) => shopItemId(it) === itemId);
  if (!item) return false;

  const scoreBefore = state.score;
  const invBefore =
    item.type === "sell" ? state.player.inventory[item.key] : 0;

  buyShopItemById(state, itemId);

  if (item.type === "sell") {
    if (state.player.inventory[item.key] >= invBefore) return false;
    const rare = item.key === "cashmere";
    if (rare) state.world.elder.eyeMode = "rare";
    else if (state.world.elder.eyeMode !== "spirit") {
      state.world.elder.eyeMode = "idle";
    }
    spawnText(
      state,
      state.player.pos,
      `+${item.price}`,
      rare ? "#7ec8ff" : "#e8c56a",
    );
    return true;
  }

  // Авсан эсэх — оноо буурсан эсвэл gear эзэмшсэн болсон
  if (item.type === "gear") {
    if (!state.player.gear[item.id] || state.score > scoreBefore) return false;
  } else if (state.score >= scoreBefore) {
    return false;
  }

  if (state.world.elder.eyeMode !== "spirit") {
    state.world.elder.eyeMode = "idle";
  }
  spawnText(state, state.player.pos, `−${item.price}`, "#e8c56a");
  return true;
}

export function speakerLabel(speaker: DialogueSpeaker): string {
  return speaker === "boy" ? "Хүү" : "Өвгөн";
}

export function getElderUiSnapshot(state: GameState): ElderUiSnapshot {
  if (state.phase !== "elder") return { open: false };

  const inv = state.player.inventory;
  const trades: ElderUiTradeRow[] = ELDER_TRADE_LIST.map((t) => {
    const id = shopItemId(t);
    if (t.type === "sell") {
      const have = Number(inv[t.key] ?? 0);
      return {
        id,
        icon: t.icon,
        nameMn: t.name,
        desc: t.desc,
        action: "sell" as const,
        price: t.price,
        have,
        owned: false,
        canTrade: have > 0,
        detail: have > 0 ? `×${have} · +${t.price}` : "Алга",
        rare: t.key === "cashmere",
      };
    }
    if (t.type === "livestock") {
      const afford = state.score >= t.price;
      return {
        id,
        icon: t.icon,
        nameMn: t.name,
        desc: t.desc,
        action: "buy" as const,
        price: t.price,
        have: 0,
        owned: false,
        canTrade: afford,
        detail: `${t.price} оноо`,
        rare: false,
      };
    }
    const owned = state.player.gear[t.id];
    const afford = state.score >= t.price;
    return {
      id,
      icon: t.icon,
      nameMn: t.name,
      desc: t.desc,
      action: "buy" as const,
      price: t.price,
      have: 0,
      owned,
      canTrade: !owned && afford,
      detail: owned ? "Эзэмшсэн ✓" : `${t.price} оноо`,
      rare: false,
    };
  });

  let activeDialogue: ElderUiState["activeDialogue"] = null;
  if (state.elderDialogueId) {
    const d = ELDER_DIALOGUES.find((x) => x.id === state.elderDialogueId);
    if (d) {
      const beat = d.beats[state.elderDialogueLine] ?? d.beats[0]!;
      activeDialogue = {
        id: d.id,
        title: d.title,
        beat,
        beatIndex: state.elderDialogueLine,
        beatCount: d.beats.length,
        showingChoices: state.elderShowingChoices,
      };
    }
  }

  return {
    open: true,
    tab: state.elderTab,
    eyeMode: state.world.elder.eyeMode,
    score: state.score,
    trades,
    dialogues: ELDER_DIALOGUES.map((d) => ({
      id: d.id,
      title: d.title,
      heard: state.elderHeardDialogues.includes(d.id),
    })),
    activeDialogue,
  };
}
