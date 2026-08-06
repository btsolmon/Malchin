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

export type DialogueSpeaker = "boy" | "elder" | "father" | "mother";

export interface DialogueBeat {
  speaker: DialogueSpeaker;
  text: string;
  /** Хүү ярьж байх үед баруун талд харагдах сонсогч. */
  listener?: "elder" | "father" | "mother";
  stage?: string;
}

export interface ElderDialogue {
  id: string;
  title: string;
  beats: DialogueBeat[];
  spirit?: boolean;
  /** Нээлтийн түүхээр л автоматаар тоглоно; хуучин ярианы жагсаалтад орохгүй. */
  storyOnly?: boolean;
}

export const FIRST_NIGHT_ELDER_DIALOGUE: ElderDialogue = {
  id: "first_night_elder",
  title: "Анхны шөнө",
  storyOnly: true,
  beats: [
    {
      speaker: "elder",
      text: "Хүү минь, бүү сандар. Би дэргэд чинь байна.",
    },
    {
      speaker: "boy",
      text: "Би яахаа мэдэхгүй байна.",
    },
    {
      speaker: "elder",
      text: "Мэдэхгүй байх гэм биш ээ. Харин харалгүй дайрах нь л аюултай.",
    },
    {
      speaker: "elder",
      text: "Араатны нүдийг бус, хөдөлгөөнийг нь ажигла.",
    },
  ],
};

export const POST_WOLF_ELDER_DIALOGUE: ElderDialogue = {
  id: "post_wolf_elder",
  title: "Голомтын дэргэд",
  storyOnly: true,
  beats: [
    {
      speaker: "elder",
      text: "Нааш суу, хүү минь. Шөнийн хүйтэн биеэс чинь хараахан гараагүй байна.",
    },
    {
      speaker: "boy",
      text: "Та намайг хаанаас ажиглаж байсан юм бэ?",
    },
    {
      speaker: "elder",
      text: "Хөгшин хүний нүд холыг бус, эвгүйг түрүүлж анзаардаг юм.",
    },
    {
      speaker: "boy",
      text: "Өнгөрсөн шөнийн шуурга аав, ээжийг минь авч одсон.",
    },
    {
      speaker: "elder",
      text: "Тэр салхи тэнгэрийнх бус байлаа. Хүйтэн инээдийг нь би ч бас сонссон.",
    },
    {
      speaker: "boy",
      text: "Тэгвэл та тэднийг хаашаа одсоныг мэдэх үү?",
    },
    {
      speaker: "elder",
      text: "Шөнийн үгийг үүрийн гэрэлд тайлдаг ёстой. Одоо голомтоо түшиж амар, хүү минь.",
    },
    {
      speaker: "elder",
      text: "Нар ургахад зүүн толгодын бууцанд минь ир. Мэдсэн бүхнээ тэнд өгүүлье.",
    },
  ],
};

export const DAWN_ELDER_DIALOGUE: ElderDialogue = {
  id: "dawn_elder_truth",
  title: "Үүрийн цагаан гэгээ",
  storyOnly: true,
  beats: [
    {
      speaker: "elder",
      text: "Ирэв үү, хүү минь. Үүрийн цагаан гэгээ шөнийн мөрийг нууж амжаагүй байна.",
    },
    {
      speaker: "boy",
      text: "Та хар шуурганы учрыг хэлнэ гэсэн.",
    },
    {
      speaker: "elder",
      text: "Тэр хар үүл тэнгэрээс хуралдаагүй. Газрын гүнд нойрссон муу амьсгал талд сэвэлзсэн нь тэр.",
    },
    {
      speaker: "boy",
      text: "Аав, ээж минь амьд байгаа юу?",
    },
    {
      speaker: "elder",
      text: "Амьдын гол нь тасраагүй ээ, хүү минь. Гэвч хүний хөлөөр хүрдэг замд бус, ил ба далдын завсарт хүлээстэй байна.",
    },
    {
      speaker: "boy",
      text: "Тэр газар нь Сүнсний орон гэж үү?",
    },
    {
      speaker: "elder",
      text: "Эртний хүмүүс тийн нэрлэдэгсэн. Түүний хаалга зоригт хүнд бус, мөрийг зөв таньсан хүнд нээгддэг юм.",
    },
    {
      speaker: "boy",
      text: "Би хаанаас эхлэх вэ?",
    },
    {
      speaker: "elder",
      text: "Бууцнаас минь зүүн хойших чулуун завсарт хар үнс, хахир хүйтэн мөр үлджээ. Тэнд очоод гараар бүү хүр. Салхины эсрэг талд зогсон, юу хөдөлж буйг анзаар.",
    },
    {
      speaker: "elder",
      text: "Мөр чамайг зөвшөөрвөл дараагийн замыг би нээнэ. Яарсан хөл төөрдөг, анзаарсан нүд зам олдог юм даа.",
    },
  ],
};

export const STORM_TRACE_ELDER_DIALOGUE: ElderDialogue = {
  id: "storm_trace_elder",
  title: "Хар мөрийн хариу",
  storyOnly: true,
  beats: [
    {
      speaker: "elder",
      text: "Мөрийг олж харав уу, хүү минь?",
    },
    {
      speaker: "boy",
      text: "Хар үнс салхины өөдөөс хөдөлж, чулуун завсраас өнөөх хүйтэн инээд сонсогдсон.",
    },
    {
      speaker: "elder",
      text: "Тэгвэл чи мөрийг харсан төдийгүй, мөр чамайг таньжээ.",
    },
    {
      speaker: "elder",
      text: "Бөөгийн толинд үлдсэн гэгээгээр ил ба далдын завсрыг түр нээж болно. Гэвч цаана нь хараалд автсан таван сахиул зам манана.",
    },
    {
      speaker: "boy",
      text: "Тэдний цаана аав, ээжийн минь мөр байгаа бол би буцахгүй.",
    },
    {
      speaker: "elder",
      text: "Тэгвэл амьсгалаа тогтоож, харсан бүхнээ санаж яв. Яарсан гар бус, анзаарсан нүд чамайг буцааж авчирна.",
    },
  ],
};

export const FAMILY_REUNION_DIALOGUE: ElderDialogue = {
  id: "family_reunion",
  title: "Гэр бүл эргэн нэгдэв",
  storyOnly: true,
  beats: [
    {
      speaker: "father",
      text: "Хүү минь... голомтын чинь гал биднийг харанхуйн дундаас замчилж ирлээ.",
    },
    {
      speaker: "boy",
      listener: "father",
      text: "Аав аа... Ээж ээ... Би та хоёрыг заавал олно гэж өөртөө амласан.",
    },
    {
      speaker: "mother",
      text: "Амлалт чинь биднийг бус, чамайг энд хүртэл авчирчээ. Нааш ир, үр минь.",
    },
    {
      speaker: "father",
      text: "Хар шуурга нутгийн сүргийг тарааж, бууцыг хоосолжээ. Гэвч голомт асаж байхад амьдрал дахин дэлгэрнэ.",
    },
    {
      speaker: "boy",
      listener: "mother",
      text: "Тэгвэл бид нутгаа дахин сэргээж, сүргээ урьдынхаас ч олон болгоно.",
    },
    {
      speaker: "mother",
      text: "Тийн ээ, хүү минь. Голомтоо сахиж, сүргээ өсгөе. Энэ удаа бид хамт байна.",
    },
  ],
};

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

export const ELDER_DIALOGUES: ElderDialogue[] = [
  SPIRIT_GATE_DIALOGUE,
  FIRST_NIGHT_ELDER_DIALOGUE,
  POST_WOLF_ELDER_DIALOGUE,
  DAWN_ELDER_DIALOGUE,
  STORM_TRACE_ELDER_DIALOGUE,
  FAMILY_REUNION_DIALOGUE,
];

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
  pose: "seated";
  face: 1;
  walkPhase: number;
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
  return {
    pos,
    gerPos,
    radius: 42,
    pose: "seated",
    face: 1,
    walkPhase: 0,
  };
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
  if (
    ((state.elderDialogueId === FIRST_NIGHT_ELDER_DIALOGUE.id &&
      !state.story.shortDialogueCompleted) ||
      (state.elderDialogueId === POST_WOLF_ELDER_DIALOGUE.id &&
        !state.story.milestone5DialogueCompleted) ||
      (state.elderDialogueId === DAWN_ELDER_DIALOGUE.id &&
        !state.story.milestone6DialogueCompleted) ||
      (state.elderDialogueId === STORM_TRACE_ELDER_DIALOGUE.id &&
        !state.story.stormTraceDialogueCompleted) ||
      (state.elderDialogueId === FAMILY_REUNION_DIALOGUE.id &&
        !state.story.familyReunionDialogueCompleted))
  ) {
    return;
  }
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
  if (!d.storyOnly && !state.elderHeardDialogues.includes(d.id)) {
    state.elderHeardDialogues = [...state.elderHeardDialogues, d.id];
  }
  sfx("select");
}

/** Нээлтийн чонын үеийн дөрвөн мөрт яриаг нэг удаа шууд эхлүүлнэ. */
export function beginFirstNightElderDialogue(state: GameState): void {
  if (
    state.story.shortDialogueStarted ||
    state.story.shortDialogueCompleted ||
    state.story.milestone3Completed
  ) {
    return;
  }

  state.story.shortDialogueStarted = true;
  state.story.firstNightStage = "elderDialogue";
  state.story.firstNightStageRemaining = 0;
  state.world.elder.pose = "standing";
  state.world.elder.eyeMode = "idle";
  state.phase = "elder";
  startElderDialogue(state, FIRST_NIGHT_ELDER_DIALOGUE.id);
}

/** Чоно унасны дараах голомтын дэргэдэх танилцах яриаг эхлүүлнэ. */
export function beginPostWolfElderDialogue(state: GameState): void {
  if (
    !state.story.milestone4Completed ||
    state.story.milestone5Started ||
    state.story.milestone5DialogueCompleted ||
    state.story.activeMainObjective !== "talkToOldMan"
  ) {
    return;
  }

  state.story.milestone5Started = true;
  state.world.elder.pose = "seated";
  state.world.elder.eyeMode = "idle";
  state.phase = "elder";
  startElderDialogue(state, POST_WOLF_ELDER_DIALOGUE.id);
}

function completePostWolfElderDialogue(state: GameState): void {
  const story = state.story;
  story.milestone5Started = true;
  story.milestone5DialogueCompleted = true;
  story.activeMainObjective = "visitOldManAtDawn";

  const elder = state.world.elder;
  elder.pos = {
    x: elder.gerPos.x - 36,
    y: elder.gerPos.y + 18,
  };
  elder.pose = "seated";
  elder.face = -1;
  elder.walkPhase = 0;
  elder.eyeMode = "idle";

  state.elderDialogueId = null;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.elderTab = "trade";
  state.phase = "playing";
  sfx("select");
  setMessage(state, "Өвгөн талын харанхуйд чимээгүйхэн одов.", 3.2);
}

/** Үүрээр бууцанд нь очиход хар шуурганы мөрийн тухай яриаг эхлүүлнэ. */
export function beginDawnElderDialogue(state: GameState): void {
  if (
    !state.story.milestone5DialogueCompleted ||
    state.story.milestone6Started ||
    state.story.milestone6DialogueCompleted ||
    state.story.activeMainObjective !== "visitOldManAtDawn"
  ) {
    return;
  }

  state.story.milestone6Started = true;
  state.world.elder.pose = "seated";
  state.world.elder.eyeMode = "idle";
  state.phase = "elder";
  startElderDialogue(state, DAWN_ELDER_DIALOGUE.id);
}

function completeDawnElderDialogue(state: GameState): void {
  const story = state.story;
  story.milestone6Started = true;
  story.milestone6DialogueCompleted = true;
  story.activeMainObjective = "inspectStormTrace";

  state.world.elder.pose = "seated";
  state.world.elder.eyeMode = "idle";
  state.elderDialogueId = null;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.elderTab = "trade";
  state.phase = "playing";
  sfx("select");
  setMessage(state, "Өвгөн зүүн хойших чулуун завсрыг заав.", 3.2);
}

/** Хар мөрийг шинжилсний дараа Сүнсний замыг нээх яриа. */
export function beginStormTraceElderDialogue(state: GameState): void {
  if (
    !state.story.stormTraceInspected ||
    state.story.stormTraceDialogueCompleted ||
    state.story.activeMainObjective !== "returnToOldManWithTrace"
  ) {
    return;
  }

  state.world.elder.pose = "seated";
  state.world.elder.eyeMode = "idle";
  state.phase = "elder";
  startElderDialogue(state, STORM_TRACE_ELDER_DIALOGUE.id);
}

function completeStormTraceElderDialogue(state: GameState): void {
  const story = state.story;
  story.milestone7Started = true;
  story.stormTraceDialogueCompleted = true;
  story.spiritPathOpened = true;
  story.activeMainObjective = "defeatSpiritGuards";

  state.elderDialogueId = null;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.elderTab = "trade";
  state.phase = "playing";
  state.world.elder.eyeMode = "spirit";
  ensureShulmasHelpers(state);
  enterSpiritWorld(state);
  setMessage(
    state,
    "Ил ба далдын завсар нээгдэв. Замыг манах таван сахиулыг дар.",
    4.5,
  );
}

export function beginFamilyReunionDialogue(state: GameState): void {
  const story = state.story;
  if (
    !state.parentsReturned ||
    !state.parents ||
    story.familyReunionDialogueStarted ||
    story.familyReunionDialogueCompleted
  ) {
    return;
  }

  story.milestone8Started = true;
  story.familyReunionDialogueStarted = true;
  story.activeMainObjective = null;
  state.phase = "elder";
  startElderDialogue(state, FAMILY_REUNION_DIALOGUE.id);
}

function completeFamilyReunionDialogue(state: GameState): void {
  const story = state.story;
  story.milestone8Started = true;
  story.familyReunionDialogueStarted = true;
  story.familyReunionDialogueCompleted = true;
  story.milestone8Completed = true;
  story.activeMainObjective = "growFlock";

  state.elderDialogueId = null;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.elderTab = "trade";
  state.phase = "playing";
  sfx("win");
  setMessage(
    state,
    "Голомтоо сахиж, сүргээ 1000 толгойд хүргэ.",
    4.2,
  );
}

function completeFirstNightElderDialogue(state: GameState): void {
  const story = state.story;
  const wolf = state.world.wolves.find((candidate) => {
    return story.storyWolfId !== null && candidate.id === story.storyWolfId;
  });

  if (wolf) {
    wolf.alive = true;
    wolf.hp = Math.max(1, wolf.hp);
    wolf.vel.x = 0;
    wolf.vel.y = 0;
    wolf.attackPhase = "recovery";
    wolf.attackTimer = Math.max(wolf.attackTimer, 0.8);
    wolf.attackCooldown = Math.max(wolf.attackCooldown, 1.2);
    wolf.attackHitDone = true;
    wolf.combatPhase = "recovery";
    wolf.combatTimer = Math.max(wolf.combatTimer, 0.8);
    wolf.flash = 0;
  }

  story.storyWolfAttackInProgress = false;
  story.temporaryPlayerProtectionActive = false;
  story.temporaryLivestockProtectionActive = false;
  story.shortDialogueCompleted = true;
  story.milestone3Completed = true;
  story.firstNightStage = "completed";
  story.firstNightStageRemaining = 0;
  story.activeMainObjective = "observeWolfMovement";
  state.world.elder.pose = "standing";
  state.world.elder.eyeMode = "idle";

  sfx("select");
  closeElder(state);
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
  if (d.storyOnly) {
    if (d.id === FIRST_NIGHT_ELDER_DIALOGUE.id) {
      completeFirstNightElderDialogue(state);
    } else if (d.id === POST_WOLF_ELDER_DIALOGUE.id) {
      completePostWolfElderDialogue(state);
    } else if (d.id === DAWN_ELDER_DIALOGUE.id) {
      completeDawnElderDialogue(state);
    } else if (d.id === STORM_TRACE_ELDER_DIALOGUE.id) {
      completeStormTraceElderDialogue(state);
    } else if (d.id === FAMILY_REUNION_DIALOGUE.id) {
      completeFamilyReunionDialogue(state);
    }
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
  if (
    state.elderDialogueId === FIRST_NIGHT_ELDER_DIALOGUE.id ||
    state.elderDialogueId === POST_WOLF_ELDER_DIALOGUE.id ||
    state.elderDialogueId === DAWN_ELDER_DIALOGUE.id ||
    state.elderDialogueId === STORM_TRACE_ELDER_DIALOGUE.id
  ) return;
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
  if (speaker === "boy") return "Хүү";
  if (speaker === "father") return "Аав";
  if (speaker === "mother") return "Ээж";
  return "Өвгөн";
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
    dialogues: ELDER_DIALOGUES.filter((d) => !d.storyOnly).map((d) => ({
      id: d.id,
      title: d.title,
      heard: state.elderHeardDialogues.includes(d.id),
    })),
    activeDialogue,
  };
}
