import {
  CAMPFIRE_WOOD_COST,
  COLORS,
  SPIRIT_OVOO_STONE_COST,
  SNAKE_CRUSH_STONE_COST,
  SPIRIT_WATER_SIPS,
  VIEW_H,
  VIEW_W,
  WORLD_H,
  WORLD_W,
  type Camera,
  type FirstNightStage,
  type GameState,
  type HerdAnimal,
  type OpeningLivestockAnchor,
  type StoryState,
  type Vector2,
  type Wolf,
} from "./types";
import {
  sfx,
  setOpeningAmbient,
  updateOpeningAmbient,
  stopOpeningAmbient,
  openingAmbientForVignette,
  fadeOutTumurBossMusic,
  startFamilyLifeTheme,
} from "./audio";
import { beginFamilyReunionDialogue } from "./elder";
import { spawnParticles, spawnText } from "./effects";
import { isInRiver } from "./biomes";
import { animalInPen, getDayPhase, TIME_RATE } from "./daycycle";
import { spawnWolf } from "./enemies";
import {
  ensureShulmasHelpers,
  placePlayerNearHelpers,
  tryInteractFirstRoute,
} from "./firstRoute";
import {
  ensureParents,
  spawnIntroCinematicParents,
  clearIntroCinematicParents,
} from "./parents";
import {
  enterSpiritWorld,
  exitSpiritWorld,
  stashSpiritVisitSnapshot,
} from "./spirit";
import { tr, trFormat } from "./i18n";
import {
  clamp,
  dist,
  normalize,
  pastureCenter,
  penCenter,
  penCenterFor,
  penForLivestock,
  PEN_RADIUS,
  pushOutOfGer,
  pushOutOfUrtz,
  roundRectPath,
  drawFrostedGlassPanel,
  setMessage,
} from "./utils";

/** Нээлт — аав ээжийг авч явах үеийн шулмын инээд */
let introWitchLaughPlayed = false;

export type OpeningVignetteId =
  | "stormNight"
  | "laughingStorm"
  | "coldDawn";

export interface OpeningStorySection {
  text: string;
  vignette: OpeningVignetteId;
  timeOfDay: number;
  weather: "clear" | "wind" | "storm" | "snow";
  /** campPos-оос камерын төв рүү offset */
  camOffset: Vector2;
  /** Камерын аажим шилжилт (нэгж/сек) */
  slowPan: Vector2;
}

export const OPENING_STORY_SECTIONS: readonly OpeningStorySection[] = [
  {
    text: "Шөнө дөлөөр хар үүл хуралдан, хар хэрээ гуагалж, хачин муу ёр тал нутгийг нөмрөв.",
    vignette: "stormNight",
    timeOfDay: 1.2,
    weather: "storm",
    camOffset: { x: -20, y: 55 },
    slowPan: { x: 6, y: -2 },
  },
  {
    text: "Хавсарга шуурга хуйларч, харанхуй борооны гүнээс хахир хүйтэн инээд хадах мэт сонсогдоно.",
    vignette: "laughingStorm",
    timeOfDay: 2.5,
    weather: "storm",
    camOffset: { x: -40, y: 30 },
    slowPan: { x: -14, y: 4 },
  },
  {
    text: "Үүрийн цолмон цайхад голомтын гал бөхөж, гадаах малаас ганц ч дуу үл дуулдана.",
    vignette: "coldDawn",
    timeOfDay: 5.75,
    weather: "wind",
    camOffset: { x: 0, y: 35 },
    slowPan: { x: 3, y: 1 },
  },
] as const;

export const HEARTH_QUEST = {
  title: "Галаа асаа",
  description:
    "Голомт унтарсан байна. Түлээ бэлтгэж, гэртээ орж зууханд гал асаа.",
} as const;

export const SCATTERED_LIVESTOCK_QUEST = {
  title: "Малаа эрж ол",
  description: "Шуурганд тарсан малаа олж, хотондоо буцаа.",
  panelLines: ["Шуурганд тарсан малаа олж,", "хотондоо буцаа."],
} as const;

export const PROTECT_FLOCK_QUEST = {
  title: "Сүргээ хамгаал",
  description: "Чоно хотонд ойртжээ. Сүргээсээ холдуулж, амьд үлд.",
  panelLines: [
    "Чоно хотонд ойртжээ.",
    "Сүргээсээ холдуулж, амьд үлд.",
  ],
} as const;

export const OBSERVE_WOLF_QUEST = {
  title: "Чонын хөдөлгөөнийг ажигла",
  description: "Өвгөний үгийг сонсож, араатны дайрах мөчийг тань.",
  panelLines: [
    "Өвгөний үгийг сонсож,",
    "араатны дайрах мөчийг тань.",
  ],
} as const;

export const PARRY_STORY_WOLF_QUEST = {
  title: "Дайралтыг сөр",
  description:
    "Улаан туяа цахих мөчид L / Parry дарж, дайралтыг нь няцаа.",
  panelLines: [
    "Улаан туяа цахих мөчид",
    "L / Parry дарж няцаа.",
  ],
} as const;

export const COUNTER_STORY_WOLF_QUEST = {
  title: "Нээлттэй мөчид цохь",
  description:
    "Шар туяа тодрох үед J / Attack дарж, араатны сул мөчийг ашигла.",
  panelLines: [
    "Шар туяа тодрох үед",
    "J / Attack дарж цохь.",
  ],
} as const;

export const TALK_TO_OLD_MAN_QUEST = {
  title: "Өвгөнтэй ярилц",
  description: "Голомтын дэргэд суух үл таних өвгөн дээр оч.",
  panelLines: [
    "Голомтын дэргэд суух",
    "үл таних өвгөн дээр оч.",
  ],
} as const;

export const VISIT_OLD_MAN_AT_DAWN_QUEST = {
  title: "Үүрээр өвгөнийг зорь",
  description: "Нар мандахад зүүн толгодын өвгөний бууцанд оч.",
  panelLines: [
    "Нар мандахад зүүн толгодын",
    "өвгөний бууцанд оч.",
  ],
} as const;

export const INSPECT_STORM_TRACE_QUEST = {
  title: "Шуурганы мөрийг шинж",
  description:
    "Өвгөний бууцнаас зүүн хойших чулуун завсарт очиж, хар шуурганы үлдээсэн мөрийг ол.",
  panelLines: [
    "Зүүн хойших чулуун завсарт очиж,",
    "хар шуурганы үлдээсэн мөрийг ол.",
  ],
} as const;

export const RETURN_TRACE_TO_OLD_MAN_QUEST = {
  title: "Өвгөнд мэдээ хүргэ",
  description: "Хар мөрийн хөдөлгөөнийг өвгөнд очиж өгүүл.",
  panelLines: [
    "Хар мөрийн хөдөлгөөнийг",
    "өвгөнд очиж өгүүл.",
  ],
} as const;

export const TALK_AFTER_SPIRIT_SCOUT_QUEST = {
  title: "Өвгөн дээр очиж ярилц",
  description: "Өвгөн дээр очиж ярилц.",
  panelLines: ["Өвгөн дээр очиж ярилц."],
} as const;

export const BUILD_SPIRIT_OVOO_QUEST = {
  title: "Сүнсний овоо босго",
  description: `Хар салхины мөр дээр ${SPIRIT_OVOO_STONE_COST} чулуугаар овоо босго (заавал биш).`,
  panelLines: [
    "Хар салхины мөр дээр чулуун овоо босго.",
    `Чулуу: ${SPIRIT_OVOO_STONE_COST} · заавал биш.`,
  ],
} as const;

export const ENTER_SPIRIT_VIA_OVOO_QUEST = {
  title: "Сүнсний орон руу ор",
  description: "Сүнсний орон руу ор. Орвол буцах хаалга байхгүй.",
  panelLines: [
    "Сүнсний орон руу ор.",
    "Орвол буцах хаалга байхгүй.",
  ],
} as const;

export const DEFEAT_SPIRIT_GUARDS_QUEST = {
  title: "Сүнсний замыг нээ",
  description:
    "Зургаан нар, Хар могой, үлдсэн гурван сахиулыг дар.",
  panelLines: [
    "Зургаан нар · Хар могой ·",
    "үлдсэн гурван сахиулыг дар.",
  ],
} as const;

export const REACH_CURSED_GATE_QUEST = {
  title: "Хараалт хаалгад хүр",
  description: "Сахиулын мөр тасарлаа. Хараалт хаалгыг зорь.",
  panelLines: [
    "Сахиулын мөр тасарлаа.",
    "Хараалт хаалгыг зорь.",
  ],
} as const;

export const DEFEAT_SHULMAS_BAATAR_QUEST = {
  title: "Шулмасын баатрыг дар",
  description: "Хараалт талбайг сахих баатрыг ял.",
  panelLines: [
    "Хараалт талбайг сахих",
    "баатрыг ял.",
  ],
} as const;

export const CLAIM_SKY_SWORD_QUEST = {
  title: "Хөх тэнгэрийн сэлмийг ав",
  description: "Унасан баатрын дэргэд үлдсэн сэлмийг ав.",
  panelLines: [
    "Унасан баатрын дэргэд",
    "үлдсэн сэлмийг ав.",
  ],
} as const;

export const OPEN_BLACK_IRON_GATE_QUEST = {
  title: "Хар төмөр хаалгыг нээ",
  description: "Хөх тэнгэрийн сэлмээр хар төмөр хаалгыг нээ.",
  panelLines: [
    "Хөх тэнгэрийн сэлмээр",
    "хар төмөр хаалгыг нээ.",
  ],
} as const;

export const DEFEAT_TUMUR_SHULMAS_QUEST = {
  title: "Төмөр шулмасыг дар",
  description: "Аав, ээжийг хүлсэн төмөр шулмасыг ял.",
  panelLines: [
    "Аав, ээжийг хүлсэн",
    "төмөр шулмасыг ял.",
  ],
} as const;

export const RETURN_FROM_SPIRIT_QUEST = {
  title: "Бодит ертөнцөд буц",
  description: "Хүлээс тасарлаа. E дарж гэрийн зүг буц.",
  panelLines: [
    "Хүлээс тасарлаа.",
    "E дарж гэрийн зүг буц.",
  ],
} as const;

export const GROW_FLOCK_QUEST = {
  title: "Сүргээ өсгө",
  description: "Голомтоо сахиж, сүргээ 1000 толгойд хүргэ.",
  panelLines: [
    "Голомтоо сахиж, сүргээ",
    "1000 толгойд хүргэ.",
  ],
} as const;

export const LIVESTOCK_QUEST_NARRATION =
  "Шуурганы мөр тал өөд татжээ.\n\nМалын мөрийг дагаж, харанхуй болохоос урьтаж сүргээ буцаа.";

export const FIRST_NIGHT_SUNSET_NARRATION =
  "Нар уулын цаагуур шингэж, тал нутгийг бараан сүүдэр нөмрөв.";

export const FIRST_NIGHT_WOLF_WARNING =
  "Алсад чонын улиан сонсогдоно.";

const INTRO_SECTION_DURATION = 5.2;
const INTRO_SECTION_MAX_DURATION = 45;
const INTRO_FADE_DURATION = 1;
export const HEARTH_COMPLETION_EFFECT_DURATION = 2.6;
export const LIVESTOCK_COMPLETION_EFFECT_DURATION = 2.6;
export const NIGHT_COMPLETION_EFFECT_DURATION = 1.5;
export const FAMILY_REUNION_EFFECT_DURATION = 3.2;
export const LIVESTOCK_CALL_DISTANCE = 48;
export const FIRST_NIGHT_SUNSET_DURATION = 7.25;

const FIRST_DAY_LIVESTOCK_TIME_MULTIPLIER = 2;
const FIRST_DAY_LATE_EVENING_TIME = 19.5;
const FIRST_NIGHT_VISIBLE_SUNSET_START = 18;
const FIRST_NIGHT_TARGET_TIME = 20;
const FIRST_NIGHT_NARRATION_DURATION = 5;
const FIRST_NIGHT_WOLF_WARNING_DURATION = 4;
const STORY_WOLF_MIN_PLAYER_DISTANCE = 220;
const STORY_WOLF_MIN_LIVESTOCK_DISTANCE = 48;
const STORY_WOLF_THREAT_PLAYER_DISTANCE = 330;
const STORY_WOLF_THREAT_LIVESTOCK_DISTANCE = 250;
const STORY_WOLF_DANGER_LIVESTOCK_DISTANCE = 76;
const STORY_WOLF_HARD_SCENE_TIMEOUT = 18;
const HELPLESS_MINIMUM_BEFORE_DANGER_TRIGGER = 3;
const HELPLESS_TWO_ATTACK_TRIGGER = 8;
const HELPLESS_MAXIMUM_DURATION = 12;
const UNKNOWN_OLD_MAN_FIRST_LINE_DURATION = 2.5;
const UNKNOWN_OLD_MAN_SECOND_LINE_DURATION = 3.2;

const HOOFPRINT_TRAIL_STEPS = [0.18, 0.25, 0.43, 0.5, 0.66] as const;

export function createInitialStoryState(): StoryState {
  return {
    introCompleted: false,
    introSection: 0,
    introSectionElapsed: 0,
    introSectionHold: INTRO_SECTION_DURATION,
    introCamX: 0,
    introCamY: 0,
    introParentFade: 0,
    introTimeTarget: 6.5,
    introParentLift: 0,
    hearthQuestStarted: false,
    hearthWoodCollected: 0,
    campfireRelit: false,
    hearthQuestCompleted: false,
    activeMainObjective: null,
    hearthCompletionEffectRemaining: 0,
    hearthCompletionEffectShown: false,
    livestockQuestStarted: false,
    livestockNarrationShown: false,
    openingLivestockIds: [],
    openingLivestockAnchors: [],
    openingLivestockTotal: 0,
    livestockFoundIds: [],
    livestockReturnedIds: [],
    livestockQuestCompleted: false,
    livestockCompletionEffectRemaining: 0,
    livestockCompletionEffectShown: false,
    firstNightStage: "pending",
    firstNightStageRemaining: 0,
    firstDayTimeAccelerationStarted: false,
    firstDayEveningHoldActive: false,
    firstNightSunsetStarted: false,
    firstNightNormalTimeRestored: false,
    firstNightNarrationShown: false,
    firstNightWolfWarningShown: false,
    wolfThreatQuestStarted: false,
    storyWolfId: null,
    storyWolfSpawned: false,
    storyWolfSceneElapsed: 0,
    helplessPhaseElapsed: 0,
    storyWolfAttackAttempts: 0,
    storyWolfAttackInProgress: false,
    temporaryPlayerProtectionActive: false,
    temporaryLivestockProtectionActive: false,
    oldManArrivalStarted: false,
    oldManArrived: false,
    oldManArrivalElapsed: 0,
    shortDialogueStarted: false,
    shortDialogueCompleted: false,
    milestone3Completed: false,
    milestone4Started: false,
    storyWolfRedSignalSeen: false,
    storyWolfParryCompleted: false,
    storyWolfOpeningActive: false,
    storyWolfCounterCompleted: false,
    storyWolfDefeated: false,
    nightCompletionEffectRemaining: 0,
    nightCompletionEffectShown: false,
    milestone4Completed: false,
    milestone5Started: false,
    milestone5DialogueCompleted: false,
    milestone6Started: false,
    milestone6DialogueCompleted: false,
    milestone7Started: false,
    stormTracePos: null,
    stormTraceInspected: false,
    stormTraceEffectRemaining: 0,
    stormTraceDialogueCompleted: false,
    spiritPathOpened: false,
    spiritScoutDone: false,
    spiritAllowReturn: false,
    spiritOvooBuilt: false,
    spiritOvooSoulCollected: false,
    spiritOvooSoulActive: false,
    postSpiritScoutDialogueCompleted: false,
    milestone7Completed: false,
    milestone8Started: false,
    familyReunionEffectRemaining: 0,
    familyReunionEffectShown: false,
    familyReunionDialogueStarted: false,
    familyReunionDialogueCompleted: false,
    milestone8Completed: false,
  };
}

function createLegacyStoryState(): StoryState {
  return {
    introCompleted: true,
    introSection: OPENING_STORY_SECTIONS.length - 1,
    introSectionElapsed: INTRO_SECTION_DURATION,
    introSectionHold: INTRO_SECTION_DURATION,
    introCamX: 0,
    introCamY: 0,
    introParentFade: 0,
    introTimeTarget: 6.5,
    introParentLift: 0,
    hearthQuestStarted: true,
    hearthWoodCollected: CAMPFIRE_WOOD_COST,
    campfireRelit: true,
    hearthQuestCompleted: true,
    activeMainObjective: "findScatteredLivestock",
    hearthCompletionEffectRemaining: 0,
    hearthCompletionEffectShown: true,
    livestockQuestStarted: true,
    livestockNarrationShown: true,
    openingLivestockIds: [],
    openingLivestockAnchors: [],
    openingLivestockTotal: 0,
    livestockFoundIds: [],
    livestockReturnedIds: [],
    livestockQuestCompleted: false,
    livestockCompletionEffectRemaining: 0,
    livestockCompletionEffectShown: false,
    firstNightStage: "recoveringLivestock",
    firstNightStageRemaining: 0,
    firstDayTimeAccelerationStarted: true,
    firstDayEveningHoldActive: false,
    firstNightSunsetStarted: false,
    firstNightNormalTimeRestored: false,
    firstNightNarrationShown: false,
    firstNightWolfWarningShown: false,
    wolfThreatQuestStarted: false,
    storyWolfId: null,
    storyWolfSpawned: false,
    storyWolfSceneElapsed: 0,
    helplessPhaseElapsed: 0,
    storyWolfAttackAttempts: 0,
    storyWolfAttackInProgress: false,
    temporaryPlayerProtectionActive: false,
    temporaryLivestockProtectionActive: false,
    oldManArrivalStarted: false,
    oldManArrived: false,
    oldManArrivalElapsed: 0,
    shortDialogueStarted: false,
    shortDialogueCompleted: false,
    milestone3Completed: false,
    milestone4Started: false,
    storyWolfRedSignalSeen: false,
    storyWolfParryCompleted: false,
    storyWolfOpeningActive: false,
    storyWolfCounterCompleted: false,
    storyWolfDefeated: false,
    nightCompletionEffectRemaining: 0,
    nightCompletionEffectShown: false,
    milestone4Completed: false,
    milestone5Started: false,
    milestone5DialogueCompleted: false,
    milestone6Started: false,
    milestone6DialogueCompleted: false,
    milestone7Started: false,
    stormTracePos: null,
    stormTraceInspected: false,
    stormTraceEffectRemaining: 0,
    stormTraceDialogueCompleted: false,
    spiritPathOpened: false,
    spiritScoutDone: false,
    spiritAllowReturn: false,
    spiritOvooBuilt: false,
    spiritOvooSoulCollected: false,
    spiritOvooSoulActive: false,
    postSpiritScoutDialogueCompleted: false,
    milestone7Completed: false,
    milestone8Started: false,
    familyReunionEffectRemaining: 0,
    familyReunionEffectShown: false,
    familyReunionDialogueStarted: false,
    familyReunionDialogueCompleted: false,
    milestone8Completed: false,
  };
}

function isValidId(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function isValidIdList(value: unknown): value is number[] {
  if (!Array.isArray(value)) return false;
  for (let i = 0; i < value.length; i++) {
    const id = value[i];
    if (typeof id !== "number" || !isValidId(id)) return false;
    if (value.indexOf(id) !== i) return false;
  }
  return true;
}

function idsAreSubset(ids: number[], roster: number[]): boolean {
  for (const id of ids) if (!roster.includes(id)) return false;
  return true;
}

function isValidAnchorList(
  value: unknown,
  roster: number[],
): value is OpeningLivestockAnchor[] {
  if (!Array.isArray(value) || value.length !== roster.length) return false;
  for (let i = 0; i < value.length; i++) {
    const anchor = value[i] as Partial<OpeningLivestockAnchor> | null;
    if (
      !anchor ||
      typeof anchor.id !== "number" ||
      !isValidId(anchor.id) ||
      !roster.includes(anchor.id) ||
      value.findIndex(
        (other) =>
          (other as Partial<OpeningLivestockAnchor> | null)?.id === anchor.id,
      ) !== i ||
      !anchor.pos ||
      !Number.isFinite(anchor.pos.x) ||
      !Number.isFinite(anchor.pos.y)
    ) {
      return false;
    }
  }
  return true;
}

function normalizeIdList(value: number[] | undefined): number[] {
  const normalized: number[] = [];
  if (!Array.isArray(value)) return normalized;
  for (const id of value) {
    if (typeof id !== "number" || !isValidId(id) || normalized.includes(id)) {
      continue;
    }
    normalized.push(id);
  }
  return normalized;
}

function normalizeAnchorList(
  value: OpeningLivestockAnchor[] | undefined,
  roster: number[],
): OpeningLivestockAnchor[] {
  const normalized: OpeningLivestockAnchor[] = [];
  if (!Array.isArray(value)) return normalized;
  for (const anchor of value) {
    if (
      !anchor ||
      typeof anchor.id !== "number" ||
      !isValidId(anchor.id) ||
      !roster.includes(anchor.id) ||
      normalized.some((entry) => entry.id === anchor.id) ||
      !anchor.pos ||
      !Number.isFinite(anchor.pos.x) ||
      !Number.isFinite(anchor.pos.y)
    ) {
      continue;
    }
    normalized.push({
      id: anchor.id,
      pos: { x: anchor.pos.x, y: anchor.pos.y },
    });
  }
  return normalized;
}

function isFirstNightStage(value: unknown): value is FirstNightStage {
  return (
    value === "pending" ||
    value === "recoveringLivestock" ||
    value === "sunset" ||
    value === "nightNarration" ||
    value === "wolfWarning" ||
    value === "protecting" ||
    value === "elderIntervention" ||
    value === "elderApproach" ||
    value === "elderDialogue" ||
    value === "completed"
  );
}

const FIRST_NIGHT_STAGE_RANK: Record<FirstNightStage, number> = {
  pending: 0,
  recoveringLivestock: 1,
  sunset: 2,
  nightNarration: 3,
  wolfWarning: 4,
  protecting: 5,
  elderIntervention: 6,
  elderApproach: 7,
  elderDialogue: 8,
  completed: 9,
};

function firstNightStageAtLeast(
  stage: FirstNightStage,
  reference: FirstNightStage,
): boolean {
  return FIRST_NIGHT_STAGE_RANK[stage] >= FIRST_NIGHT_STAGE_RANK[reference];
}

function objectiveForFirstNightStage(
  stage: FirstNightStage,
): StoryState["activeMainObjective"] {
  if (stage === "pending") return "restoreHearth";
  if (stage === "recoveringLivestock" ||
      stage === "sunset" ||
      stage === "nightNarration" ||
      stage === "wolfWarning") {
    return "findScatteredLivestock";
  }
  if (stage === "completed") return "observeWolfMovement";
  return "protectFlock";
}

function normalizeFirstNightStage(
  value: unknown,
  livestockQuestStarted: boolean,
  livestockQuestCompleted: boolean,
  activeMainObjective: unknown,
): FirstNightStage {
  if (activeMainObjective === "growFlock") return "completed";
  if (!livestockQuestStarted) return "pending";
  if (!livestockQuestCompleted) return "recoveringLivestock";
  if (
    activeMainObjective === "observeWolfMovement" ||
    activeMainObjective === "parryStoryWolf" ||
    activeMainObjective === "counterStoryWolf" ||
    activeMainObjective === "talkToOldMan" ||
    activeMainObjective === "visitOldManAtDawn" ||
    activeMainObjective === "inspectStormTrace" ||
    value === "completed"
  ) {
    return "completed";
  }
  if (
    value === "elderIntervention" ||
    value === "elderApproach" ||
    value === "elderDialogue"
  ) {
    return value;
  }
  if (activeMainObjective === "protectFlock") return "protecting";
  if (
    value === "sunset" ||
    value === "nightNarration" ||
    value === "wolfWarning" ||
    value === "protecting"
  ) {
    return value;
  }
  return "sunset";
}

function isCompleteStoryState(
  story: Partial<StoryState> | null | undefined,
): story is StoryState {
  return !!(
    story &&
    typeof story.introCompleted === "boolean" &&
    typeof story.introSection === "number" &&
    typeof story.introSectionElapsed === "number" &&
    typeof story.introSectionHold === "number" &&
    typeof story.introCamX === "number" &&
    typeof story.introCamY === "number" &&
    typeof story.introParentFade === "number" &&
    typeof story.introTimeTarget === "number" &&
    typeof story.introParentLift === "number" &&
    typeof story.hearthQuestStarted === "boolean" &&
    (!story.hearthQuestStarted || story.introCompleted) &&
    typeof story.hearthWoodCollected === "number" &&
    typeof story.campfireRelit === "boolean" &&
    typeof story.hearthQuestCompleted === "boolean" &&
    (!story.hearthQuestCompleted ||
      (story.hearthQuestStarted && story.campfireRelit)) &&
    (story.activeMainObjective === null ||
      story.activeMainObjective === "restoreHearth" ||
      story.activeMainObjective === "findScatteredLivestock" ||
      story.activeMainObjective === "protectFlock" ||
      story.activeMainObjective === "observeWolfMovement" ||
      story.activeMainObjective === "parryStoryWolf" ||
      story.activeMainObjective === "counterStoryWolf" ||
      story.activeMainObjective === "talkToOldMan" ||
      story.activeMainObjective === "visitOldManAtDawn" ||
      story.activeMainObjective === "inspectStormTrace" ||
      story.activeMainObjective === "returnToOldManWithTrace" ||
      story.activeMainObjective === "talkAfterSpiritScout" ||
      story.activeMainObjective === "buildSpiritOvoo" ||
      story.activeMainObjective === "enterSpiritViaOvoo" ||
      story.activeMainObjective === "defeatSpiritGuards" ||
      story.activeMainObjective === "reachCursedGate" ||
      story.activeMainObjective === "defeatShulmasBaatar" ||
      story.activeMainObjective === "claimSkySword" ||
      story.activeMainObjective === "openBlackIronGate" ||
      story.activeMainObjective === "defeatTumurShulmas" ||
      story.activeMainObjective === "returnFromSpirit" ||
      story.activeMainObjective === "growFlock") &&
    typeof story.hearthCompletionEffectRemaining === "number" &&
    typeof story.hearthCompletionEffectShown === "boolean" &&
    typeof story.livestockQuestStarted === "boolean" &&
    (!story.livestockQuestStarted || story.hearthQuestCompleted) &&
    typeof story.livestockNarrationShown === "boolean" &&
    isValidIdList(story.openingLivestockIds) &&
    isValidAnchorList(
      story.openingLivestockAnchors,
      story.openingLivestockIds,
    ) &&
    story.openingLivestockTotal === story.openingLivestockIds.length &&
    isValidIdList(story.livestockFoundIds) &&
    idsAreSubset(story.livestockFoundIds, story.openingLivestockIds) &&
    isValidIdList(story.livestockReturnedIds) &&
    idsAreSubset(story.livestockReturnedIds, story.openingLivestockIds) &&
    idsAreSubset(story.livestockReturnedIds, story.livestockFoundIds) &&
    typeof story.livestockQuestCompleted === "boolean" &&
    (!story.livestockQuestCompleted ||
      (story.livestockQuestStarted &&
        story.openingLivestockTotal > 0 &&
        story.livestockFoundIds.length === story.openingLivestockTotal &&
        story.livestockReturnedIds.length ===
          story.openingLivestockTotal)) &&
    typeof story.livestockCompletionEffectRemaining === "number" &&
    typeof story.livestockCompletionEffectShown === "boolean" &&
    isFirstNightStage(story.firstNightStage) &&
    typeof story.firstNightStageRemaining === "number" &&
    Number.isFinite(story.firstNightStageRemaining) &&
    story.firstNightStageRemaining >= 0 &&
    typeof story.firstDayTimeAccelerationStarted === "boolean" &&
    typeof story.firstDayEveningHoldActive === "boolean" &&
    typeof story.firstNightSunsetStarted === "boolean" &&
    typeof story.firstNightNormalTimeRestored === "boolean" &&
    typeof story.firstNightNarrationShown === "boolean" &&
    typeof story.firstNightWolfWarningShown === "boolean" &&
    typeof story.wolfThreatQuestStarted === "boolean" &&
    (story.storyWolfId === null ||
      (typeof story.storyWolfId === "number" &&
        isValidId(story.storyWolfId))) &&
    typeof story.storyWolfSpawned === "boolean" &&
    (!story.storyWolfSpawned || story.storyWolfId !== null) &&
    typeof story.storyWolfSceneElapsed === "number" &&
    Number.isFinite(story.storyWolfSceneElapsed) &&
    story.storyWolfSceneElapsed >= 0 &&
    typeof story.helplessPhaseElapsed === "number" &&
    Number.isFinite(story.helplessPhaseElapsed) &&
    story.helplessPhaseElapsed >= 0 &&
    typeof story.storyWolfAttackAttempts === "number" &&
    Number.isSafeInteger(story.storyWolfAttackAttempts) &&
    story.storyWolfAttackAttempts >= 0 &&
    typeof story.storyWolfAttackInProgress === "boolean" &&
    typeof story.temporaryPlayerProtectionActive === "boolean" &&
    typeof story.temporaryLivestockProtectionActive === "boolean" &&
    typeof story.oldManArrivalStarted === "boolean" &&
    typeof story.oldManArrived === "boolean" &&
    typeof story.oldManArrivalElapsed === "number" &&
    Number.isFinite(story.oldManArrivalElapsed) &&
    story.oldManArrivalElapsed >= 0 &&
    typeof story.shortDialogueStarted === "boolean" &&
    typeof story.shortDialogueCompleted === "boolean" &&
    typeof story.milestone3Completed === "boolean" &&
    typeof story.milestone4Started === "boolean" &&
    typeof story.storyWolfRedSignalSeen === "boolean" &&
    typeof story.storyWolfParryCompleted === "boolean" &&
    typeof story.storyWolfOpeningActive === "boolean" &&
    typeof story.storyWolfCounterCompleted === "boolean" &&
    typeof story.storyWolfDefeated === "boolean" &&
    typeof story.nightCompletionEffectRemaining === "number" &&
    Number.isFinite(story.nightCompletionEffectRemaining) &&
    story.nightCompletionEffectRemaining >= 0 &&
    typeof story.nightCompletionEffectShown === "boolean" &&
    typeof story.milestone4Completed === "boolean" &&
    typeof story.milestone5Started === "boolean" &&
    typeof story.milestone5DialogueCompleted === "boolean" &&
    (!story.milestone5DialogueCompleted || story.milestone5Started) &&
    typeof story.milestone6Started === "boolean" &&
    typeof story.milestone6DialogueCompleted === "boolean" &&
    (!story.milestone6DialogueCompleted || story.milestone6Started) &&
    (!story.milestone6Started || story.milestone5DialogueCompleted) &&
    typeof story.milestone7Started === "boolean" &&
    (story.stormTracePos === null ||
      (story.stormTracePos !== undefined &&
        Number.isFinite(story.stormTracePos.x) &&
        Number.isFinite(story.stormTracePos.y))) &&
    typeof story.stormTraceInspected === "boolean" &&
    typeof story.stormTraceEffectRemaining === "number" &&
    Number.isFinite(story.stormTraceEffectRemaining) &&
    story.stormTraceEffectRemaining >= 0 &&
    typeof story.stormTraceDialogueCompleted === "boolean" &&
    typeof story.spiritPathOpened === "boolean" &&
    (story.spiritScoutDone === undefined ||
      typeof story.spiritScoutDone === "boolean") &&
    (story.spiritAllowReturn === undefined ||
      typeof story.spiritAllowReturn === "boolean") &&
    (story.spiritOvooBuilt === undefined ||
      typeof story.spiritOvooBuilt === "boolean") &&
    (story.postSpiritScoutDialogueCompleted === undefined ||
      typeof story.postSpiritScoutDialogueCompleted === "boolean") &&
    typeof story.milestone7Completed === "boolean" &&
    typeof story.milestone8Started === "boolean" &&
    typeof story.familyReunionEffectRemaining === "number" &&
    Number.isFinite(story.familyReunionEffectRemaining) &&
    story.familyReunionEffectRemaining >= 0 &&
    typeof story.familyReunionEffectShown === "boolean" &&
    typeof story.familyReunionDialogueStarted === "boolean" &&
    typeof story.familyReunionDialogueCompleted === "boolean" &&
    (!story.familyReunionDialogueCompleted ||
      story.familyReunionDialogueStarted) &&
    typeof story.milestone8Completed === "boolean" &&
    (!firstNightStageAtLeast(story.firstNightStage, "recoveringLivestock") ||
      story.firstDayTimeAccelerationStarted) &&
    (!firstNightStageAtLeast(story.firstNightStage, "sunset") ||
      story.firstNightSunsetStarted) &&
    (!firstNightStageAtLeast(story.firstNightStage, "nightNarration") ||
      (story.firstNightNormalTimeRestored &&
        story.firstNightNarrationShown)) &&
    (!firstNightStageAtLeast(story.firstNightStage, "wolfWarning") ||
      story.firstNightWolfWarningShown) &&
    (!firstNightStageAtLeast(story.firstNightStage, "protecting") ||
      story.wolfThreatQuestStarted) &&
    (!firstNightStageAtLeast(story.firstNightStage, "elderIntervention") ||
      story.oldManArrivalStarted) &&
    (!firstNightStageAtLeast(story.firstNightStage, "elderIntervention") ||
      story.shortDialogueStarted) &&
    (story.firstNightStage === "completed"
      ? story.shortDialogueCompleted && story.milestone3Completed
      : !story.milestone3Completed) &&
    ((story.firstNightStage === "pending" &&
      !story.livestockQuestStarted &&
      !story.livestockQuestCompleted &&
      ((story.activeMainObjective === null && !story.hearthQuestStarted) ||
        (story.activeMainObjective === "restoreHearth" &&
          story.hearthQuestStarted))) ||
      (story.firstNightStage === "recoveringLivestock" &&
        story.livestockQuestStarted &&
        !story.livestockQuestCompleted &&
        story.activeMainObjective === "findScatteredLivestock") ||
      ((story.firstNightStage === "sunset" ||
        story.firstNightStage === "nightNarration" ||
        story.firstNightStage === "wolfWarning") &&
        story.livestockQuestStarted &&
        story.livestockQuestCompleted &&
        story.activeMainObjective === "findScatteredLivestock") ||
      ((story.firstNightStage === "protecting" ||
        story.firstNightStage === "elderIntervention" ||
        story.firstNightStage === "elderApproach" ||
        story.firstNightStage === "elderDialogue") &&
        story.livestockQuestStarted &&
        story.livestockQuestCompleted &&
        story.activeMainObjective === "protectFlock") ||
      (story.firstNightStage === "completed" &&
        story.livestockQuestStarted &&
        story.livestockQuestCompleted &&
        story.milestone3Completed &&
        ((story.activeMainObjective === null &&
          (story.nightCompletionEffectRemaining > 0 ||
            story.postSpiritScoutDialogueCompleted === true)) ||
          story.activeMainObjective === "observeWolfMovement" ||
          story.activeMainObjective === "parryStoryWolf" ||
          story.activeMainObjective === "counterStoryWolf" ||
          (story.oldManArrived &&
            (story.activeMainObjective === "talkToOldMan" ||
              story.activeMainObjective === "visitOldManAtDawn" ||
              story.activeMainObjective === "inspectStormTrace" ||
              story.activeMainObjective === "returnToOldManWithTrace" ||
              story.activeMainObjective === "talkAfterSpiritScout" ||
              story.activeMainObjective === "buildSpiritOvoo" ||
              story.activeMainObjective === "enterSpiritViaOvoo" ||
              story.activeMainObjective === "defeatSpiritGuards" ||
              story.activeMainObjective === "reachCursedGate" ||
              story.activeMainObjective === "defeatShulmasBaatar" ||
              story.activeMainObjective === "claimSkySword" ||
              story.activeMainObjective === "openBlackIronGate" ||
              story.activeMainObjective === "defeatTumurShulmas" ||
              story.activeMainObjective === "returnFromSpirit" ||
              story.activeMainObjective === "growFlock"))))) &&
    ((story.firstNightStage === "sunset" &&
      story.firstNightStageRemaining > 0 &&
      story.firstNightStageRemaining <= FIRST_NIGHT_SUNSET_DURATION) ||
      (story.firstNightStage === "nightNarration" &&
        story.firstNightStageRemaining > 0 &&
        story.firstNightStageRemaining <= FIRST_NIGHT_NARRATION_DURATION) ||
      (story.firstNightStage === "wolfWarning" &&
        story.firstNightStageRemaining > 0 &&
        story.firstNightStageRemaining <=
          FIRST_NIGHT_WOLF_WARNING_DURATION) ||
      ((story.firstNightStage === "pending" ||
        story.firstNightStage === "recoveringLivestock" ||
        story.firstNightStage === "protecting" ||
        story.firstNightStage === "elderIntervention" ||
        story.firstNightStage === "elderApproach" ||
        story.firstNightStage === "elderDialogue" ||
        story.firstNightStage === "completed") &&
        story.firstNightStageRemaining === 0))
  );
}

export function normalizeLoadedStoryState(
  story: Partial<StoryState> | null | undefined,
): StoryState {
  if (!story) return createLegacyStoryState();

  const legacyOpeningComplete =
    story.introCompleted === true &&
    story.hearthQuestStarted === undefined &&
    story.hearthQuestCompleted === undefined;
  const livestockQuestCompleted = story.livestockQuestCompleted === true;
  const hearthQuestCompleted =
    story.hearthQuestCompleted === true ||
    legacyOpeningComplete ||
    story.livestockQuestStarted === true ||
    livestockQuestCompleted;
  const introCompleted =
    story.introCompleted === true ||
    story.hearthQuestStarted === true ||
    hearthQuestCompleted;
  const hearthQuestStarted =
    story.hearthQuestStarted === true || introCompleted || hearthQuestCompleted;
  const rawSection = Number.isFinite(story.introSection)
    ? (story.introSection ?? 0)
    : 0;
  const rawElapsed = Number.isFinite(story.introSectionElapsed)
    ? (story.introSectionElapsed ?? 0)
    : 0;
  const rawWood = Number.isFinite(story.hearthWoodCollected)
    ? (story.hearthWoodCollected ?? 0)
    : 0;
  const openingLivestockIds = normalizeIdList(story.openingLivestockIds);
  const openingLivestockAnchors = normalizeAnchorList(
    story.openingLivestockAnchors,
    openingLivestockIds,
  );
  const rawFoundIds = normalizeIdList(story.livestockFoundIds).filter((id) =>
    openingLivestockIds.includes(id),
  );
  const livestockReturnedIds = normalizeIdList(
    story.livestockReturnedIds,
  ).filter((id) => openingLivestockIds.includes(id));
  const livestockFoundIds = livestockQuestCompleted
    ? [...openingLivestockIds]
    : [...rawFoundIds];
  for (const id of livestockReturnedIds) {
    if (!livestockFoundIds.includes(id)) livestockFoundIds.push(id);
  }
  if (livestockQuestCompleted) {
    livestockReturnedIds.splice(
      0,
      livestockReturnedIds.length,
      ...openingLivestockIds,
    );
  }
  const livestockQuestStarted =
    livestockQuestCompleted ||
    (hearthQuestCompleted && (story.livestockQuestStarted ?? true));
  let firstNightStage = normalizeFirstNightStage(
    story.firstNightStage,
    livestockQuestStarted,
    livestockQuestCompleted,
    story.activeMainObjective,
  );
  if (
    story.firstNightStage === firstNightStage &&
    story.firstNightStageRemaining === 0
  ) {
    if (firstNightStage === "sunset") firstNightStage = "nightNarration";
    else if (firstNightStage === "nightNarration") {
      firstNightStage = "wolfWarning";
    } else if (firstNightStage === "wolfWarning") {
      firstNightStage = "protecting";
    }
  }
  const hasSavedFirstNightTimer =
    story.firstNightStage === firstNightStage &&
    typeof story.firstNightStageRemaining === "number" &&
    Number.isFinite(story.firstNightStageRemaining) &&
    story.firstNightStageRemaining > 0;
  const rawFirstNightStageRemaining = hasSavedFirstNightTimer
    ? (story.firstNightStageRemaining ?? 0)
    : 0;
  const firstNightStageRemaining =
    firstNightStage === "sunset"
      ? hasSavedFirstNightTimer
        ? clamp(
            rawFirstNightStageRemaining,
            0,
            FIRST_NIGHT_SUNSET_DURATION,
          )
        : FIRST_NIGHT_SUNSET_DURATION
      : firstNightStage === "nightNarration"
        ? hasSavedFirstNightTimer
          ? clamp(
              rawFirstNightStageRemaining,
              0,
              FIRST_NIGHT_NARRATION_DURATION,
            )
          : FIRST_NIGHT_NARRATION_DURATION
        : firstNightStage === "wolfWarning"
          ? hasSavedFirstNightTimer
            ? clamp(
                rawFirstNightStageRemaining,
                0,
                FIRST_NIGHT_WOLF_WARNING_DURATION,
              )
            : FIRST_NIGHT_WOLF_WARNING_DURATION
          : 0;
  const storyWolfId =
    typeof story.storyWolfId === "number" && isValidId(story.storyWolfId)
      ? story.storyWolfId
      : null;
  const milestone3Completed =
    firstNightStage === "completed" || story.milestone3Completed === true;
  const milestone6DialogueCompleted =
    story.milestone6DialogueCompleted === true;
  const milestone6Started =
    story.milestone6Started === true || milestone6DialogueCompleted;
  const stormTraceInspected = story.stormTraceInspected === true;
  const stormTraceDialogueCompleted =
    story.stormTraceDialogueCompleted === true;
  const spiritPathOpened =
    story.spiritPathOpened === true || stormTraceDialogueCompleted;
  const postSpiritScoutDialogueCompleted =
    story.postSpiritScoutDialogueCompleted === true;
  const spiritScoutDone =
    story.spiritScoutDone === true || postSpiritScoutDialogueCompleted;
  const spiritOvooBuilt = story.spiritOvooBuilt === true;
  const milestone7Completed = story.milestone7Completed === true;
  const milestone7Started =
    story.milestone7Started === true ||
    stormTraceInspected ||
    stormTraceDialogueCompleted ||
    spiritPathOpened ||
    milestone7Completed;
  const milestone8Completed = story.milestone8Completed === true;
  const familyReunionDialogueCompleted =
    story.familyReunionDialogueCompleted === true || milestone8Completed;
  const familyReunionDialogueStarted =
    story.familyReunionDialogueStarted === true ||
    familyReunionDialogueCompleted;
  const milestone8Started =
    story.milestone8Started === true ||
    familyReunionDialogueStarted ||
    story.familyReunionEffectShown === true ||
    milestone8Completed;
  const stormTracePos =
    story.stormTracePos &&
    Number.isFinite(story.stormTracePos.x) &&
    Number.isFinite(story.stormTracePos.y)
      ? {
          x: clamp(story.stormTracePos.x, 40, WORLD_W - 40),
          y: clamp(story.stormTracePos.y, 40, WORLD_H - 40),
        }
      : null;
  const milestone5DialogueCompleted =
    story.milestone5DialogueCompleted === true || milestone6Started;
  const milestone5Started =
    story.milestone5Started === true || milestone5DialogueCompleted;
  const milestone4Completed =
    story.milestone4Completed === true || milestone5Started;
  const storyWolfParryCompleted =
    story.storyWolfParryCompleted === true ||
    story.storyWolfCounterCompleted === true ||
    story.storyWolfDefeated === true ||
    milestone4Completed;
  const storyWolfCounterCompleted =
    story.storyWolfCounterCompleted === true ||
    story.storyWolfDefeated === true ||
    milestone4Completed;
  const storyWolfDefeated =
    story.storyWolfDefeated === true || milestone4Completed;
  const oldManArrived = story.oldManArrived === true;
  const scriptedProtectionExpected =
    firstNightStage === "protecting" ||
    firstNightStage === "elderIntervention" ||
    firstNightStage === "elderApproach" ||
    firstNightStage === "elderDialogue" ||
    (firstNightStage === "completed" &&
      (!oldManArrived || !milestone4Completed));
  const rawStoryWolfSceneElapsed = Number.isFinite(
    story.storyWolfSceneElapsed,
  )
    ? (story.storyWolfSceneElapsed ?? 0)
    : 0;
  const rawHelplessPhaseElapsed = Number.isFinite(story.helplessPhaseElapsed)
    ? (story.helplessPhaseElapsed ?? 0)
    : 0;
  const rawAttackAttempts = Number.isSafeInteger(story.storyWolfAttackAttempts)
    ? (story.storyWolfAttackAttempts ?? 0)
    : 0;
  const rawOldManArrivalElapsed = Number.isFinite(
    story.oldManArrivalElapsed,
  )
    ? (story.oldManArrivalElapsed ?? 0)
    : 0;

  return {
    introCompleted,
    introSection: Math.floor(
      clamp(rawSection, 0, OPENING_STORY_SECTIONS.length - 1),
    ),
    introSectionElapsed: clamp(rawElapsed, 0, INTRO_SECTION_MAX_DURATION),
    introSectionHold: clamp(
      Number.isFinite(story.introSectionHold)
        ? (story.introSectionHold as number)
        : INTRO_SECTION_DURATION,
      INTRO_SECTION_DURATION,
      INTRO_SECTION_MAX_DURATION,
    ),
    introCamX: Number.isFinite(story.introCamX) ? (story.introCamX as number) : 0,
    introCamY: Number.isFinite(story.introCamY) ? (story.introCamY as number) : 0,
    introParentFade: Number.isFinite(story.introParentFade)
      ? clamp(story.introParentFade as number, 0, 1)
      : 0,
    introTimeTarget: Number.isFinite(story.introTimeTarget)
      ? (story.introTimeTarget as number)
      : 6.5,
    introParentLift: Number.isFinite(story.introParentLift)
      ? clamp(story.introParentLift as number, 0, 40)
      : 0,
    hearthQuestStarted,
    hearthWoodCollected: hearthQuestCompleted
      ? CAMPFIRE_WOOD_COST
      : clamp(rawWood, 0, CAMPFIRE_WOOD_COST),
    campfireRelit: story.campfireRelit === true || hearthQuestCompleted,
    hearthQuestCompleted,
    activeMainObjective:
      firstNightStage === "pending"
        ? hearthQuestStarted
          ? "restoreHearth"
          : null
        : firstNightStage === "completed"
          ? story.activeMainObjective === "growFlock" ||
            story.activeMainObjective === "returnFromSpirit" ||
            story.activeMainObjective === "defeatTumurShulmas" ||
            story.activeMainObjective === "openBlackIronGate" ||
            story.activeMainObjective === "claimSkySword" ||
            story.activeMainObjective === "defeatShulmasBaatar" ||
            story.activeMainObjective === "reachCursedGate" ||
            story.activeMainObjective === "defeatSpiritGuards" ||
            story.activeMainObjective === "enterSpiritViaOvoo" ||
            story.activeMainObjective === "buildSpiritOvoo" ||
            story.activeMainObjective === "talkAfterSpiritScout" ||
            story.activeMainObjective === "returnToOldManWithTrace" ||
            story.activeMainObjective === "inspectStormTrace" ||
            story.activeMainObjective === "visitOldManAtDawn" ||
            story.activeMainObjective === "talkToOldMan" ||
            story.activeMainObjective === "counterStoryWolf" ||
            story.activeMainObjective === "parryStoryWolf" ||
            story.activeMainObjective === "observeWolfMovement"
            ? story.activeMainObjective === "buildSpiritOvoo" ||
              story.activeMainObjective === "enterSpiritViaOvoo"
              ? null
              : story.activeMainObjective
            : familyReunionDialogueCompleted
              ? "growFlock"
              : spiritPathOpened
                ? spiritScoutDone
                  ? postSpiritScoutDialogueCompleted
                    ? null
                    : "talkAfterSpiritScout"
                  : "defeatSpiritGuards"
              : stormTraceInspected
                ? "returnToOldManWithTrace"
                : milestone6DialogueCompleted
              ? "inspectStormTrace"
              : milestone5DialogueCompleted
                ? "visitOldManAtDawn"
                : milestone4Completed
                ? "talkToOldMan"
                : storyWolfParryCompleted
                  ? "counterStoryWolf"
                  : "observeWolfMovement"
          : objectiveForFirstNightStage(firstNightStage),
    hearthCompletionEffectRemaining: 0,
    hearthCompletionEffectShown:
      story.hearthCompletionEffectShown ?? hearthQuestCompleted,
    livestockQuestStarted,
    livestockNarrationShown:
      livestockQuestCompleted || (story.livestockNarrationShown ?? false),
    openingLivestockIds,
    openingLivestockAnchors,
    openingLivestockTotal: openingLivestockIds.length,
    livestockFoundIds,
    livestockReturnedIds,
    livestockQuestCompleted,
    livestockCompletionEffectRemaining: 0,
    livestockCompletionEffectShown:
      livestockQuestCompleted ||
      (story.livestockCompletionEffectShown ?? false),
    firstNightStage,
    firstNightStageRemaining,
    firstDayTimeAccelerationStarted:
      story.firstDayTimeAccelerationStarted === true ||
      firstNightStageAtLeast(firstNightStage, "recoveringLivestock"),
    firstDayEveningHoldActive:
      firstNightStage === "recoveringLivestock" &&
      story.firstDayEveningHoldActive === true,
    firstNightSunsetStarted:
      story.firstNightSunsetStarted === true ||
      firstNightStageAtLeast(firstNightStage, "sunset"),
    firstNightNormalTimeRestored:
      story.firstNightNormalTimeRestored === true ||
      firstNightStageAtLeast(firstNightStage, "nightNarration"),
    firstNightNarrationShown:
      story.firstNightNarrationShown === true ||
      firstNightStageAtLeast(firstNightStage, "nightNarration"),
    firstNightWolfWarningShown:
      story.firstNightWolfWarningShown === true ||
      firstNightStageAtLeast(firstNightStage, "wolfWarning"),
    wolfThreatQuestStarted:
      story.wolfThreatQuestStarted === true ||
      firstNightStageAtLeast(firstNightStage, "protecting"),
    storyWolfId,
    storyWolfSpawned:
      storyWolfId !== null &&
      (story.storyWolfSpawned === true ||
        firstNightStageAtLeast(firstNightStage, "protecting")),
    storyWolfSceneElapsed: Math.max(0, rawStoryWolfSceneElapsed),
    helplessPhaseElapsed: Math.max(0, rawHelplessPhaseElapsed),
    storyWolfAttackAttempts: Math.max(0, Math.floor(rawAttackAttempts)),
    storyWolfAttackInProgress:
      firstNightStage === "protecting" &&
      story.storyWolfAttackInProgress === true,
    temporaryPlayerProtectionActive:
      scriptedProtectionExpected,
    temporaryLivestockProtectionActive:
      scriptedProtectionExpected,
    oldManArrivalStarted:
      story.oldManArrivalStarted === true ||
      firstNightStageAtLeast(firstNightStage, "elderIntervention"),
    oldManArrived,
    oldManArrivalElapsed: Math.max(0, rawOldManArrivalElapsed),
    shortDialogueStarted:
      story.shortDialogueStarted === true ||
      firstNightStageAtLeast(firstNightStage, "elderIntervention"),
    shortDialogueCompleted:
      story.shortDialogueCompleted === true || milestone3Completed,
    milestone3Completed,
    milestone4Started:
      story.milestone4Started === true ||
      (milestone3Completed && !milestone4Completed),
    storyWolfRedSignalSeen:
      story.storyWolfRedSignalSeen === true || storyWolfParryCompleted,
    storyWolfParryCompleted,
    storyWolfOpeningActive:
      !storyWolfDefeated &&
      storyWolfParryCompleted &&
      !storyWolfCounterCompleted &&
      story.storyWolfOpeningActive !== false,
    storyWolfCounterCompleted,
    storyWolfDefeated,
    nightCompletionEffectRemaining: milestone4Completed
      ? 0
      : Math.max(
          0,
          Number.isFinite(story.nightCompletionEffectRemaining)
            ? (story.nightCompletionEffectRemaining ?? 0)
            : 0,
        ),
    nightCompletionEffectShown:
      story.nightCompletionEffectShown === true ||
      storyWolfDefeated ||
      milestone4Completed,
    milestone4Completed,
    milestone5Started,
    milestone5DialogueCompleted,
    milestone6Started,
    milestone6DialogueCompleted,
    milestone7Started,
    stormTracePos,
    stormTraceInspected,
    stormTraceEffectRemaining: Math.max(
      0,
      Number.isFinite(story.stormTraceEffectRemaining)
        ? (story.stormTraceEffectRemaining ?? 0)
        : 0,
    ),
    stormTraceDialogueCompleted,
    spiritPathOpened,
    spiritScoutDone,
    spiritAllowReturn: story.spiritAllowReturn === true,
    spiritOvooBuilt,
    spiritOvooSoulCollected: story.spiritOvooSoulCollected === true,
    spiritOvooSoulActive: story.spiritOvooSoulActive === true,
    postSpiritScoutDialogueCompleted,
    milestone7Completed,
    milestone8Started,
    familyReunionEffectRemaining: familyReunionDialogueStarted
      ? 0
      : Math.max(
          0,
          Number.isFinite(story.familyReunionEffectRemaining)
            ? (story.familyReunionEffectRemaining ?? 0)
            : 0,
        ),
    familyReunionEffectShown:
      story.familyReunionEffectShown === true || familyReunionDialogueStarted,
    familyReunionDialogueStarted,
    familyReunionDialogueCompleted,
    milestone8Completed,
  };
}

function ensureOpeningLivestockRoster(state: GameState): void {
  const story = state.story;
  if (
    story.openingLivestockIds.length > 0 &&
      story.openingLivestockAnchors.length ===
        story.openingLivestockIds.length
  ) {
    if (story.livestockQuestCompleted) {
      story.livestockFoundIds = [...story.openingLivestockIds];
      story.livestockReturnedIds = [...story.openingLivestockIds];
    }
    return;
  }

  if (story.openingLivestockIds.length === 0) {
    for (const animal of state.world.flock.visuals) {
      if (!story.openingLivestockIds.includes(animal.id)) {
        story.openingLivestockIds.push(animal.id);
      }
    }
    story.openingLivestockTotal = story.openingLivestockIds.length;
  }

  for (const id of story.openingLivestockIds) {
    if (story.openingLivestockAnchors.some((anchor) => anchor.id === id)) {
      continue;
    }
    const animal = state.world.flock.visuals.find((entry) => entry.id === id);
    if (!animal) continue;
    story.openingLivestockAnchors.push({
      id,
      pos: { x: animal.pos.x, y: animal.pos.y },
    });
  }
  if (story.livestockQuestCompleted) {
    story.livestockFoundIds = [...story.openingLivestockIds];
    story.livestockReturnedIds = [...story.openingLivestockIds];
  }
}

export function ensureStoryState(state: GameState): void {
  const story: Partial<StoryState> | null | undefined = state.story;
  if (!isCompleteStoryState(story)) {
    state.story = normalizeLoadedStoryState(story);
  }
  ensureOpeningLivestockRoster(state);
  const elder = state.world.elder;
  if (
    elder.pose !== "seated" &&
    elder.pose !== "walking" &&
    elder.pose !== "standing"
  ) {
    elder.pose = state.story.oldManArrivalStarted ? "standing" : "seated";
  }
  if (elder.face !== -1 && elder.face !== 1) elder.face = -1;
  if (!Number.isFinite(elder.walkPhase)) elder.walkPhase = 0;
  if (
    state.world.dayNumber > 1 &&
    state.story.livestockQuestCompleted &&
    !firstNightStageAtLeast(state.story.firstNightStage, "protecting")
  ) {
    state.story.firstNightStage = "protecting";
    state.story.firstNightStageRemaining = 0;
    state.story.activeMainObjective = "protectFlock";
    state.story.firstDayTimeAccelerationStarted = true;
    state.story.firstDayEveningHoldActive = false;
    state.story.firstNightSunsetStarted = true;
    state.story.firstNightNormalTimeRestored = true;
    state.story.firstNightNarrationShown = true;
    state.story.firstNightWolfWarningShown = true;
    state.story.wolfThreatQuestStarted = true;
    state.story.temporaryPlayerProtectionActive = true;
    state.story.temporaryLivestockProtectionActive = true;
  }
}

export function openingStoryControlsWorldTime(state: GameState): boolean {
  return (
    state.world.dayNumber === 1 &&
    state.story.activeMainObjective !== null &&
    !state.story.firstNightNormalTimeRestored
  );
}

function openingLivestockSpotIsClear(
  state: GameState,
  pos: Vector2,
  placed: OpeningLivestockAnchor[],
): boolean {
  const world = state.world;
  if (
    pos.x < 60 ||
    pos.x > world.width - 60 ||
    pos.y < 60 ||
    pos.y > world.height - 60 ||
    isInRiver(pos, 36) ||
    pos.x >= world.firstRoute.startX - 100 ||
    dist(pos, world.campPos) < 520 ||
    dist(pos, world.campfire.pos) < world.campfire.radius + 24 ||
    dist(pos, world.feeder.pos) < world.feeder.radius + 24 ||
    dist(pos, penCenter(world)) < PEN_RADIUS + 36 ||
    dist(pos, world.elder.pos) < world.elder.radius + 38 ||
    dist(pos, world.elder.gerPos) < 82 ||
    dist(pos, world.firstRoute.gatePos) < world.firstRoute.gateRadius + 90 ||
    dist(pos, world.firstRoute.arenaCenter) < world.firstRoute.arenaRadius + 80 ||
    dist(pos, world.tumurShulmas.gatePos) < world.tumurShulmas.gateRadius + 80 ||
    dist(pos, world.tumurShulmas.arenaCenter) <
      world.tumurShulmas.arenaRadius + 80
  ) {
    return false;
  }

  for (const anchor of placed) if (dist(pos, anchor.pos) < 58) return false;
  for (const fence of world.fences) {
    if (dist(pos, fence.pos) < fence.radius + 24) return false;
  }
  for (const tree of world.trees) {
    if (tree.hp > 0 && dist(pos, tree.pos) < tree.radius + 22) return false;
  }
  for (const bush of world.bushes) {
    if (dist(pos, bush.pos) < bush.radius + 20) return false;
  }
  return true;
}

function resolveOpeningLivestockSpot(
  state: GameState,
  preferred: Vector2,
  placed: OpeningLivestockAnchor[],
): Vector2 {
  for (let attempt = 0; attempt < 48; attempt++) {
    const ring = attempt === 0 ? 0 : 12 + Math.floor((attempt - 1) / 8) * 18;
    const angle = attempt * 2.399963;
    const candidate = {
      x: clamp(
        preferred.x + Math.cos(angle) * ring,
        60,
        state.world.width - 60,
      ),
      y: clamp(
        preferred.y + Math.sin(angle) * ring,
        60,
        state.world.height - 60,
      ),
    };
    if (openingLivestockSpotIsClear(state, candidate, placed)) {
      return candidate;
    }
  }

  const camp = state.world.campPos;
  for (let row = 0; row < 7; row++) {
    for (let column = 0; column < 8; column++) {
      const candidate = {
        x: camp.x + 160 + column * 72,
        y: camp.y - 300 + row * 72,
      };
      if (openingLivestockSpotIsClear(state, candidate, placed)) {
        return candidate;
      }
    }
  }
  return { x: preferred.x, y: preferred.y };
}

/** Шинэ тоглоомд эхний сүргийг нэг удаа тарааж, тогтвортой id/буурийг нь хадгална. */
export function initializeOpeningLivestock(state: GameState): void {
  const story = state.story;
  if (story.openingLivestockIds.length > 0) return;

  const anchors: OpeningLivestockAnchor[] = [];
  const camp = state.world.campPos;
  let otherSeen = 0;

  for (const animal of state.world.flock.visuals) {
    // Эхлэлийн дэлгэцээс хол — хайж олох ёстой
    let preferred: Vector2;
    if (animal.kind === "sheep") {
      preferred = { x: camp.x - 720, y: camp.y - 380 };
    } else if (animal.kind === "goat") {
      preferred = { x: camp.x + 780, y: camp.y - 420 };
    } else if (animal.kind === "cattle") {
      preferred = { x: camp.x - 640, y: camp.y + 520 };
    } else {
      const angle = -0.8 + otherSeen * 0.55;
      const radius = 700 + otherSeen++ * 90;
      preferred = {
        x: camp.x + Math.cos(angle) * radius,
        y: camp.y + Math.sin(angle) * radius,
      };
    }

    const pos = resolveOpeningLivestockSpot(state, preferred, anchors);
    animal.pos.x = pos.x;
    animal.pos.y = pos.y;
    animal.vel.x = 0;
    animal.vel.y = 0;
    anchors.push({ id: animal.id, pos: { x: pos.x, y: pos.y } });
  }

  story.openingLivestockIds = anchors.map((anchor) => anchor.id);
  story.openingLivestockAnchors = anchors;
  story.openingLivestockTotal = story.openingLivestockIds.length;
  story.livestockFoundIds = [];
  story.livestockReturnedIds = [];
}

function startHearthQuest(state: GameState): void {
  const story = state.story;
  if (story.hearthQuestCompleted) return;
  story.hearthQuestStarted = true;
  story.activeMainObjective = "restoreHearth";
  setMessage(state, HEARTH_QUEST.description, 5);
}

export function beginOpeningSequence(state: GameState): void {
  if (state.story.introCompleted) {
    state.phase = "playing";
    if (!state.story.hearthQuestStarted) startHearthQuest(state);
    return;
  }

  introWitchLaughPlayed = false;
  state.phase = "intro";
  state.story.introSection = 0;
  state.story.introSectionElapsed = 0;
  state.story.introSectionHold = INTRO_SECTION_DURATION;
  state.player.moving = false;
  state.message = "";
  state.messageTimer = 0;
  spawnIntroCinematicParents(state);
  // Хүүг түр ард байлгана — эхлээд аав ээжийн дүр харагдана
  state.player.pos.x = state.world.campPos.x + 8;
  state.player.pos.y = state.world.campPos.y + 110;
  applyOpeningVignette(state, 0);
  setOpeningAmbient(openingAmbientForVignette("stormNight"));
}

function applyOpeningVignette(state: GameState, sectionIndex: number): void {
  const section =
    OPENING_STORY_SECTIONS[
      clamp(sectionIndex, 0, OPENING_STORY_SECTIONS.length - 1)
    ]!;
  const camp = state.world.campPos;
  // Цагийг гэнэт солихгүй — зөөлөн уусгана
  state.story.introTimeTarget = section.timeOfDay;
  if (section.vignette !== "coldDawn") {
    state.world.timeOfDay = section.timeOfDay;
    state.world.weather = section.weather;
  } else {
    // Үүр: шуурганаас үлдээд аажим цайруулна
    state.world.weather = "storm";
  }
  state.world.dayPhase = getDayPhase(state.world.timeOfDay, state.world.season);
  if (section.weather === "storm" || section.vignette === "coldDawn") {
    state.world.groundWetness = Math.max(state.world.groundWetness, 0.75);
  }
  state.story.introCamX = clamp(
    camp.x + section.camOffset.x,
    VIEW_W / 2,
    WORLD_W - VIEW_W / 2,
  );
  state.story.introCamY = clamp(
    camp.y + section.camOffset.y,
    VIEW_H / 2,
    WORLD_H - VIEW_H / 2,
  );

  if (section.vignette === "stormNight") {
    state.story.introParentFade = 1;
    state.story.introParentLift = 0;
    if (state.parents) {
      state.parents.father.pos.x = camp.x - 36;
      state.parents.father.pos.y = camp.y + 48;
      state.parents.mother.pos.x = camp.x + 40;
      state.parents.mother.pos.y = camp.y + 52;
      state.parents.father.moving = false;
      state.parents.mother.moving = false;
      state.parents.father.workPulse = 0;
      state.parents.mother.workPulse = 0;
      state.parents.father.face = 1;
      state.parents.mother.face = -1;
    }
    state.player.pos.x = camp.x + 8;
    state.player.pos.y = camp.y + 72;
    state.player.moving = false;
    state.player.facing.x = -1;
  } else if (section.vignette === "laughingStorm") {
    state.story.introParentFade = 1;
    state.story.introParentLift = 0;
    if (state.parents) {
      state.parents.father.moving = false;
      state.parents.mother.moving = false;
      state.parents.father.workPulse = 0;
      state.parents.mother.workPulse = 0;
      state.parents.father.face = -1;
      state.parents.mother.face = -1;
    }
    state.player.pos.x = camp.x + 8;
    state.player.pos.y = camp.y + 72;
    state.player.facing.x = -1;
    state.player.moving = true;
  } else {
    state.story.introParentFade = 0;
    state.story.introParentLift = 0;
    clearIntroCinematicParents(state);
    state.player.pos.x = camp.x;
    state.player.pos.y = camp.y + 58;
    state.player.moving = false;
  }
}

function restoreWorldAfterIntro(state: GameState): void {
  state.world.timeOfDay = 5.9;
  state.world.weather = "wind";
  state.world.groundWetness = Math.min(state.world.groundWetness, 0.45);
  state.world.dayPhase = getDayPhase(5.9, state.world.season);
  state.story.introTimeTarget = 5.9;
  state.story.introParentLift = 0;
}

function finishOpeningSequence(state: GameState): void {
  stopOpeningAmbient();
  clearIntroCinematicParents(state);
  restoreWorldAfterIntro(state);
  state.player.pos.x = state.world.campPos.x;
  state.player.pos.y = state.world.campPos.y + 58;
  state.story.introCompleted = true;
  state.story.introSection = OPENING_STORY_SECTIONS.length - 1;
  state.story.introSectionElapsed = INTRO_SECTION_DURATION;
  state.story.introSectionHold = INTRO_SECTION_DURATION;
  state.input.confirm = false;
  state.input.interact = false;
  state.phase = "playing";
  startHearthQuest(state);
}

export function updateOpeningSequence(state: GameState, dt: number): void {
  if (state.phase !== "intro") return;

  state.player.moving = false;
  if (state.input.confirm || state.input.interact) {
    finishOpeningSequence(state);
    return;
  }

  const section =
    OPENING_STORY_SECTIONS[
      clamp(state.story.introSection, 0, OPENING_STORY_SECTIONS.length - 1)
    ]!;
  // Ambient: цаг/шуурга амьд харагдана
  state.world.elapsed += dt;

  // Цагийг зорилт руу зөөлөн уусгана (ялангуяа үүр)
  const timeBlend =
    section.vignette === "coldDawn" ? Math.min(1, dt * 0.38) : Math.min(1, dt * 1.8);
  state.world.timeOfDay +=
    (state.story.introTimeTarget - state.world.timeOfDay) * timeBlend;
  state.world.dayPhase = getDayPhase(
    state.world.timeOfDay,
    state.world.season,
  );
  if (section.vignette === "coldDawn") {
    const hold = Math.max(state.story.introSectionHold, INTRO_SECTION_DURATION);
    const dawnT = clamp(state.story.introSectionElapsed / hold, 0, 1);
    // Шуурга аажим намжина
    if (dawnT > 0.45) state.world.weather = "wind";
    state.world.groundWetness = Math.max(0.2, 0.85 - dawnT * 0.55);
    setOpeningAmbient(openingAmbientForVignette("coldDawn", dawnT));
  }

  updateOpeningAmbient(dt);

  if (section.vignette === "laughingStorm" && state.parents) {
    // Камер хүү + аав ээжийг дагана
    const focusX =
      (state.parents.father.pos.x +
        state.parents.mother.pos.x +
        state.player.pos.x) /
      3;
    const focusY =
      (state.parents.father.pos.y +
        state.parents.mother.pos.y +
        state.player.pos.y) /
      3;
    state.story.introCamX +=
      (clamp(focusX, VIEW_W / 2, WORLD_W - VIEW_W / 2) -
        state.story.introCamX) *
      Math.min(1, dt * 2.4);
    state.story.introCamY +=
      (clamp(focusY, VIEW_H / 2, WORLD_H - VIEW_H / 2) -
        state.story.introCamY) *
      Math.min(1, dt * 2.4);
  } else {
    state.story.introCamX = clamp(
      state.story.introCamX + section.slowPan.x * dt,
      VIEW_W / 2,
      WORLD_W - VIEW_W / 2,
    );
    state.story.introCamY = clamp(
      state.story.introCamY + section.slowPan.y * dt,
      VIEW_H / 2,
      WORLD_H - VIEW_H / 2,
    );
  }

  updateIntroParentCinematic(state, dt, section);

  state.story.introSectionElapsed += dt;
  const hold = Math.max(state.story.introSectionHold, INTRO_SECTION_DURATION);
  if (state.story.introSectionElapsed < hold) return;

  state.story.introSection += 1;
  state.story.introSectionElapsed = 0;
  if (state.story.introSection >= OPENING_STORY_SECTIONS.length) {
    finishOpeningSequence(state);
    return;
  }
  applyOpeningVignette(state, state.story.introSection);
  {
    const next = OPENING_STORY_SECTIONS[state.story.introSection]!;
    setOpeningAmbient(openingAmbientForVignette(next.vignette));
  }
}

/** Аав ээж — шуурганд татагдан алга болно; хүү хойноос уйлж гүйнэ */
function updateIntroParentCinematic(
  state: GameState,
  dt: number,
  section: OpeningStorySection,
): void {
  const parents = state.parents;
  const camp = state.world.campPos;
  const hold = Math.max(state.story.introSectionHold, INTRO_SECTION_DURATION);
  const t = clamp(state.story.introSectionElapsed / hold, 0, 1);
  const player = state.player;

  if (section.vignette === "stormNight") {
    state.story.introParentFade = 1;
    if (parents && !state.parentsReturned) {
      parents.father.walkPhase += dt * 2.2;
      parents.mother.walkPhase += dt * 2.0;
      parents.father.moving = false;
      parents.mother.moving = false;
    }
    player.moving = false;
    player.facing.x = -1;
    // Сүүлийн мөчид аав ээж рүү эргэж харна
    if (t > 0.7 && parents) {
      player.facing.x = parents.father.pos.x < player.pos.x ? -1 : 1;
    }
    return;
  }

  if (section.vignette === "laughingStorm") {
    // Зөөлөн ease — гэнэт нисэхгүй
    const flee = clamp((t - 0.05) / 0.88, 0, 1);
    const ease = flee * flee * (3 - 2 * flee);
    // Бага зэрэг л өргөнө — газарт чирэгдэж байгаа мэт
    state.story.introParentLift =
      ease * 7 + Math.sin(state.world.elapsed * 5.5) * 1.1;

    if (!introWitchLaughPlayed && flee > 0.02) {
      introWitchLaughPlayed = true;
      sfx("witchLaugh");
    }

    const riftX = camp.x - 260;
    const riftY = camp.y - 130;

    if (parents && !state.parentsReturned) {
      const f0x = camp.x - 36;
      const f0y = camp.y + 48;
      const m0x = camp.x + 40;
      const m0y = camp.y + 52;
      parents.father.pos.x = f0x + (riftX - f0x) * ease;
      parents.father.pos.y = f0y + (riftY - f0y) * ease * 0.85;
      parents.mother.pos.x = m0x + (riftX + 30 - m0x) * ease;
      parents.mother.pos.y = m0y + (riftY + 10 - m0y) * ease * 0.85;
      parents.father.moving = false;
      parents.mother.moving = false;
      parents.father.workPulse = 0;
      parents.mother.workPulse = 0;
      parents.father.face = -1;
      parents.mother.face = -1;
      parents.father.walkPhase += dt * 3;
      parents.mother.walkPhase += dt * 3.2;
      state.story.introParentFade = clamp(1 - (ease - 0.35) / 0.55, 0, 1);
      if (state.story.introParentFade > 0.08 && Math.random() < dt * 5) {
        const p = Math.random() < 0.5 ? parents.father : parents.mother;
        spawnParticles(
          state,
          {
            x: p.pos.x,
            y: p.pos.y - state.story.introParentLift,
          },
          2,
          "#14101c",
          { speed: 28, life: 0.9, size: 2.0, gravity: -8 },
        );
      }
    } else {
      state.story.introParentFade = 0;
      state.story.introParentLift = 0;
    }

    const chase = clamp((t - 0.1) / 0.85, 0, 1);
    const midX =
      parents && !state.parentsReturned
        ? (parents.father.pos.x + parents.mother.pos.x) / 2
        : camp.x - 100;
    const midY =
      parents && !state.parentsReturned
        ? (parents.father.pos.y + parents.mother.pos.y) / 2
        : camp.y;
    const lag = 70 + chase * 20;
    const targetX = midX + lag * 0.75;
    const targetY = midY + 36;
    player.pos.x += (targetX - player.pos.x) * Math.min(1, dt * 2.6);
    player.pos.y += (targetY - player.pos.y) * Math.min(1, dt * 2.6);
    player.facing.x = midX < player.pos.x ? -1 : 1;
    player.facing.y = 0;
    player.moving = chase > 0.08 && state.story.introParentFade > 0.12;

    if (player.moving && Math.random() < dt * 6) {
      spawnParticles(
        state,
        { x: player.pos.x, y: player.pos.y - 15 },
        1,
        "#a8c8dc",
        { speed: 12, life: 0.5, size: 1.4, gravity: 70 },
      );
    }
    return;
  }

  state.story.introParentFade = 0;
  state.story.introParentLift = 0;
  player.moving = false;
}

function startLivestockRecoveryQuest(state: GameState): void {
  const story = state.story;
  if (
    !story.hearthQuestCompleted ||
    story.hearthCompletionEffectRemaining > 0
  ) {
    return;
  }
  if (story.livestockQuestCompleted) {
    return;
  }

  ensureOpeningLivestockRoster(state);
  story.livestockQuestStarted = true;
  story.firstNightStage = "recoveringLivestock";
  story.firstNightStageRemaining = 0;
  story.activeMainObjective = "findScatteredLivestock";
  if (state.world.dayNumber === 1) {
    story.firstDayTimeAccelerationStarted = true;
  }
  if (!story.livestockNarrationShown) {
    story.livestockNarrationShown = true;
    setMessage(state, LIVESTOCK_QUEST_NARRATION, 7);
  }
}

export function updateHearthQuest(state: GameState, dt: number): void {
  const story = state.story;
  if (!story.hearthQuestStarted) return;

  if (!story.hearthQuestCompleted) {
    story.hearthWoodCollected = Math.min(
      CAMPFIRE_WOOD_COST,
      state.player.inventory.wood,
    );

    if (state.gerStoveLit && !story.campfireRelit) {
      story.hearthWoodCollected = CAMPFIRE_WOOD_COST;
      story.campfireRelit = true;
      story.hearthQuestCompleted = true;
      story.hearthCompletionEffectShown = true;
      story.hearthCompletionEffectRemaining =
        HEARTH_COMPLETION_EFFECT_DURATION;
      state.message = "";
      state.messageTimer = 0;
      sfx("levelup");
      const hearth = pastureCenter(state.world);
      spawnParticles(state, hearth, 18, "#ffd27a", {
        speed: 105,
        life: 1.1,
        size: 3,
        gravity: -65,
      });
      setMessage(state, "Голомт сэргэв! Зуухны гал ассан.", 4);
    }
  }

  if (story.hearthCompletionEffectRemaining > 0) {
    story.hearthCompletionEffectRemaining = Math.max(
      0,
      story.hearthCompletionEffectRemaining - dt,
    );
  }
  if (
    !story.hearthQuestCompleted ||
    story.hearthCompletionEffectRemaining > 0
  ) {
    return;
  }

  // Дараагийн зорилгыг checkpoint үзүүлбэр бүрэн дууссаны дараа л нээнэ.
  startLivestockRecoveryQuest(state);
}

export function nearestMissingOpeningLivestock(
  state: GameState,
  maxDistance = LIVESTOCK_CALL_DISTANCE,
): HerdAnimal | null {
  const story = state.story;
  if (
    !story.livestockQuestStarted ||
    story.livestockQuestCompleted ||
    story.activeMainObjective !== "findScatteredLivestock"
  ) {
    return null;
  }

  let nearest: HerdAnimal | null = null;
  let nearestDistance = maxDistance;
  for (const animal of state.world.flock.visuals) {
    if (
      !story.openingLivestockIds.includes(animal.id) ||
      story.livestockFoundIds.includes(animal.id)
    ) {
      continue;
    }
    const distance = dist(state.player.pos, animal.pos);
    if (distance <= nearestDistance) {
      nearest = animal;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function tryCallOpeningLivestock(state: GameState): boolean {
  const animal = nearestMissingOpeningLivestock(state);
  if (!animal) return false;

  if (!state.story.livestockFoundIds.includes(animal.id)) {
    state.story.livestockFoundIds.push(animal.id);
    setMessage(state, "Мал оллоо", 2.2);
    sfx("baa");
  }
  return true;
}

function updateFirstDayRecoveryTime(state: GameState, dt: number): void {
  const story = state.story;
  const world = state.world;
  if (
    state.phase !== "playing" ||
    world.dayNumber !== 1 ||
    story.firstNightStage !== "recoveringLivestock" ||
    story.livestockQuestCompleted
  ) {
    return;
  }

  story.firstDayTimeAccelerationStarted = true;
  if (world.timeOfDay >= FIRST_DAY_LATE_EVENING_TIME) {
    world.timeOfDay = FIRST_DAY_LATE_EVENING_TIME;
    world.dayPhase = getDayPhase(world.timeOfDay, world.season);
    story.firstDayEveningHoldActive = true;
    return;
  }

  world.timeOfDay = Math.min(
    FIRST_DAY_LATE_EVENING_TIME,
    world.timeOfDay +
      Math.max(0, dt) * TIME_RATE * FIRST_DAY_LIVESTOCK_TIME_MULTIPLIER,
  );
  world.dayPhase = getDayPhase(world.timeOfDay, world.season);
  story.firstDayEveningHoldActive =
    world.timeOfDay >= FIRST_DAY_LATE_EVENING_TIME;
}

function enterFirstNightNarration(state: GameState): void {
  state.story.firstNightNormalTimeRestored = true;
  state.story.firstNightNarrationShown = true;
  state.story.firstNightStage = "nightNarration";
  state.story.firstNightStageRemaining = FIRST_NIGHT_NARRATION_DURATION;
  setMessage(
    state,
    FIRST_NIGHT_SUNSET_NARRATION,
    FIRST_NIGHT_NARRATION_DURATION,
  );
}

function enterFirstNightWolfWarning(state: GameState): void {
  state.story.firstNightWolfWarningShown = true;
  state.story.firstNightStage = "wolfWarning";
  state.story.firstNightStageRemaining = FIRST_NIGHT_WOLF_WARNING_DURATION;
  sfx("howl");
  setMessage(
    state,
    FIRST_NIGHT_WOLF_WARNING,
    FIRST_NIGHT_WOLF_WARNING_DURATION,
  );
}

function holdFirstNightMessage(state: GameState, text: string): void {
  state.message = text;
  state.messageTimer = state.story.firstNightStageRemaining;
}

function updateFirstNightSequence(state: GameState, dt: number): void {
  if (state.phase !== "playing") return;

  const story = state.story;
  const world = state.world;
  const safeDt = Math.max(0, dt);

  if (story.firstNightStage === "sunset") {
    if (story.livestockCompletionEffectRemaining > 0) return;

    const remaining = story.firstNightStageRemaining;
    if (remaining > 0) {
      const step = Math.min(safeDt, remaining);
      if (world.dayNumber === 1 && world.timeOfDay < FIRST_NIGHT_TARGET_TIME) {
        world.timeOfDay +=
          (FIRST_NIGHT_TARGET_TIME - world.timeOfDay) * (step / remaining);
        world.dayPhase = getDayPhase(world.timeOfDay, world.season);
      }
      story.firstNightStageRemaining = Math.max(0, remaining - step);
    }

    if (story.firstNightStageRemaining <= 0) {
      if (world.dayNumber === 1 && world.timeOfDay < FIRST_NIGHT_TARGET_TIME) {
        world.timeOfDay = FIRST_NIGHT_TARGET_TIME;
      }
      world.dayPhase = getDayPhase(world.timeOfDay, world.season);
      story.firstNightNormalTimeRestored = true;
      enterFirstNightNarration(state);
    }
    return;
  }

  if (story.firstNightStage === "nightNarration") {
    story.firstNightStageRemaining = Math.max(
      0,
      story.firstNightStageRemaining - safeDt,
    );
    if (story.firstNightStageRemaining <= 0) {
      enterFirstNightWolfWarning(state);
    } else {
      holdFirstNightMessage(state, FIRST_NIGHT_SUNSET_NARRATION);
    }
    return;
  }

  if (story.firstNightStage === "wolfWarning") {
    story.firstNightStageRemaining = Math.max(
      0,
      story.firstNightStageRemaining - safeDt,
    );
    if (story.firstNightStageRemaining <= 0) {
      holdFirstNightMessage(state, FIRST_NIGHT_WOLF_WARNING);
      story.firstNightStage = "protecting";
      story.activeMainObjective = "protectFlock";
      story.wolfThreatQuestStarted = true;
      story.temporaryPlayerProtectionActive = true;
      story.temporaryLivestockProtectionActive = true;
    } else {
      holdFirstNightMessage(state, FIRST_NIGHT_WOLF_WARNING);
    }
  }
}

function updateFirstNightCatchUp(
  state: GameState,
  dt: number,
  remaining: number,
): void {
  const world = state.world;
  if (
    state.phase !== "playing" ||
    world.dayNumber !== 1 ||
    world.timeOfDay >= FIRST_NIGHT_VISIBLE_SUNSET_START ||
    remaining <= 0
  ) {
    return;
  }

  const step = Math.min(Math.max(0, dt), remaining);
  world.timeOfDay +=
    (FIRST_NIGHT_VISIBLE_SUNSET_START - world.timeOfDay) *
    (step / remaining);
  world.dayPhase = getDayPhase(world.timeOfDay, world.season);
}

function storyWolfSpawnIsOffCamera(state: GameState, pos: Vector2): boolean {
  const cameraX = clamp(
    state.player.pos.x - VIEW_W / 2,
    0,
    Math.max(0, state.world.width - VIEW_W),
  );
  const cameraY = clamp(
    state.player.pos.y - VIEW_H / 2,
    0,
    Math.max(0, state.world.height - VIEW_H),
  );
  const margin = 24;
  return (
    pos.x < cameraX - margin ||
    pos.x > cameraX + VIEW_W + margin ||
    pos.y < cameraY - margin ||
    pos.y > cameraY + VIEW_H + margin
  );
}

function storyWolfSpawnIsClear(state: GameState, pos: Vector2): boolean {
  const world = state.world;
  if (
    pos.x < 54 ||
    pos.x > world.width - 54 ||
    pos.y < 54 ||
    pos.y > world.height - 54 ||
    isInRiver(pos, 34) ||
    dist(pos, state.player.pos) < STORY_WOLF_MIN_PLAYER_DISTANCE ||
    dist(pos, penCenter(world)) < PEN_RADIUS + 76 ||
    dist(pos, world.campPos) < 118 ||
    dist(pos, world.campfire.pos) < world.campfire.radius + 52 ||
    dist(pos, world.feeder.pos) < world.feeder.radius + 38 ||
    dist(pos, world.elder.pos) < world.elder.radius + 42 ||
    dist(pos, world.elder.gerPos) < 92 ||
    pos.x >= world.firstRoute.startX - 120 ||
    dist(pos, world.firstRoute.gatePos) < world.firstRoute.gateRadius + 110 ||
    dist(pos, world.firstRoute.arenaCenter) <
      world.firstRoute.arenaRadius + 100 ||
    dist(pos, world.tumurShulmas.gatePos) <
      world.tumurShulmas.gateRadius + 100 ||
    dist(pos, world.tumurShulmas.arenaCenter) <
      world.tumurShulmas.arenaRadius + 100
  ) {
    return false;
  }

  for (const animal of world.flock.visuals) {
    if (dist(pos, animal.pos) < STORY_WOLF_MIN_LIVESTOCK_DISTANCE) {
      return false;
    }
  }
  for (const fence of world.fences) {
    if (dist(pos, fence.pos) < fence.radius + 28) return false;
  }
  for (const tree of world.trees) {
    if (tree.hp > 0 && dist(pos, tree.pos) < tree.radius + 28) return false;
  }
  for (const bush of world.bushes) {
    if (dist(pos, bush.pos) < bush.radius + 24) return false;
  }
  return true;
}

function findStoryWolfSpawnPosition(state: GameState): Vector2 {
  const pen = penCenter(state.world);
  let best: Vector2 | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  const consider = (candidate: Vector2, nearTree = false): void => {
    if (!storyWolfSpawnIsClear(state, candidate)) return;
    const offCamera = storyWolfSpawnIsOffCamera(state, candidate);
    const score =
      (offCamera ? 0 : 1000) +
      (nearTree ? 0 : 90) +
      Math.abs(dist(candidate, pen) - 560);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  };

  // Эхлээд ой модны бараа түшсэн, гэхдээ модтой давхцаагүй байр сонгоно.
  for (const tree of state.world.trees) {
    if (tree.hp <= 0) continue;
    const treeDistance = dist(tree.pos, pen);
    if (treeDistance < 470 || treeDistance > 690) continue;
    const towardPen = normalize({
      x: pen.x - tree.pos.x,
      y: pen.y - tree.pos.y,
    });
    consider(
      {
        x: tree.pos.x + towardPen.x * (tree.radius + 36),
        y: tree.pos.y + towardPen.y * (tree.radius + 36),
      },
      true,
    );
  }

  const angles = [
    Math.PI,
    -Math.PI / 2,
    (-3 * Math.PI) / 4,
    (3 * Math.PI) / 4,
    Math.PI / 2,
    -Math.PI / 4,
  ] as const;
  for (const radius of [560, 620, 500] as const) {
    for (const angle of angles) {
      consider({
        x: pen.x + Math.cos(angle) * radius,
        y: pen.y + Math.sin(angle) * radius,
      });
    }
  }

  if (best) return best;

  // Детерминистик нөөц хайлт: зүүн талын дараагийн зам руу орохгүй.
  for (let ring = 360; ring <= 700; ring += 40) {
    for (let step = 0; step < 16; step++) {
      const angle = Math.PI / 2 + (step / 16) * Math.PI;
      const candidate = {
        x: pen.x + Math.cos(angle) * ring,
        y: pen.y + Math.sin(angle) * ring,
      };
      if (storyWolfSpawnIsClear(state, candidate)) return candidate;
    }
  }

  return {
    x: clamp(pen.x - PEN_RADIUS - 120, 54, state.world.width - 54),
    y: clamp(pen.y - PEN_RADIUS - 120, 54, state.world.height - 54),
  };
}

export function getStoryWolf(state: GameState): Wolf | null {
  const id = state.story.storyWolfId;
  if (id === null) return null;
  return state.world.wolves.find((wolf) => wolf.id === id) ?? null;
}

function ensureStoryWolf(state: GameState): Wolf | null {
  const story = state.story;
  if (!firstNightStageAtLeast(story.firstNightStage, "protecting")) {
    return null;
  }

  let wolf = getStoryWolf(state);
  if (!wolf) {
    const options: { pos: Vector2; silent: true; id?: number } = {
      pos: findStoryWolfSpawnPosition(state),
      silent: true,
    };
    if (story.storyWolfId !== null) options.id = story.storyWolfId;
    wolf = spawnWolf(state, "wolf", options);
    story.storyWolfId = wolf.id;
  }

  story.storyWolfSpawned = true;
  wolf.alive = true;
  wolf.hp = Math.max(1, wolf.hp);
  return wolf;
}

function nearestOpeningLivestockDistance(
  state: GameState,
  wolf: Wolf,
): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const animal of state.world.flock.visuals) {
    if (!state.story.openingLivestockIds.includes(animal.id)) continue;
    nearest = Math.min(nearest, dist(wolf.pos, animal.pos));
  }
  return nearest;
}

export function storyWolfUsesExistingAi(state: GameState): boolean {
  const story = state.story;
  const cutsceneActive =
    story.firstNightStage === "elderIntervention" ||
    story.firstNightStage === "elderApproach";
  const storyFightActive =
    story.firstNightStage === "protecting" ||
    (story.firstNightStage === "completed" && story.milestone3Completed);

  return (
    state.phase === "playing" &&
    storyFightActive &&
    !cutsceneActive &&
    story.storyWolfSpawned &&
    story.storyWolfId !== null
  );
}

export function firstNightElderCutsceneActive(state: GameState): boolean {
  return (
    state.story.firstNightStage === "elderIntervention" ||
    state.story.firstNightStage === "elderApproach"
  );
}

function elderCutsceneTarget(state: GameState): Vector2 {
  const fire = state.world.campfire.pos;
  return {
    x: clamp(fire.x + 82, 52, state.world.width - 52),
    y: clamp(fire.y + 28, 52, state.world.height - 52),
  };
}

function placeOldManForCutscene(state: GameState): void {
  const elder = state.world.elder;
  const target = elderCutsceneTarget(state);
  const playerOnRight = state.player.pos.x >= target.x;
  const side = playerOnRight ? -1 : 1;

  elder.pos = {
    x: clamp(target.x + side * 152, 52, state.world.width - 52),
    y: clamp(target.y - 38, 52, state.world.height - 52),
  };
  elder.pose = "walking";
  elder.face = target.x < elder.pos.x ? -1 : 1;
  elder.walkPhase = 0;
  elder.eyeMode = "idle";
}

function walkOldManIntoCutscene(state: GameState, dt: number): void {
  const elder = state.world.elder;
  const target = elderCutsceneTarget(state);
  const dx = target.x - elder.pos.x;
  const dy = target.y - elder.pos.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= 5) {
    elder.pos = target;
    elder.pose = "standing";
    elder.face = state.player.pos.x < elder.pos.x ? -1 : 1;
    return;
  }

  const speed = 30;
  const step = Math.min(distance, Math.max(0, dt) * speed);
  elder.pos.x += (dx / distance) * step;
  elder.pos.y += (dy / distance) * step;
  pushOutOfGer(elder.pos, elder.radius * 0.45, state.world);
  pushOutOfUrtz(elder.pos, elder.radius * 0.45, state.world);
  elder.pose = "walking";
  elder.face = dx < 0 ? -1 : 1;
  elder.walkPhase += Math.max(0, dt) * 6.5;
}

function calmStoryWolfForVoice(wolf: Wolf, duration: number): void {
  wolf.vel.x = 0;
  wolf.vel.y = 0;
  wolf.attackPhase = "recovery";
  wolf.attackTimer = Math.max(wolf.attackTimer, duration);
  wolf.attackCooldown = Math.max(wolf.attackCooldown, duration);
  wolf.attackHitDone = true;
  wolf.combatPhase = "recovery";
  wolf.combatTimer = Math.max(wolf.combatTimer, duration);
}

function beginUnknownOldManVoice(state: GameState, wolf: Wolf): void {
  const story = state.story;
  if (story.oldManArrivalStarted) return;

  story.oldManArrivalStarted = true;
  story.oldManArrived = true;
  story.oldManArrivalElapsed = 0;
  story.shortDialogueStarted = true;
  story.firstNightStage = "elderIntervention";
  story.firstNightStageRemaining = 0;
  placeOldManForCutscene(state);
  calmStoryWolfForVoice(wolf, UNKNOWN_OLD_MAN_FIRST_LINE_DURATION);
  state.player.attackMelee = false;
  state.player.combatPhase = "idle";
  state.player.combatTimer = 0;
  state.player.meleePhase = "idle";
  state.player.meleeTimer = 0;
  state.player.dodgePhase = "idle";
  state.player.dodgeTimer = 0;
  state.player.parryPhase = "idle";
  state.player.parryTimer = 0;
  state.player.parryArmed = false;
  state.combatMovementLocked = false;
  state.combatDodgeActive = false;
  state.message = "";
  state.messageTimer = 0;
}

function beginSecondUnknownOldManLine(state: GameState, wolf: Wolf): void {
  state.story.firstNightStage = "elderApproach";
  state.story.oldManArrivalElapsed = 0;
  calmStoryWolfForVoice(wolf, UNKNOWN_OLD_MAN_SECOND_LINE_DURATION);
  state.message = "";
  state.messageTimer = 0;
}

function completeUnknownOldManGuidance(
  state: GameState,
  wolf: Wolf,
): void {
  const story = state.story;
  story.shortDialogueCompleted = true;
  story.milestone3Completed = true;
  story.firstNightStage = "completed";
  story.firstNightStageRemaining = 0;
  story.activeMainObjective = "observeWolfMovement";
  story.storyWolfAttackInProgress = false;
  state.world.elder.pos = elderCutsceneTarget(state);
  state.world.elder.pose = "standing";
  state.world.elder.face = state.player.pos.x < state.world.elder.pos.x ? -1 : 1;
  state.world.elder.walkPhase = 0;

  // Cutscene duussan frame-ees story wolf-iig dahin toglogch ruu
  // idevhtei dairah belen tuluvt shiljuulne. Recovery state uldvel
  // mal ruu harj zogsoh esvel dairaltaa dahin ehluulehgui baij bolno.
  wolf.attackPhase = "chasing";
  wolf.attackTimer = 0;
  wolf.attackCooldown = 0.12;
  wolf.attackHitDone = false;
  wolf.combatPhase = "idle";
  wolf.combatTimer = 0;
  wolf.attackDirection = normalize({
    x: state.player.pos.x - wolf.pos.x,
    y: state.player.pos.y - wolf.pos.y,
  });
  wolf.vel = { ...wolf.attackDirection };
}

function revealSeatedOldMan(state: GameState): void {
  const story = state.story;
  if (story.milestone5Started || story.milestone5DialogueCompleted) return;
  if (
    story.oldManArrived &&
    state.world.elder.pose === "seated" &&
    story.activeMainObjective === "talkToOldMan"
  ) {
    return;
  }

  const fire = state.world.campfire.pos;
  state.world.elder.pos = {
    x: clamp(fire.x + 86, 52, state.world.width - 52),
    y: clamp(fire.y + 28, 52, state.world.height - 52),
  };
  state.world.elder.pose = "seated";
  state.world.elder.face = state.player.pos.x < state.world.elder.pos.x ? -1 : 1;
  state.world.elder.walkPhase = 0;
  state.world.elder.eyeMode = "idle";

  story.oldManArrived = true;
  story.temporaryPlayerProtectionActive = false;
  story.temporaryLivestockProtectionActive = false;
  story.activeMainObjective = "talkToOldMan";
  setMessage(state, "Голомтын дэргэд үл таних өвгөн тайван сууж байлаа.", 3.2);
}

export function updateMilestone3(state: GameState, dt: number): void {
  const story = state.story;

  if (story.milestone3Completed) {
    const defeatedWolf = getStoryWolf(state);
    if (
      story.milestone4Completed &&
      defeatedWolf &&
      !defeatedWolf.alive
    ) {
      revealSeatedOldMan(state);
    }
    return;
  }

  if (!firstNightStageAtLeast(story.firstNightStage, "protecting")) return;

  const wolf = ensureStoryWolf(state);
  if (!wolf) return;

  if (story.firstNightStage === "protecting") {
    if (state.phase !== "playing") return;
    const safeDt = Math.max(0, dt);
    story.storyWolfSceneElapsed += safeDt;

    const livestockDistance = nearestOpeningLivestockDistance(state, wolf);
    const playerDistance = dist(wolf.pos, state.player.pos);
    const attackActive =
      wolf.attackPhase === "windup" || wolf.attackPhase === "leaping";
    if (attackActive) {
      story.storyWolfAttackInProgress = true;
    } else if (story.storyWolfAttackInProgress) {
      // Дайралт эхлэхэд бус, бүтэн дууссаны дараа л нэг оролдлого гэж тоолно.
      // Ингэснээр өвгөний cutscene чоно дайрахаас өмнө асахгүй.
      story.storyWolfAttackAttempts += 1;
      story.storyWolfAttackInProgress = false;
    }

    const threatActive =
      attackActive ||
      playerDistance <= STORY_WOLF_THREAT_PLAYER_DISTANCE ||
      livestockDistance <= STORY_WOLF_THREAT_LIVESTOCK_DISTANCE;
    if (threatActive) story.helplessPhaseElapsed += safeDt;

    const hasCompletedAttack = story.storyWolfAttackAttempts >= 1;
    const playerLow =
      hasCompletedAttack &&
      state.player.vitals.health <= state.player.vitals.maxHealth * 0.35;
    const livestockInDanger =
      hasCompletedAttack &&
      livestockDistance <= STORY_WOLF_DANGER_LIVESTOCK_DISTANCE &&
      story.helplessPhaseElapsed >= HELPLESS_MINIMUM_BEFORE_DANGER_TRIGGER;
    const repeatedAttacks =
      story.storyWolfAttackAttempts >= 2 &&
      story.helplessPhaseElapsed >= HELPLESS_TWO_ATTACK_TRIGGER;
    const helplessTimedOut =
      hasCompletedAttack &&
      story.helplessPhaseElapsed >= HELPLESS_MAXIMUM_DURATION;
    const sceneTimedOut =
      hasCompletedAttack &&
      story.storyWolfSceneElapsed >= STORY_WOLF_HARD_SCENE_TIMEOUT;

    if (
      playerLow ||
      livestockInDanger ||
      repeatedAttacks ||
      helplessTimedOut ||
      sceneTimedOut
    ) {
      beginUnknownOldManVoice(state, wolf);
    }
    return;
  }

  if (story.firstNightStage === "elderIntervention") {
    if (state.phase !== "playing") return;
    story.oldManArrivalElapsed += Math.max(0, dt);
    walkOldManIntoCutscene(state, dt);
    calmStoryWolfForVoice(wolf, 0.18);
    if (
      story.oldManArrivalElapsed >= UNKNOWN_OLD_MAN_FIRST_LINE_DURATION
    ) {
      beginSecondUnknownOldManLine(state, wolf);
    }
    return;
  }

  if (story.firstNightStage === "elderApproach") {
    if (state.phase !== "playing") return;
    story.oldManArrivalElapsed += Math.max(0, dt);
    walkOldManIntoCutscene(state, dt);
    calmStoryWolfForVoice(wolf, 0.18);
    if (
      story.oldManArrivalElapsed >= UNKNOWN_OLD_MAN_SECOND_LINE_DURATION
    ) {
      completeUnknownOldManGuidance(state, wolf);
    }
  }
}

const STORY_WOLF_RED_SIGNAL_TIME = 0.3;

function storyWolfIsShowingAttackSignal(wolf: Wolf): boolean {
  return wolf.attackPhase === "windup" || wolf.attackPhase === "leaping";
}

function storyWolfIsInRedSignalWindow(wolf: Wolf): boolean {
  return (
    storyWolfIsShowingAttackSignal(wolf) &&
    wolf.attackKind !== "bearGrab" &&
    wolf.attackTimer <= STORY_WOLF_RED_SIGNAL_TIME
  );
}

function beginNightCompletionEffect(
  state: GameState,
  deathPos: Vector2,
): void {
  const story = state.story;
  if (story.nightCompletionEffectShown) return;

  story.storyWolfDefeated = true;
  story.storyWolfOpeningActive = false;
  story.nightCompletionEffectShown = true;
  story.nightCompletionEffectRemaining = NIGHT_COMPLETION_EFFECT_DURATION;
  story.activeMainObjective = "talkToOldMan";
  state.player.vitals.health = Math.min(
    state.player.vitals.maxHealth,
    state.player.vitals.health + 18,
  );
  setMessage(state, "Чоно унав! Голомтын дэргэд өвгөн дээр оч.", 4.2);
  sfx("levelup");
  spawnParticles(state, deathPos, 18, "#d8e7ef", {
    speed: 92,
    life: 1.1,
    size: 2.6,
    gravity: -34,
  });
}

/**
 * Milestone 4 — улаан дайралтын дохиог таних, parry хийх,
 * шар нээлттэй мөчид counter цохилт хийж story wolf-ийг өөрөө ялах.
 */
export function updateMilestone4(state: GameState, dt: number): void {
  const story = state.story;
  if (!story.milestone3Completed) return;

  const wolf = getStoryWolf(state);

  if (story.milestone4Completed) {
    if (story.storyWolfDefeated || !wolf || !wolf.alive) {
      revealSeatedOldMan(state);
    }
    return;
  }

  if (!story.milestone4Started) {
    story.milestone4Started = true;
    if (story.activeMainObjective === null) {
      story.activeMainObjective = "observeWolfMovement";
    }
  }

  if (story.nightCompletionEffectRemaining > 0) {
    if (state.phase === "playing") {
      story.nightCompletionEffectRemaining = Math.max(
        0,
        story.nightCompletionEffectRemaining - Math.max(0, dt),
      );
    }
    if (story.nightCompletionEffectRemaining <= 0) {
      story.milestone4Completed = true;
      story.temporaryPlayerProtectionActive = false;
      story.temporaryLivestockProtectionActive = false;
      revealSeatedOldMan(state);
    }
    return;
  }

  // Сэг шууд арилдаг тул чоно байхгүй ч ялагдсан бол эффектийг эхлүүлнэ
  if (
    (!wolf || !wolf.alive) &&
    (story.storyWolfDefeated || story.storyWolfCounterCompleted)
  ) {
    beginNightCompletionEffect(
      state,
      wolf?.pos ?? state.player.pos,
    );
    return;
  }

  if (!wolf || !wolf.alive) return;

  if (
    !story.storyWolfRedSignalSeen &&
    storyWolfIsInRedSignalWindow(wolf)
  ) {
    story.storyWolfRedSignalSeen = true;
    story.activeMainObjective = "parryStoryWolf";
    setMessage(
      state,
      "Өвгөн: Улаан туяа цахих агшинд сөрөөрэй, хүү минь.",
      3.2,
    );
  }

  if (story.storyWolfParryCompleted && !story.storyWolfCounterCompleted) {
    const openingActive = wolf.attackPhase === "stunned";
    story.storyWolfOpeningActive = openingActive;
    story.activeMainObjective = openingActive
      ? "counterStoryWolf"
      : "parryStoryWolf";
  }
}


const STORM_TRACE_INTERACT_DISTANCE = 54;
const STORM_TRACE_EFFECT_DURATION = 2.8;
/** Ойртоход шуламын инээд нэг удаа */
let stormTraceApproachSfxPlayed = false;

function ensureStormTracePosition(state: GameState): Vector2 {
  const existing = state.story.stormTracePos;
  if (existing) return existing;

  const elderCamp = state.world.elder.gerPos;
  const desired = {
    x: clamp(elderCamp.x + 300, 54, state.world.width - 54),
    y: clamp(elderCamp.y - 210, 54, state.world.height - 54),
  };
  state.story.stormTracePos = desired;
  return state.story.stormTracePos;
}

export function nearStormTrace(state: GameState): boolean {
  if (
    state.phase !== "playing" ||
    state.story.activeMainObjective !== "inspectStormTrace" ||
    state.story.stormTraceInspected
  ) {
    return false;
  }
  const pos = ensureStormTracePosition(state);
  return (
    dist(state.player.pos, pos) <=
    state.player.radius + STORM_TRACE_INTERACT_DISTANCE
  );
}

export function tryInspectStormTrace(state: GameState): boolean {
  if (!state.input.interact || !nearStormTrace(state)) return false;

  const story = state.story;
  const pos = ensureStormTracePosition(state);
  state.input.interact = false;
  story.milestone7Started = true;
  story.stormTraceInspected = true;
  story.stormTraceEffectRemaining = STORM_TRACE_EFFECT_DURATION;
  story.activeMainObjective = "returnToOldManWithTrace";
  state.fx.shake = Math.max(state.fx.shake, 4.5);
  spawnParticles(state, pos, 26, "#8190aa", {
    speed: 92,
    life: 1.4,
    size: 2.8,
    gravity: -22,
  });
  spawnParticles(state, pos, 14, "#2b2029", {
    speed: 58,
    life: 1.7,
    size: 3.2,
    gravity: -10,
  });
  if (!stormTraceApproachSfxPlayed) sfx("witchLaugh");
  stormTraceApproachSfxPlayed = true;
  setMessage(
    state,
    "Хар үнс салхины өөдөөс мөлхөх мэт хөдөлж, чулуун завсраас хахир инээд цуурайтав.",
    5,
  );
  return true;
}

const SPIRIT_OVOO_INTERACT_DISTANCE = 62;

export function nearSpiritOvooSite(state: GameState): boolean {
  if (state.phase !== "playing") return false;
  if (!state.story.postSpiritScoutDialogueCompleted) return false;
  const pos = state.story.stormTracePos ?? ensureStormTracePosition(state);
  return (
    dist(state.player.pos, pos) <=
    state.player.radius + SPIRIT_OVOO_INTERACT_DISTANCE
  );
}

/** Хоёр дахь зорчилт — овооны шилэн ус авах (3 балга = 3 амь) */
export function tryCollectSpiritOvooSoul(state: GameState): boolean {
  if (!state.input.interact || state.phase !== "spirit") return false;
  if (state.story.spiritOvooSoulCollected) return false;
  if (!state.story.spiritOvooSoulActive) return false;

  const pos = state.story.stormTracePos;
  if (!pos) return false;
  if (dist(state.player.pos, pos) > state.player.radius + 58) return false;

  state.input.interact = false;
  state.story.spiritOvooSoulCollected = true;
  state.story.spiritOvooSoulActive = false;
  state.spiritPoints += SPIRIT_WATER_SIPS;
  spawnText(
    state,
    { x: pos.x, y: pos.y - 40 },
    `+${SPIRIT_WATER_SIPS} амь`,
    "#a8d4ff",
  );
  const canReturn = state.story.spiritAllowReturn;
  setMessage(
    state,
    canReturn
      ? `Шилэн лонх авсан — ${SPIRIT_WATER_SIPS} амь. (Cheat: дараа E — буцах)`
      : `Шилэн лонх авсан — ${SPIRIT_WATER_SIPS} амь. Овоо сүүдэрлэг болов — дахин ашиглах боломжгүй.`,
    5,
  );
  sfx("buy");
  return true;
}

/** Сүнсний орноос буцах чулуун овоо (тагнах зорчилт) */
export function nearSpiritExitOvoo(state: GameState): boolean {
  if (state.phase !== "spirit") return false;
  if (!state.story.spiritAllowReturn) return false;
  const pos = state.story.stormTracePos ?? ensureStormTracePosition(state);
  return (
    dist(state.player.pos, pos) <=
    state.player.radius + SPIRIT_OVOO_INTERACT_DISTANCE
  );
}

/** Тагнах зорчилтоос чулуун овоогоор буцах */
export function tryExitSpiritViaOvoo(state: GameState): boolean {
  if (!state.input.interact) return false;
  if (!state.story.spiritAllowReturn) return false;
  if (state.phase !== "spirit") return false;

  if (!nearSpiritExitOvoo(state)) {
    state.input.interact = false;
    setMessage(
      state,
      "Буцахын тулд хар мөрийн чулуун овоо руу оч.",
      2.6,
    );
    sfx("move");
    return true;
  }

  state.input.interact = false;
  exitSpiritWorld(state, "Чулуун овоогоор хүний ертөнц рүү буцлаа.");
  return true;
}

/** Хар мөрийн газарт овоо босгох эсвэл овоогоор сүнсний орон руу орох (заавал биш) */
export function tryBuildOrEnterSpiritOvoo(state: GameState): boolean {
  if (!state.input.interact || !nearSpiritOvooSite(state)) return false;

  const story = state.story;
  const pos = ensureStormTracePosition(state);
  state.input.interact = false;

  if (!story.spiritOvooBuilt) {
    if (state.player.inventory.stone < SPIRIT_OVOO_STONE_COST) {
      setMessage(
        state,
        `Овоо босгоход ${SPIRIT_OVOO_STONE_COST} чулуу хэрэгтэй.`,
        2.6,
      );
      sfx("move");
      return true;
    }
    state.player.inventory.stone -= SPIRIT_OVOO_STONE_COST;
    story.spiritOvooBuilt = true;
    // Зорилго болгохгүй — тоглогч бэлэн үедээ орно
    if (
      story.activeMainObjective === "buildSpiritOvoo" ||
      story.activeMainObjective === "enterSpiritViaOvoo"
    ) {
      story.activeMainObjective = null;
    }
    state.fx.shake = Math.max(state.fx.shake, 2.8);
    spawnParticles(state, pos, 18, "#8a8070", {
      speed: 70,
      life: 1.2,
      size: 2.6,
      gravity: 18,
    });
    spawnParticles(state, { x: pos.x, y: pos.y - 18 }, 10, "#c9b896", {
      speed: 48,
      life: 1.4,
      size: 2.2,
      gravity: -8,
    });
    spawnText(state, pos, `−${SPIRIT_OVOO_STONE_COST} чулуу`, "#c8c0b0");
    sfx("stone");
    setMessage(
      state,
      "Чулуун овоо бослоо. Бэлэн бол E дарж ор — орвол буцах хаалга байхгүй.",
      5,
    );
    return true;
  }

  // Хоёр дахь зорчилтод лонх авсны дараа — овоо лацлагдсан
  if (story.spiritOvooSoulCollected) {
    setMessage(
      state,
      "Овоо сүүдэрлэг болов. Дахин орох, буцах боломжгүй.",
      3.2,
    );
    sfx("move");
    return true;
  }

  ensureShulmasHelpers(state);
  placePlayerNearHelpers(state);
  story.activeMainObjective = "defeatSpiritGuards";
  enterSpiritWorld(state, { scout: false });
  return true;
}

/**
 * Milestone 7 — шуурганы мөрөөс одоогийн сүнсний зам, таван сахиул,
 * Шулмасын баатар, Хөх тэнгэрийн сэлэм, Төмөр шулмас руу objective холбоно.
 */
export function updateMilestone7(state: GameState, dt: number): void {
  const story = state.story;
  if (!story.milestone6DialogueCompleted) return;

  story.milestone7Started = true;
  ensureStormTracePosition(state);

  // Ойртоход шуламын инээд (чонын улих биш)
  if (
    !stormTraceApproachSfxPlayed &&
    !story.stormTraceInspected &&
    nearStormTrace(state)
  ) {
    stormTraceApproachSfxPlayed = true;
    sfx("witchLaugh");
  }

  if (story.stormTraceEffectRemaining > 0 && state.phase === "playing") {
    story.stormTraceEffectRemaining = Math.max(
      0,
      story.stormTraceEffectRemaining - Math.max(0, dt),
    );
  }

  if (!story.spiritPathOpened) return;

  const route = state.world.firstRoute;
  const tumur = state.world.tumurShulmas;

  if (tumur.defeated) {
    story.milestone7Completed = true;
    if (state.phase === "spirit") {
      story.activeMainObjective = "returnFromSpirit";
    } else if (state.parentsReturned) {
      story.activeMainObjective = null;
    }
    return;
  }

  if (state.phase !== "spirit" || state.spiritMode !== "shulmas") return;

  if (tumur.active) {
    story.activeMainObjective = "defeatTumurShulmas";
  } else if (route.bossDefeated) {
    story.activeMainObjective = route.swordDrop.collected
      ? "openBlackIronGate"
      : "claimSkySword";
  } else if (route.bossStarted) {
    story.activeMainObjective = "defeatShulmasBaatar";
  } else if (route.complete) {
    story.activeMainObjective = "reachCursedGate";
  } else {
    story.activeMainObjective = "defeatSpiritGuards";
  }
}

/** Milestone 8 — гэр бүл эргэн нэгдэх ба үндсэн survival зорилго. */
export function updateMilestone8(state: GameState, dt: number): void {
  const story = state.story;
  if (!state.world.tumurShulmas.defeated || !state.parentsReturned) return;

  story.milestone7Completed = true;

  if (!story.milestone8Started) {
    story.milestone8Started = true;
    story.familyReunionEffectShown = true;
    story.familyReunionEffectRemaining = FAMILY_REUNION_EFFECT_DURATION;
    story.activeMainObjective = null;
    // Гэрийн урд гаднах галыг унтрааж нууна — голомт гэртээ
    state.world.campfire.placed = false;
    state.world.campfire.lit = false;
    state.world.campfire.igniting = 0;
    state.fx.shake = Math.max(state.fx.shake, 3.5);
    spawnParticles(state, state.world.campPos, 34, "#f2cf7a", {
      speed: 82,
      life: 1.8,
      size: 2.8,
      gravity: -18,
    });
    sfx("win");
    startFamilyLifeTheme();
  }

  if (story.familyReunionEffectRemaining > 0) {
    if (state.phase === "playing") {
      story.familyReunionEffectRemaining = Math.max(
        0,
        story.familyReunionEffectRemaining - Math.max(0, dt),
      );
    }
    if (
      story.familyReunionEffectRemaining <= 0 &&
      !story.familyReunionDialogueStarted
    ) {
      beginFamilyReunionDialogue(state);
    }
    return;
  }

  if (!story.familyReunionDialogueStarted) {
    beginFamilyReunionDialogue(state);
    return;
  }

  if (story.familyReunionDialogueCompleted) {
    story.milestone8Completed = true;
    story.activeMainObjective = "growFlock";
    // Түүх бүтнээр өрнөсөн цэг — шулмас дарагдаж, гэр бүл эргэн нэгдэв.
    // Ялалтыг нэг удаа зарлаад, дараа нь сүрэг өсгөх тоглоом үргэлжилнэ.
    if (!state.victoryShown) {
      state.victoryShown = true;
      state.winReason = "story";
      state.phase = "won";
    }
  }
}

export function drawStormTrace(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
): void {
  const story = state.story;
  const time = state.world.elapsed;

  const spiritExitOvoo =
    state.phase === "spirit" && story.spiritAllowReturn === true;
  const spiritSealedOvoo =
    state.phase === "spirit" &&
    state.spiritMode === "shulmas" &&
    !story.spiritAllowReturn &&
    story.spiritOvooBuilt === true;
  const ovooPhase =
    story.postSpiritScoutDialogueCompleted || story.spiritOvooBuilt;
  const visible =
    (state.phase === "playing" &&
      story.milestone6DialogueCompleted &&
      ((!story.stormTraceInspected || story.stormTraceEffectRemaining > 0) ||
        ovooPhase)) ||
    spiritExitOvoo ||
    spiritSealedOvoo;
  if (!visible) return;

  const pos = ensureStormTracePosition(state);
  const x = pos.x - camera.x;
  const y = pos.y - camera.y;
  if (x < -90 || x > VIEW_W + 90 || y < -90 || y > VIEW_H + 90) return;

  if (spiritExitOvoo) {
    ctx.save();
    // Анхны зорчилт / cheat — овоо нээлттэй, гэрлээр хүрээлэгдсэн
    const glow = ctx.createRadialGradient(x, y - 12, 4, x, y - 12, 56);
    glow.addColorStop(0, "rgba(180,210,255,0.45)");
    glow.addColorStop(0.45, "rgba(140,180,240,0.18)");
    glow.addColorStop(1, "rgba(160,190,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 12, 56, 0, Math.PI * 2);
    ctx.fill();
    drawSpiritOvooAt(ctx, x, y, time, true);
    // Cheat: буцах + ус — лонх үүдэнд
    if (!story.spiritOvooSoulCollected && story.spiritOvooSoulActive) {
      const bob = Math.sin(time * 2.2) * 1.2;
      drawSpiritWaterBottle(ctx, x + 2, y - 6 + bob, time, 0.48);
      ctx.textAlign = "center";
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 2.5;
      ctx.strokeText("E — Ус авах", x, y - 28);
      ctx.fillStyle = "#c8e4ff";
      ctx.fillText("E — Ус авах", x, y - 28);
      ctx.textAlign = "left";
    }
    ctx.restore();
    return;
  }

  // Хоёр дахь зорчилт — овоо + шилэн ус (эсвэл авсны дараа сүүдэр)
  const secondVisitOvoo =
    state.phase === "spirit" &&
    state.spiritMode === "shulmas" &&
    !story.spiritAllowReturn &&
    story.spiritOvooBuilt;
  if (secondVisitOvoo) {
    ctx.save();
    const sealed = story.spiritOvooSoulCollected === true;
    drawSpiritOvooAt(ctx, x, y, time, !sealed);
    // Жижиг лонх — овооны үүд (урд суурь)
    if (!sealed && story.spiritOvooSoulActive) {
      const bob = Math.sin(time * 2.2) * 1.2;
      const sx = x + 2;
      const sy = y - 6 + bob;
      drawSpiritWaterBottle(ctx, sx, sy, time, 0.48);
      ctx.textAlign = "center";
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 2.5;
      ctx.strokeText("E — Ус авах", x, y - 28);
      ctx.fillStyle = "#c8e4ff";
      ctx.fillText("E — Ус авах", x, y - 28);
      ctx.textAlign = "left";
    }
    ctx.restore();
    return;
  }

  const effectRatio = clamp(
    story.stormTraceEffectRemaining / STORM_TRACE_EFFECT_DURATION,
    0,
    1,
  );
  const pulse = 0.72 + Math.sin(time * 3.7) * 0.12 + effectRatio * 0.25;

  ctx.save();
  if (!story.spiritOvooBuilt || effectRatio > 0) {
    ctx.globalAlpha = story.spiritOvooBuilt ? 0.35 + effectRatio * 0.4 : pulse;
    const stain = ctx.createRadialGradient(x, y, 3, x, y, 42);
    stain.addColorStop(0, "rgba(16,12,17,0.82)");
    stain.addColorStop(0.48, "rgba(38,30,42,0.55)");
    stain.addColorStop(1, "rgba(40,35,46,0)");
    ctx.fillStyle = stain;
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 48, 24, -0.18, 0, Math.PI * 2);
    ctx.fill();

    if (!story.spiritOvooBuilt) {
      for (let i = 0; i < 5; i++) {
        const phase = time * (0.75 + i * 0.08) + i * 1.4;
        const drift = 12 + i * 5;
        const wx = x + Math.sin(phase) * drift;
        const wy = y - 8 - ((phase * 15) % 54);
        ctx.strokeStyle = `rgba(135,151,180,${0.24 + effectRatio * 0.2})`;
        ctx.lineWidth = 1.3 + (i % 2) * 0.7;
        ctx.beginPath();
        ctx.moveTo(wx - 8, wy + 12);
        ctx.bezierCurveTo(wx + 12, wy + 4, wx - 12, wy - 7, wx + 5, wy - 18);
        ctx.stroke();
      }

      ctx.strokeStyle = `rgba(180,196,220,${0.42 + effectRatio * 0.28})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y - 2, 31 + Math.sin(time * 2.5) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (story.spiritOvooBuilt) {
    drawSpiritOvooAt(
      ctx,
      x,
      y,
      time,
      story.spiritOvooSoulCollected !== true,
    );
  } else if (story.postSpiritScoutDialogueCompleted) {
    // Босгох газрын тэмдэг — чулуун суурь
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#5a5348";
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a7164";
    for (const [ox, oy, r] of [
      [-10, 2, 5],
      [8, 3, 4.5],
      [-2, -1, 5.5],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Овоон дээрх шилэн лонхтой ус */
function drawSpiritWaterBottle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  scale = 1,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
  glow.addColorStop(0, "rgba(160,210,255,0.7)");
  glow.addColorStop(0.55, "rgba(100,170,240,0.28)");
  glow.addColorStop(1, "rgba(80,140,220,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();

  // Бие — шил
  const body = ctx.createLinearGradient(-10, -8, 12, 18);
  body.addColorStop(0, "rgba(230,245,255,0.85)");
  body.addColorStop(0.45, "rgba(160,205,240,0.55)");
  body.addColorStop(1, "rgba(90,150,200,0.65)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.quadraticCurveTo(-11, 6, -8, 16);
  ctx.lineTo(8, 16);
  ctx.quadraticCurveTo(11, 6, 9, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Ус
  const waterTop = 2 + Math.sin(time * 3.1) * 0.6;
  ctx.fillStyle = "rgba(50,140,230,0.85)";
  ctx.beginPath();
  ctx.moveTo(-7.5, waterTop);
  ctx.quadraticCurveTo(0, waterTop - 2, 7.5, waterTop);
  ctx.lineTo(7, 15);
  ctx.lineTo(-7, 15);
  ctx.closePath();
  ctx.fill();

  // Хүзүү + таг
  ctx.fillStyle = "rgba(210,235,255,0.8)";
  ctx.fillRect(-3.5, -16, 7, 11);
  ctx.fillStyle = "#c4a574";
  ctx.fillRect(-4.5, -20, 9, 5);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(-4, 10);
  ctx.stroke();

  ctx.restore();
}

function drawSpiritOvooAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  lit = true,
): void {
  ctx.globalAlpha = 1;

  // Сүүдэр
  ctx.fillStyle = lit ? "rgba(18, 14, 10, 0.38)" : "rgba(8, 6, 10, 0.55)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 34, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Чулуун суурь — тойрог
  const baseStones: Array<[number, number, number, number, string]> = [
    [-22, 8, 7, 5.2, lit ? "#6e6860" : "#3a3630"],
    [-14, 10, 6.5, 4.8, lit ? "#5c564e" : "#2e2a26"],
    [-4, 11, 7.2, 5, lit ? "#787168" : "#403c36"],
    [6, 10, 6.8, 4.9, lit ? "#686258" : "#38342e"],
    [16, 9, 7, 5.1, lit ? "#736c62" : "#3c3832"],
    [24, 7, 5.8, 4.4, lit ? "#5a544c" : "#2c2824"],
    [-20, 4, 5.5, 4.2, lit ? "#827a70" : "#444038"],
    [18, 3, 5.2, 4, lit ? "#6a6359" : "#36322c"],
    [-8, 5, 5, 3.8, lit ? "#4f4a44" : "#282420"],
    [10, 5, 5.4, 4, lit ? "#8a8278" : "#4a443c"],
  ];
  for (const [ox, oy, rx, ry, color] of baseStones) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + ox, y + oy, rx, ry, 0.1, 0, Math.PI * 2);
    ctx.fill();
    if (lit) {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.ellipse(
        x + ox - rx * 0.22,
        y + oy - ry * 0.25,
        rx * 0.3,
        ry * 0.22,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  const apexY = y - 58;
  const baseHalfW = 20;
  const poleCount = 14;
  const poleColors = lit
    ? ["#5a4e42", "#6b5c4c", "#4a4036", "#7a6a58", "#52463c"]
    : ["#2a2420", "#322c28", "#1e1a16", "#3a342e", "#282420"];

  for (let i = 0; i < poleCount; i++) {
    const t = i / (poleCount - 1);
    const angle = -0.95 + t * 1.9;
    const behind = Math.cos(angle) < 0.15;
    if (!behind) continue;
    const bx = x + Math.sin(angle) * baseHalfW;
    const by = y + 2 + Math.abs(Math.sin(angle)) * 3;
    ctx.strokeStyle = poleColors[i % poleColors.length]!;
    ctx.lineWidth = 1.35 + (i % 3) * 0.25;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(x + Math.sin(angle) * 1.5, apexY + ((i % 3) - 1) * 0.8);
    ctx.stroke();
  }

  ctx.fillStyle = lit ? "rgba(22, 18, 14, 0.72)" : "rgba(8, 6, 8, 0.88)";
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 2);
  ctx.lineTo(x - 3, apexY + 14);
  ctx.lineTo(x + 3, apexY + 14);
  ctx.lineTo(x + 9, y + 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = lit ? "#6a5644" : "#2a221c";
  ctx.fillRect(x - 7, y - 1, 14, 3.5);
  ctx.fillStyle = lit ? "#8a7460" : "#3a3228";
  ctx.fillRect(x - 6, y - 3.5, 12, 2.5);

  for (let i = 0; i < poleCount; i++) {
    const t = i / (poleCount - 1);
    const angle = -0.95 + t * 1.9;
    const front = Math.cos(angle) >= 0.15;
    if (!front) continue;
    if (Math.abs(angle) < 0.22) continue;
    const bx = x + Math.sin(angle) * baseHalfW;
    const by = y + 2 + Math.abs(Math.sin(angle)) * 3;
    const tipJitter = ((i * 17) % 5) - 2;
    ctx.strokeStyle = poleColors[(i + 2) % poleColors.length]!;
    ctx.lineWidth = 1.5 + (i % 3) * 0.3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(x + Math.sin(angle) * 2 + tipJitter * 0.35, apexY + tipJitter * 0.4);
    ctx.stroke();
  }

  ctx.strokeStyle = lit ? "#5a4e42" : "#2a2420";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    const ox = (i - 2) * 2.2;
    ctx.beginPath();
    ctx.moveTo(x + ox * 0.3, apexY + 4);
    ctx.lineTo(x + ox, apexY - 6 - (i % 2));
    ctx.stroke();
  }

  if (lit) {
    const glow = 0.16 + Math.sin(time * 2.2) * 0.06;
    const aura = ctx.createRadialGradient(x, y - 24, 4, x, y - 24, 36);
    aura.addColorStop(0, `rgba(150,175,210,${glow})`);
    aura.addColorStop(1, "rgba(150,175,210,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y - 24, 36, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Сүүдэрлэг — гэрэлгүй
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y - 20, 28, 36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}


/**
 * Түр хөгжүүлэлтийн cheat: нээлтийн story-н одоогийн үеийг дараагийн
 * тогтвортой objective руу шууд шилжүүлнэ.
 */
export function debugSkipCurrentStoryStage(state: GameState): void {
  ensureStoryState(state);
  const story = state.story;

  if (state.phase === "menu") {
    beginOpeningSequence(state);
    setMessage(state, "CHEAT: Нээлтийн хэсгийг эхлүүллээ.", 2);
    return;
  }

  if (state.phase === "intro" || !story.introCompleted) {
    finishOpeningSequence(state);
    setMessage(state, "CHEAT: Оршил алгаслаа.", 2);
    return;
  }

  if (!story.hearthQuestCompleted || story.activeMainObjective === "restoreHearth") {
    story.hearthQuestStarted = true;
    story.hearthWoodCollected = CAMPFIRE_WOOD_COST;
    story.campfireRelit = true;
    story.hearthQuestCompleted = true;
    story.hearthCompletionEffectShown = true;
    story.hearthCompletionEffectRemaining = 0;
    state.world.campfire.placed = true;
    state.world.campfire.lit = true;
    state.world.campfire.igniting = 0;
    state.world.campfire.fuel = Math.max(state.world.campfire.fuel, 18);
    startLivestockRecoveryQuest(state);
    setMessage(state, "CHEAT: Галын үеийг алгаслаа.", 2);
    return;
  }

  const livestockOrSunsetActive =
    !story.livestockQuestCompleted ||
    story.activeMainObjective === "findScatteredLivestock" ||
    story.firstNightStage === "recoveringLivestock" ||
    story.firstNightStage === "sunset" ||
    story.firstNightStage === "nightNarration" ||
    story.firstNightStage === "wolfWarning";

  if (livestockOrSunsetActive) {
    ensureOpeningLivestockRoster(state);
    const ids = [...story.openingLivestockIds];
    story.livestockQuestStarted = true;
    story.livestockNarrationShown = true;
    story.livestockFoundIds = [...ids];
    story.livestockReturnedIds = [...ids];
    story.livestockQuestCompleted = true;
    story.livestockCompletionEffectShown = true;
    story.livestockCompletionEffectRemaining = 0;
    story.firstDayTimeAccelerationStarted = true;
    story.firstDayEveningHoldActive = false;
    story.firstNightSunsetStarted = true;
    story.firstNightNormalTimeRestored = true;
    story.firstNightNarrationShown = true;
    story.firstNightWolfWarningShown = true;
    story.wolfThreatQuestStarted = true;
    story.firstNightStage = "protecting";
    story.firstNightStageRemaining = 0;
    story.activeMainObjective = "protectFlock";
    story.temporaryPlayerProtectionActive = true;
    story.temporaryLivestockProtectionActive = true;

    const animals = state.world.flock.visuals.filter((animal) =>
      ids.includes(animal.id),
    );
    animals.forEach((animal, index) => {
      const pen = penCenterFor(state.world, penForLivestock(animal.kind));
      const angle = (index / Math.max(1, animals.length)) * Math.PI * 2;
      const radius = 26 + (index % 2) * 12;
      animal.pos.x = pen.x + Math.cos(angle) * radius;
      animal.pos.y = pen.y + Math.sin(angle) * radius;
      animal.vel.x = 0;
      animal.vel.y = 0;
    });

    state.world.flockOut = false;
    state.world.cattleOut = false;
    state.world.flockBreach = null;
    state.world.cattleBreach = null;
    state.world.timeOfDay = FIRST_NIGHT_TARGET_TIME;
    state.world.dayPhase = getDayPhase(
      state.world.timeOfDay,
      state.world.season,
    );
    ensureStoryWolf(state);
    setMessage(state, "CHEAT: Мал, нар жаргах үеийг алгаслаа.", 2.4);
    return;
  }

  if (
    story.activeMainObjective === "protectFlock" ||
    story.firstNightStage === "protecting" ||
    story.firstNightStage === "elderIntervention" ||
    story.firstNightStage === "elderApproach" ||
    story.firstNightStage === "elderDialogue"
  ) {
    const wolf = ensureStoryWolf(state);
    if (wolf) {
      story.oldManArrivalStarted = true;
      story.shortDialogueStarted = true;
      completeUnknownOldManGuidance(state, wolf);
      wolf.hp = 0;
      wolf.alive = false;
      wolf.vel.x = 0;
      wolf.vel.y = 0;
    } else {
      story.shortDialogueCompleted = true;
      story.milestone3Completed = true;
      story.firstNightStage = "completed";
      story.firstNightStageRemaining = 0;
      story.activeMainObjective = "observeWolfMovement";
    }
    setMessage(state, "CHEAT: Өвгөний заавар хүртэл алгаслаа.", 2.4);
    return;
  }

  if (
    story.activeMainObjective === "observeWolfMovement" ||
    story.activeMainObjective === "parryStoryWolf" ||
    story.activeMainObjective === "counterStoryWolf"
  ) {
    const wolf = ensureStoryWolf(state);
    story.milestone4Started = true;
    story.storyWolfRedSignalSeen = true;
    story.storyWolfParryCompleted = true;
    story.storyWolfOpeningActive = false;
    story.storyWolfCounterCompleted = true;
    story.storyWolfDefeated = true;
    story.nightCompletionEffectShown = true;
    story.nightCompletionEffectRemaining = 0;
    story.milestone4Completed = true;
    if (wolf) {
      wolf.hp = 0;
      wolf.alive = false;
      wolf.vel.x = 0;
      wolf.vel.y = 0;
    }
    revealSeatedOldMan(state);
    setMessage(state, "CHEAT: Тулааны сургалтыг алгаслаа.", 2.4);
    return;
  }

  if (story.activeMainObjective === "talkToOldMan") {
    story.milestone5Started = true;
    story.milestone5DialogueCompleted = true;
    story.activeMainObjective = "visitOldManAtDawn";
    const elder = state.world.elder;
    elder.pos = { x: elder.gerPos.x - 36, y: elder.gerPos.y + 18 };
    elder.pose = "seated";
    elder.face = -1;
    elder.walkPhase = 0;
    setMessage(state, "CHEAT: Өвгөний танилцах яриаг алгаслаа.", 2.5);
    return;
  }

  if (story.activeMainObjective === "visitOldManAtDawn") {
    story.milestone6Started = true;
    story.milestone6DialogueCompleted = true;
    story.activeMainObjective = "inspectStormTrace";
    setMessage(state, "CHEAT: Үүрийн өвгөний яриаг алгаслаа.", 2.5);
    return;
  }

  if (story.activeMainObjective === "inspectStormTrace") {
    const tracePos = ensureStormTracePosition(state);
    story.milestone7Started = true;
    story.stormTraceInspected = true;
    story.stormTraceEffectRemaining = 0;
    story.activeMainObjective = "returnToOldManWithTrace";
    state.player.pos = { ...tracePos };
    setMessage(state, "CHEAT: Шуурганы мөрийг шинжиллээ.", 2.5);
    return;
  }

  if (story.activeMainObjective === "returnToOldManWithTrace") {
    story.stormTraceDialogueCompleted = true;
    story.spiritPathOpened = true;
    ensureShulmasHelpers(state);
    enterSpiritWorld(state, { scout: true });
    story.activeMainObjective = "defeatSpiritGuards";
    setMessage(state, "CHEAT: Сүнсний замыг нээлээ (тагнах).", 2.5);
    return;
  }

  if (story.activeMainObjective === "talkAfterSpiritScout") {
    story.postSpiritScoutDialogueCompleted = true;
    story.activeMainObjective = null;
    ensureStormTracePosition(state);
    setMessage(
      state,
      "CHEAT: Өвгөний бэлтгэлийн яриаг алгаслаа. Овоо заавал биш.",
      2.5,
    );
    return;
  }

  if (story.activeMainObjective === "buildSpiritOvoo") {
    story.spiritOvooBuilt = true;
    story.postSpiritScoutDialogueCompleted = true;
    story.activeMainObjective = null;
    ensureStormTracePosition(state);
    state.player.pos = { ...ensureStormTracePosition(state) };
    setMessage(state, "CHEAT: Сүнсний овоо бослоо.", 2.5);
    return;
  }

  if (story.activeMainObjective === "enterSpiritViaOvoo") {
    story.spiritOvooBuilt = true;
    story.postSpiritScoutDialogueCompleted = true;
    ensureShulmasHelpers(state);
    placePlayerNearHelpers(state);
    enterSpiritWorld(state, { scout: false });
    story.activeMainObjective = "defeatSpiritGuards";
    setMessage(state, "CHEAT: Овоогоор сүнсний орон руу орлоо.", 2.5);
    return;
  }

  if (story.activeMainObjective === "defeatSpiritGuards") {
    const route = state.world.firstRoute;
    for (const enemy of route.enemies) {
      if (enemy.kind === "shulmasynBaatar") continue;
      enemy.hp = 0;
      enemy.alive = false;
      enemy.vel = { x: 0, y: 0 };
    }
    route.defeated = route.total;
    route.complete = true;
    route.bolts = [];
    story.activeMainObjective = "reachCursedGate";
    setMessage(state, "CHEAT: Таван сахиулыг дарлаа.", 2.5);
    return;
  }

  if (story.activeMainObjective === "reachCursedGate") {
    const route = state.world.firstRoute;
    state.player.pos = {
      x: route.gatePos.x,
      y: route.gatePos.y + route.gateRadius + 10,
    };
    state.input.interact = true;
    tryInteractFirstRoute(state);
    story.activeMainObjective = "defeatShulmasBaatar";
    setMessage(state, "CHEAT: Шулмасын баатрын тулааныг эхлүүллээ.", 2.5);
    return;
  }

  if (story.activeMainObjective === "defeatShulmasBaatar") {
    const route = state.world.firstRoute;
    const boss = route.enemies.find((enemy) => enemy.kind === "shulmasynBaatar");
    if (boss) {
      boss.hp = 0;
      boss.alive = false;
      boss.vel = { x: 0, y: 0 };
      route.swordDrop.pos = { ...boss.pos };
    }
    route.bossDefeated = true;
    route.swordDrop.visible = true;
    route.swordDrop.collected = false;
    story.activeMainObjective = "claimSkySword";
    setMessage(state, "CHEAT: Шулмасын баатрыг дарлаа.", 2.5);
    return;
  }

  if (story.activeMainObjective === "claimSkySword") {
    const route = state.world.firstRoute;
    route.swordDrop.visible = false;
    route.swordDrop.collected = true;
    state.world.tumurShulmas.unlocked = true;
    state.player.hasSkySword = true;
    state.player.weapon = "skySword";
    story.activeMainObjective = "openBlackIronGate";
    setMessage(state, "CHEAT: Хөх тэнгэрийн сэлмийг авлаа.", 2.5);
    return;
  }

  if (story.activeMainObjective === "openBlackIronGate") {
    const gate = state.world.tumurShulmas;
    state.player.pos = {
      x: gate.gatePos.x,
      y: gate.gatePos.y + gate.gateRadius + 8,
    };
    state.input.interact = true;
    tryInteractFirstRoute(state);
    story.activeMainObjective = "defeatTumurShulmas";
    setMessage(state, "CHEAT: Хар төмөр хаалгыг нээлээ.", 2.5);
    return;
  }

  if (story.activeMainObjective === "defeatTumurShulmas") {
    const tumur = state.world.tumurShulmas;
    tumur.hp = 0;
    tumur.defeated = true;
    tumur.active = false;
    tumur.phase = "sealed";
    state.spiritCleared = true;
    story.milestone7Completed = true;
    story.activeMainObjective = "returnFromSpirit";
    fadeOutTumurBossMusic(2.8);
    setMessage(state, "CHEAT: Төмөр шулмасыг дарлаа.", 2.5);
    return;
  }

  if (story.activeMainObjective === "returnFromSpirit") {
    exitSpiritWorld(state);
    story.activeMainObjective = null;
    setMessage(state, "CHEAT: Бодит ертөнцөд буцлаа.", 2.5);
    return;
  }

  if (
    story.milestone8Started &&
    !story.familyReunionDialogueCompleted
  ) {
    story.familyReunionEffectRemaining = 0;
    story.familyReunionEffectShown = true;
    story.familyReunionDialogueStarted = true;
    story.familyReunionDialogueCompleted = true;
    story.milestone8Completed = true;
    story.activeMainObjective = "growFlock";
    state.elderDialogueId = null;
    state.elderDialogueLine = 0;
    state.elderShowingChoices = false;
    state.phase = "playing";
    setMessage(state, "CHEAT: Гэр бүлийн уулзалтыг алгаслаа.", 2.5);
    return;
  }

  if (story.activeMainObjective === "growFlock") {
    setMessage(state, "Story дууссан. Одоо сүргээ 1000 толгойд хүргэ.", 2.5);
    return;
  }

  setMessage(state, "Энэ төлөвт алгасах story үе алга.", 2.5);
}

/**
 * Cheat (`,`): Мангасын зэвсэг (+сонголтоор ус).
 * `;` jump-аас дуудахад snapshot-ийн дараа дуудна — буцахад хураагдана.
 */
export function debugGrantSpiritCombatGear(
  state: GameState,
  opts: { withWater?: boolean } = {},
): void {
  state.player.gear.bow = true;
  state.player.inventory.arrows = Math.max(state.player.inventory.arrows, 80);
  state.player.inventory.stone = Math.max(
    state.player.inventory.stone,
    SNAKE_CRUSH_STONE_COST,
  );
  state.player.inventory.wood = Math.max(state.player.inventory.wood, 40);
  state.player.vitals.health = state.player.vitals.maxHealth;
  state.player.vitals.hunger = Math.max(state.player.vitals.hunger, 70);
  state.player.vitals.warmth = Math.max(state.player.vitals.warmth, 70);
  if (opts.withWater) {
    state.spiritPoints = Math.max(state.spiritPoints, SPIRIT_WATER_SIPS);
    state.story.spiritOvooSoulCollected = true;
  }
  sfx("buy");
  setMessage(
    state,
    opts.withWater
      ? `CHEAT: Нум · сум 80 · чулуу ${SNAKE_CRUSH_STONE_COST} · ус ${SPIRIT_WATER_SIPS}.`
      : `CHEAT: Нум · сум 80 · чулуу ${SNAKE_CRUSH_STONE_COST}.`,
    3,
  );
}

export function debugJumpToSpiritWorld(state: GameState): void {
  ensureStoryState(state);
  const story = state.story;

  if (state.phase === "menu") {
    beginOpeningSequence(state);
  }
  if (state.phase === "intro" || !story.introCompleted) {
    finishOpeningSequence(state);
  }

  // Эртний quest / шөнө / өвгөн — сүнс нээгдэх хүртэл дуусгана
  story.introCompleted = true;
  story.hearthQuestStarted = true;
  story.hearthWoodCollected = CAMPFIRE_WOOD_COST;
  story.campfireRelit = true;
  story.hearthQuestCompleted = true;
  story.hearthCompletionEffectShown = true;
  story.hearthCompletionEffectRemaining = 0;
  state.gerStoveLit = true;
  state.gerStoveFuel = Math.max(state.gerStoveFuel, 40);

  ensureOpeningLivestockRoster(state);
  const livestockIds = [...story.openingLivestockIds];
  story.livestockQuestStarted = true;
  story.livestockNarrationShown = true;
  story.livestockFoundIds = [...livestockIds];
  story.livestockReturnedIds = [...livestockIds];
  story.livestockQuestCompleted = true;
  story.livestockCompletionEffectShown = true;
  story.livestockCompletionEffectRemaining = 0;
  story.firstDayTimeAccelerationStarted = true;
  story.firstDayEveningHoldActive = false;
  story.firstNightSunsetStarted = true;
  story.firstNightNormalTimeRestored = true;
  story.firstNightNarrationShown = true;
  story.firstNightWolfWarningShown = true;
  story.wolfThreatQuestStarted = true;
  story.firstNightStage = "completed";
  story.firstNightStageRemaining = 0;
  story.temporaryPlayerProtectionActive = false;
  story.temporaryLivestockProtectionActive = false;
  story.oldManArrivalStarted = true;
  story.oldManArrived = true;
  story.shortDialogueStarted = true;
  story.shortDialogueCompleted = true;
  story.milestone3Completed = true;
  story.milestone4Started = true;
  story.milestone4Completed = true;
  story.storyWolfDefeated = true;
  story.storyWolfParryCompleted = true;
  story.storyWolfCounterCompleted = true;
  story.storyWolfOpeningActive = false;
  story.nightCompletionEffectShown = true;
  story.nightCompletionEffectRemaining = 0;
  story.milestone5Started = true;
  story.milestone5DialogueCompleted = true;
  story.milestone6Started = true;
  story.milestone6DialogueCompleted = true;
  story.milestone7Started = true;
  story.stormTraceInspected = true;
  story.stormTraceDialogueCompleted = true;
  story.stormTraceEffectRemaining = 0;
  story.spiritPathOpened = true;
  story.milestone7Completed = false;
  story.milestone8Started = false;
  story.familyReunionEffectShown = false;
  story.familyReunionEffectRemaining = 0;
  story.familyReunionDialogueStarted = false;
  story.familyReunionDialogueCompleted = false;
  story.milestone8Completed = false;
  story.activeMainObjective = "defeatSpiritGuards";

  // Төмөр шулмас / эхний зам — дахин эхлүүлнэ
  const tumur = state.world.tumurShulmas;
  tumur.unlocked = false;
  tumur.hp = tumur.maxHp;
  tumur.defeated = false;
  tumur.active = false;
  tumur.phase = "sealed";
  tumur.phaseTimer = 0;
  tumur.needles = [];
  tumur.flash = 0;

  const route = state.world.firstRoute;
  route.bossStarted = false;
  route.bossDefeated = false;
  route.swordDrop.visible = false;
  route.swordDrop.collected = false;
  route.complete = false;
  route.bolts = [];

  state.player.hasSkySword = false;
  state.player.weapon = "staff";
  state.player.vitals.health = state.player.vitals.maxHealth;
  state.player.vitals.hunger = Math.max(state.player.vitals.hunger, 70);
  state.player.vitals.warmth = Math.max(state.player.vitals.warmth, 70);

  // Түр cheat — нөөцийг хадгалаад зэвсэг өгнө (буцахад хураана)
  state.spiritVisitSnapshot = null;
  stashSpiritVisitSnapshot(state);
  debugGrantSpiritCombatGear(state);
  state.spiritPoints = 0;
  story.spiritScoutDone = true;
  story.spiritOvooBuilt = true;
  story.postSpiritScoutDialogueCompleted = true;
  story.spiritOvooSoulCollected = false;
  story.spiritOvooSoulActive = true;

  state.shopOpen = false;
  state.craftOpen = false;
  state.gerArtZoom = null;
  state.elderDialogueId = null;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.parents = null;
  state.parentsReturned = false;

  // Сүнс рүү — cheat: ус авч болох + буцах хаалга үлдэнэ
  const ovooPos = ensureStormTracePosition(state);
  if (state.phase === "spirit") {
    ensureShulmasHelpers(state);
    state.spiritCleared = false;
    state.spiritTransition = 0.6;
  } else {
    state.phase = "playing";
    ensureShulmasHelpers(state);
    enterSpiritWorld(state, { scout: false });
  }
  story.spiritAllowReturn = true;
  story.spiritOvooSoulCollected = false;
  story.spiritOvooSoulActive = true;
  state.spiritPoints = 0;
  state.player.pos = { x: ovooPos.x, y: ovooPos.y + 36 };

  state.fx.shake = Math.max(state.fx.shake, 2);
  spawnParticles(state, state.player.pos, 22, "#7ec8ff", {
    speed: 70,
    life: 1.2,
    size: 2.4,
    gravity: -12,
  });
  sfx("howl");
  setMessage(
    state,
    `CHEAT: Ус ав (${SPIRIT_WATER_SIPS} амь) · E буцах үед зэвсэг/материал хураагдана.`,
    4.5,
  );
}

/**
 * Cheat (`'`): Төмөр шулмасыг дийлээд аав ээжтэй амьдрах үе рүү шууд шилжинэ.
 */
export function debugJumpToFamilyLife(state: GameState): void {
  startFamilyLifeRun(state, { cheat: true });
}

/**
 * Түүх алгасаад аав ээжтэй амьдрах / сүрэг өсгөх үеэс эхэлнэ.
 * Story нэг удаа дуусгасан тоглогчид дахин эхлэхэд ашиглана.
 */
export function startFamilyLifeRun(
  state: GameState,
  options: { cheat?: boolean } = {},
): void {
  ensureStoryState(state);
  const story = state.story;

  if (state.phase === "menu") {
    beginOpeningSequence(state);
  }
  if (state.phase === "intro" || !story.introCompleted) {
    finishOpeningSequence(state);
  }

  // —— Эртний quest-үүдийг дуусгана ——
  story.introCompleted = true;
  story.hearthQuestStarted = true;
  story.hearthWoodCollected = CAMPFIRE_WOOD_COST;
  story.campfireRelit = true;
  story.hearthQuestCompleted = true;
  story.hearthCompletionEffectShown = true;
  story.hearthCompletionEffectRemaining = 0;
  // Гаднах гал нууна — гэрийн зуух л үлдэнэ
  state.world.campfire.placed = false;
  state.world.campfire.lit = false;
  state.world.campfire.igniting = 0;
  state.world.campfire.fuel = 0;
  state.gerStoveLit = true;
  state.gerStoveFuel = Math.max(state.gerStoveFuel, 40);

  ensureOpeningLivestockRoster(state);
  const livestockIds = [...story.openingLivestockIds];
  story.livestockQuestStarted = true;
  story.livestockNarrationShown = true;
  story.livestockFoundIds = [...livestockIds];
  story.livestockReturnedIds = [...livestockIds];
  story.livestockQuestCompleted = true;
  story.livestockCompletionEffectShown = true;
  story.livestockCompletionEffectRemaining = 0;
  story.firstDayTimeAccelerationStarted = true;
  story.firstDayEveningHoldActive = false;
  story.firstNightSunsetStarted = true;
  story.firstNightNormalTimeRestored = true;
  story.firstNightNarrationShown = true;
  story.firstNightWolfWarningShown = true;
  story.wolfThreatQuestStarted = true;
  story.firstNightStage = "completed";
  story.firstNightStageRemaining = 0;
  story.temporaryPlayerProtectionActive = false;
  story.temporaryLivestockProtectionActive = false;
  story.oldManArrivalStarted = true;
  story.oldManArrived = true;
  story.shortDialogueStarted = true;
  story.shortDialogueCompleted = true;
  story.milestone3Completed = true;
  story.milestone4Started = true;
  story.milestone4Completed = true;
  story.storyWolfDefeated = true;
  story.storyWolfParryCompleted = true;
  story.storyWolfCounterCompleted = true;
  story.storyWolfOpeningActive = false;
  story.nightCompletionEffectShown = true;
  story.nightCompletionEffectRemaining = 0;
  story.milestone5Started = true;
  story.milestone5DialogueCompleted = true;
  story.milestone6Started = true;
  story.milestone6DialogueCompleted = true;
  story.milestone7Started = true;
  story.stormTraceInspected = true;
  story.stormTraceDialogueCompleted = true;
  story.stormTraceEffectRemaining = 0;
  story.spiritPathOpened = true;

  const animals = state.world.flock.visuals.filter((animal) =>
    livestockIds.includes(animal.id),
  );
  animals.forEach((animal, index) => {
    const pen = penCenterFor(state.world, penForLivestock(animal.kind));
    const angle = (index / Math.max(1, animals.length)) * Math.PI * 2;
    const radius = 26 + (index % 2) * 12;
    animal.pos.x = pen.x + Math.cos(angle) * radius;
    animal.pos.y = pen.y + Math.sin(angle) * radius;
    animal.vel.x = 0;
    animal.vel.y = 0;
  });
  state.world.flockOut = false;
  state.world.cattleOut = false;
  state.world.flockBreach = null;
  state.world.cattleBreach = null;

  // Story чоныг арилгана
  for (const wolf of state.world.wolves) {
    if (story.storyWolfId !== null && wolf.id === story.storyWolfId) {
      wolf.hp = 0;
      wolf.alive = false;
      wolf.vel.x = 0;
      wolf.vel.y = 0;
    }
  }

  // —— Эхний зам / шулмас ——
  const route = state.world.firstRoute;
  for (const enemy of route.enemies) {
    enemy.hp = 0;
    enemy.alive = false;
    enemy.vel = { x: 0, y: 0 };
  }
  route.defeated = route.total;
  route.complete = true;
  route.bossDefeated = true;
  route.bossStarted = true;
  route.bolts = [];
  route.swordDrop.visible = false;
  route.swordDrop.collected = true;

  const tumur = state.world.tumurShulmas;
  tumur.unlocked = true;
  tumur.hp = 0;
  tumur.defeated = true;
  tumur.active = false;
  tumur.phase = "sealed";
  tumur.phaseTimer = 0;
  tumur.needles = [];
  tumur.flash = 0;

  state.player.hasSkySword = true;
  state.player.weapon = "skySword";
  state.player.vitals.health = state.player.vitals.maxHealth;
  state.player.vitals.hunger = Math.max(state.player.vitals.hunger, 70);
  state.player.vitals.warmth = Math.max(state.player.vitals.warmth, 70);

  // Сүнсний орноос гаргана
  if (state.spiritSavedWolves) {
    state.world.wolves = state.spiritSavedWolves;
    state.spiritSavedWolves = null;
  }
  if (state.spiritSavedThieves) {
    state.world.thieves = state.spiritSavedThieves;
    state.spiritSavedThieves = null;
  }
  state.spiritReturnPos = null;
  state.spiritCleared = false;
  state.spiritMode = "purge";
  state.spiritTransition = 0;
  state.world.elder.eyeMode = "idle";
  state.world.elder.pose = "seated";
  state.world.elder.pos = {
    x: state.world.elder.gerPos.x - 36,
    y: state.world.elder.gerPos.y + 18,
  };

  // —— Аав ээжтэй амьдрах үе ——
  ensureParents(state);
  state.player.pos = {
    x: state.world.campPos.x + 28,
    y: state.world.campPos.y + 55,
  };
  state.phase = "playing";
  state.shopOpen = false;
  state.craftOpen = false;
  state.gerArtZoom = null;
  state.elderDialogueId = null;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.victoryShown = true;
  state.herdVictoryShown = state.herdVictoryShown ?? false;
  state.winReason = state.winReason ?? null;

  story.milestone7Completed = true;
  story.milestone8Started = true;
  story.familyReunionEffectShown = true;
  story.familyReunionEffectRemaining = 0;
  story.familyReunionDialogueStarted = true;
  story.familyReunionDialogueCompleted = true;
  story.milestone8Completed = true;
  story.activeMainObjective = "growFlock";

  state.fx.shake = Math.max(state.fx.shake, 2.5);
  spawnParticles(state, state.world.campPos, 28, "#f2cf7a", {
    speed: 70,
    life: 1.4,
    size: 2.4,
    gravity: -14,
  });
  sfx("win");
  startFamilyLifeTheme();
  setMessage(
    state,
    options.cheat
      ? "CHEAT: Шулмасыг дийлээд аав ээжтэй амьдрах үе эхэллээ."
      : "Түүх алгасаж, аав ээжтэй амьдралаа эхлэв. Сүргээ өсгө!",
    3.2,
  );
}

export function updateLivestockRecoveryQuest(
  state: GameState,
  dt: number,
): void {
  const story = state.story;
  if (!story.livestockQuestStarted) {
    startLivestockRecoveryQuest(state);
  }
  if (!story.livestockQuestStarted) return;

  if (state.phase === "playing" && openingStoryControlsWorldTime(state)) {
    state.world.elapsed += Math.max(0, dt);
  }

  if (!story.livestockQuestCompleted) {
    for (const animal of state.world.flock.visuals) {
      if (
        !story.openingLivestockIds.includes(animal.id) ||
        !animalInPen(animal.pos, state.world, animal.kind)
      ) {
        continue;
      }
      // Хашаанд ормогц олдсон/буцаасан гэж тооцно (N-ээр тууж оруулсан)
      if (!story.livestockFoundIds.includes(animal.id)) {
        story.livestockFoundIds.push(animal.id);
      }
      if (!story.livestockReturnedIds.includes(animal.id)) {
        story.livestockReturnedIds.push(animal.id);
      }
    }

    const allReturned =
      story.openingLivestockTotal > 0 &&
      story.openingLivestockIds.every((id) =>
        story.livestockReturnedIds.includes(id),
      );
    if (allReturned) {
      story.livestockQuestCompleted = true;
      story.livestockCompletionEffectShown = true;
      story.livestockCompletionEffectRemaining =
        LIVESTOCK_COMPLETION_EFFECT_DURATION;
      story.firstNightStage = "sunset";
      story.firstNightStageRemaining = FIRST_NIGHT_SUNSET_DURATION;
      story.firstDayEveningHoldActive = false;
      story.firstNightSunsetStarted = true;
      state.world.flockOut = false;
      state.world.cattleOut = false;
      state.world.flockBreach = null;
      state.world.cattleBreach = null;
      state.message = "";
      state.messageTimer = 0;
      sfx("levelup");
      spawnParticles(state, penCenter(state.world), 18, "#c8a66d", {
        speed: 88,
        life: 1.1,
        size: 2.7,
        gravity: 18,
      });
      setMessage(state, "Мал бүрдэв!", 3);
    }
  }
  if (!story.livestockQuestCompleted) {
    updateFirstDayRecoveryTime(state, dt);
  }

  const livestockCompletionEffectWasActive =
    story.livestockCompletionEffectRemaining > 0;
  if (livestockCompletionEffectWasActive && state.phase === "playing") {
    updateFirstNightCatchUp(
      state,
      dt,
      story.livestockCompletionEffectRemaining,
    );
    story.livestockCompletionEffectRemaining = Math.max(
      0,
      story.livestockCompletionEffectRemaining - dt,
    );
  }
  if (livestockCompletionEffectWasActive) return;
  updateFirstNightSequence(state, dt);
}

export function drawLivestockTrail(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
): void {
  const story = state.story;
  if (
    state.phase !== "playing" ||
    !story.livestockQuestStarted ||
    story.livestockQuestCompleted ||
    story.activeMainObjective !== "findScatteredLivestock"
  ) {
    return;
  }

  const start = state.world.campPos;
  ctx.save();
  for (const anchor of story.openingLivestockAnchors) {
    if (story.livestockFoundIds.includes(anchor.id)) continue;
    const dx = anchor.pos.x - start.x;
    const dy = anchor.pos.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) continue;
    const directionX = dx / length;
    const directionY = dy / length;
    const perpendicularX = -directionY;
    const perpendicularY = directionX;
    const angle = Math.atan2(directionY, directionX) + Math.PI / 2;
    const stepCount = length < 260 ? 3 : HOOFPRINT_TRAIL_STEPS.length;

    for (let i = 0; i < stepCount; i++) {
      const progress = HOOFPRINT_TRAIL_STEPS[i];
      const lateral = Math.sin(anchor.id * 1.73 + i * 2.41) * 7;
      const worldX =
        start.x + dx * progress + perpendicularX * lateral;
      const worldY =
        start.y + dy * progress + perpendicularY * lateral;
      const x = worldX - camera.x;
      const y = worldY - camera.y;
      if (x < -12 || x > VIEW_W + 12 || y < -12 || y > VIEW_H + 12) {
        continue;
      }

      ctx.fillStyle = `rgba(82,62,43,${0.38 - i * 0.035})`;
      ctx.beginPath();
      ctx.ellipse(
        x + perpendicularX * 3.2,
        y + perpendicularY * 3.2,
        2.1,
        3.8,
        angle - 0.16,
        0,
        Math.PI * 2,
      );
      ctx.ellipse(
        x - perpendicularX * 3.2,
        y - perpendicularY * 3.2,
        2.1,
        3.8,
        angle + 0.16,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  // Эхлээд бүтэн мөрийг орчуулна — үг үгээр таслаад хайвал толиноос
  // олдохгүй, монголоор үлдэнэ. Дараа нь орчуулсан текстийг боож мөрлөнө.
  const translated = tr(text);
  const words = translated.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = wrapText(ctx, text, maxWidth);
  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeight);
  });
  return lines.length;
}

function drawOrnamentalLine(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
): void {
  const half = width / 2;
  ctx.beginPath();
  ctx.moveTo(centerX - half, y);
  ctx.lineTo(centerX - 34, y);
  ctx.lineTo(centerX - 22, y - 7);
  ctx.lineTo(centerX - 10, y);
  ctx.lineTo(centerX, y - 9);
  ctx.lineTo(centerX + 10, y);
  ctx.lineTo(centerX + 22, y - 7);
  ctx.lineTo(centerX + 34, y);
  ctx.lineTo(centerX + half, y);
  ctx.stroke();

  for (const x of [centerX - half, centerX, centerX + half]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 4);
    ctx.lineTo(x - 4, y);
    ctx.closePath();
    ctx.stroke();
  }
}

export function drawFirstNightElderCutscene(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  if (!firstNightElderCutsceneActive(state)) return;

  const firstLine = state.story.firstNightStage === "elderIntervention";
  const duration = firstLine
    ? UNKNOWN_OLD_MAN_FIRST_LINE_DURATION
    : UNKNOWN_OLD_MAN_SECOND_LINE_DURATION;
  const elapsed = state.story.oldManArrivalElapsed;
  const fade = clamp(
    Math.min(elapsed / 0.35, (duration - elapsed) / 0.35),
    0,
    1,
  );
  const text = firstLine
    ? "Тайвшир, хүү минь."
    : "Цохиж зодохоос урьтаж, анзаарч харж сур.";

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillRect(0, 0, VIEW_W, 54);
  ctx.fillRect(0, VIEW_H - 112, VIEW_W, 112);

  const vignette = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.25,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.78,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.globalAlpha = fade;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(218,184,105,0.92)";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillText("ҮЛ ТАНИХ ӨВГӨН", 84, VIEW_H - 76);

  ctx.fillStyle = "#f3ead8";
  ctx.font = "600 20px system-ui, sans-serif";
  ctx.fillText(text, 84, VIEW_H - 43);

  ctx.strokeStyle = "rgba(218,184,105,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(84, VIEW_H - 92);
  ctx.lineTo(VIEW_W - 84, VIEW_H - 92);
  ctx.stroke();
  ctx.restore();
}

export function drawOpeningSequence(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  if (state.phase !== "intro") return;

  const sectionIndex = Math.min(
    state.story.introSection,
    OPENING_STORY_SECTIONS.length - 1,
  );
  const section = OPENING_STORY_SECTIONS[sectionIndex]!;
  const elapsed = state.story.introSectionElapsed;
  const hold = Math.max(state.story.introSectionHold, INTRO_SECTION_DURATION);
  const sectionAlpha = clamp(
    Math.min(elapsed / INTRO_FADE_DURATION, (hold - elapsed) / INTRO_FADE_DURATION),
    0,
    1,
  );

  ctx.save();
  // Нимгэн бүрхүүл — ард vignette тод харагдана
  const shade = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  if (section.vignette === "coldDawn") {
    shade.addColorStop(0, "rgba(18,22,36,0.28)");
    shade.addColorStop(0.55, "rgba(8,10,14,0.18)");
    shade.addColorStop(1, "rgba(4,6,10,0.62)");
  } else {
    shade.addColorStop(0, "rgba(4,6,12,0.42)");
    shade.addColorStop(0.45, "rgba(6,8,12,0.22)");
    shade.addColorStop(1, "rgba(2,3,6,0.68)");
  }
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Letterbox
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, VIEW_W, 56);
  ctx.fillRect(0, VIEW_H - 118, VIEW_W, 118);

  ctx.globalAlpha = sectionAlpha;
  ctx.strokeStyle = "rgba(216,183,105,0.5)";
  ctx.lineWidth = 1;
  drawOrnamentalLine(ctx, VIEW_W / 2, VIEW_H - 108, 420);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f2e8d5";
  ctx.font = "600 17px system-ui, sans-serif";
  drawWrappedText(ctx, section.text, VIEW_W / 2, VIEW_H - 88, 720, 24);

  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(216,200,160,0.7)";
  ctx.font = "12px 'Courier New', monospace";
  ctx.fillText(
    "E / Enter / Space — оршилыг бүтнээр алгасах",
    VIEW_W / 2,
    VIEW_H - 42,
  );

  const markerWidth = 28;
  const markerGap = 8;
  const markerStart =
    VIEW_W / 2 -
    (OPENING_STORY_SECTIONS.length * markerWidth +
      (OPENING_STORY_SECTIONS.length - 1) * markerGap) /
      2;
  OPENING_STORY_SECTIONS.forEach((_, index) => {
    ctx.fillStyle =
      index === sectionIndex
        ? "rgba(232,197,106,0.85)"
        : "rgba(232,197,106,0.22)";
    ctx.fillRect(
      markerStart + index * (markerWidth + markerGap),
      VIEW_H - 14,
      markerWidth,
      2,
    );
  });
  ctx.restore();
}

export function drawMainObjectivePanel(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const objective = state.story.activeMainObjective;
  if (
    !objective ||
    state.phase === "intro" ||
    state.story.hearthCompletionEffectRemaining > 0 ||
    state.story.livestockCompletionEffectRemaining > 0 ||
    (state.story.nightCompletionEffectRemaining > 0 &&
      objective !== "talkToOldMan") ||
    state.story.familyReunionEffectRemaining > 0 ||
    state.story.firstNightStage === "sunset" ||
    state.story.firstNightStage === "nightNarration" ||
    state.story.firstNightStage === "wolfWarning"
  ) {
    return;
  }

  const w = 282;
  const h =
    objective === "restoreHearth" || objective === "findScatteredLivestock"
      ? 158
      : objective === "defeatSpiritGuards" || objective === "growFlock"
        ? 134
        : 112;
  // Баруун доод буланд тулгана
  const x = VIEW_W - w - 12;
  const y = VIEW_H - h - 12;

  ctx.save();
  drawFrostedGlassPanel(ctx, x, y, w, h, 10);

  ctx.strokeStyle = "rgba(232,197,106,0.4)";
  drawOrnamentalLine(ctx, x + w / 2, y + 15, 112);

  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "bold 10px 'Courier New', monospace";
  ctx.fillText("ОДООГИЙН ЗОРИЛГО", x + 14, y + 32);

  const quest =
    objective === "restoreHearth"
      ? HEARTH_QUEST
      : objective === "findScatteredLivestock"
        ? SCATTERED_LIVESTOCK_QUEST
        : objective === "protectFlock"
          ? PROTECT_FLOCK_QUEST
          : objective === "observeWolfMovement"
            ? OBSERVE_WOLF_QUEST
            : objective === "parryStoryWolf"
              ? PARRY_STORY_WOLF_QUEST
              : objective === "counterStoryWolf"
                ? COUNTER_STORY_WOLF_QUEST
              : objective === "talkToOldMan"
                ? TALK_TO_OLD_MAN_QUEST
                : objective === "visitOldManAtDawn"
                  ? VISIT_OLD_MAN_AT_DAWN_QUEST
                  : objective === "inspectStormTrace"
                    ? INSPECT_STORM_TRACE_QUEST
                    : objective === "returnToOldManWithTrace"
                      ? RETURN_TRACE_TO_OLD_MAN_QUEST
                      : objective === "talkAfterSpiritScout"
                        ? TALK_AFTER_SPIRIT_SCOUT_QUEST
                        : objective === "buildSpiritOvoo"
                          ? BUILD_SPIRIT_OVOO_QUEST
                          : objective === "enterSpiritViaOvoo"
                            ? ENTER_SPIRIT_VIA_OVOO_QUEST
                      : objective === "defeatSpiritGuards"
                        ? DEFEAT_SPIRIT_GUARDS_QUEST
                        : objective === "reachCursedGate"
                          ? REACH_CURSED_GATE_QUEST
                          : objective === "defeatShulmasBaatar"
                            ? DEFEAT_SHULMAS_BAATAR_QUEST
                            : objective === "claimSkySword"
                              ? CLAIM_SKY_SWORD_QUEST
                              : objective === "openBlackIronGate"
                                ? OPEN_BLACK_IRON_GATE_QUEST
                                : objective === "defeatTumurShulmas"
                                  ? DEFEAT_TUMUR_SHULMAS_QUEST
                                  : objective === "growFlock"
                                    ? GROW_FLOCK_QUEST
                                    : RETURN_FROM_SPIRIT_QUEST;
  ctx.fillStyle = COLORS.hudAccent;
  ctx.font = "600 15px system-ui, sans-serif";
  ctx.fillText(quest.title, x + 14, y + 54);

  if (objective === "restoreHearth") {
    const wood = Math.min(
      CAMPFIRE_WOOD_COST,
      state.story.hearthWoodCollected,
    );
    const woodDone = wood >= CAMPFIRE_WOOD_COST;
    const fireDone = state.story.campfireRelit;

    ctx.fillStyle = "#d8c898";
    ctx.font = "12px system-ui, sans-serif";
    // Бүтнээр орчуулаад дараа нь мөрлөнө — таслаад хайвал орчуулга олдохгүй
    const desc = tr(quest.description);
    const sentenceBreak = desc.indexOf(". ");
    const lines =
      sentenceBreak >= 0
        ? [desc.slice(0, sentenceBreak + 1), desc.slice(sentenceBreak + 2)]
        : [desc];
    lines.forEach((line, index) => {
      ctx.fillText(line, x + 14, y + 76 + index * 16);
    });

    ctx.font = "13px 'Courier New', monospace";
    ctx.fillStyle = woodDone ? "#8fd48f" : COLORS.hudText;
    ctx.fillText(
      trFormat("Түлээ: {have} / {need}", {
        have: wood,
        need: CAMPFIRE_WOOD_COST,
      }),
      x + 16,
      y + 119,
    );
    ctx.fillStyle = fireDone ? "#8fd48f" : COLORS.hudText;
    ctx.fillText(
      trFormat("Зууханд гал: {have} / 1", { have: fireDone ? 1 : 0 }),
      x + 16,
      y + 141,
    );
  } else if (objective === "findScatteredLivestock") {
    const total = state.story.openingLivestockTotal;
    const found = Math.min(total, state.story.livestockFoundIds.length);
    const returned = Math.min(total, state.story.livestockReturnedIds.length);
    const foundDone = total > 0 && found >= total;
    const returnedDone = total > 0 && returned >= total;

    ctx.fillStyle = "#d8c898";
    ctx.font = "12px system-ui, sans-serif";
    SCATTERED_LIVESTOCK_QUEST.panelLines.forEach((line, index) => {
      ctx.fillText(line, x + 14, y + 76 + index * 16);
    });

    ctx.font = "13px 'Courier New', monospace";
    ctx.fillStyle = foundDone ? "#8fd48f" : COLORS.hudText;
    ctx.fillText(
      trFormat("Олсон мал: {have} / {total}", { have: found, total }),
      x + 16,
      y + 119,
    );
    ctx.fillStyle = returnedDone ? "#8fd48f" : COLORS.hudText;
    ctx.fillText(
      trFormat("Хотонд орсон мал: {have} / {total}", { have: returned, total }),
      x + 16,
      y + 141,
    );
  } else {
    ctx.fillStyle = "#d8c898";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "left";
    const lines =
      objective === "protectFlock"
        ? PROTECT_FLOCK_QUEST.panelLines
        : objective === "observeWolfMovement"
          ? OBSERVE_WOLF_QUEST.panelLines
          : objective === "parryStoryWolf"
            ? PARRY_STORY_WOLF_QUEST.panelLines
            : objective === "counterStoryWolf"
              ? COUNTER_STORY_WOLF_QUEST.panelLines
              : objective === "talkToOldMan"
                ? TALK_TO_OLD_MAN_QUEST.panelLines
                : objective === "visitOldManAtDawn"
                  ? VISIT_OLD_MAN_AT_DAWN_QUEST.panelLines
                  : objective === "inspectStormTrace"
                    ? INSPECT_STORM_TRACE_QUEST.panelLines
                    : objective === "returnToOldManWithTrace"
                      ? RETURN_TRACE_TO_OLD_MAN_QUEST.panelLines
                      : objective === "talkAfterSpiritScout"
                        ? TALK_AFTER_SPIRIT_SCOUT_QUEST.panelLines
                        : objective === "buildSpiritOvoo"
                          ? BUILD_SPIRIT_OVOO_QUEST.panelLines
                          : objective === "enterSpiritViaOvoo"
                            ? ENTER_SPIRIT_VIA_OVOO_QUEST.panelLines
                      : objective === "defeatSpiritGuards"
                        ? DEFEAT_SPIRIT_GUARDS_QUEST.panelLines
                        : objective === "reachCursedGate"
                          ? REACH_CURSED_GATE_QUEST.panelLines
                          : objective === "defeatShulmasBaatar"
                            ? DEFEAT_SHULMAS_BAATAR_QUEST.panelLines
                            : objective === "claimSkySword"
                              ? CLAIM_SKY_SWORD_QUEST.panelLines
                              : objective === "openBlackIronGate"
                                ? OPEN_BLACK_IRON_GATE_QUEST.panelLines
                                : objective === "defeatTumurShulmas"
                                  ? DEFEAT_TUMUR_SHULMAS_QUEST.panelLines
                                  : objective === "growFlock"
                                    ? GROW_FLOCK_QUEST.panelLines
                                    : RETURN_FROM_SPIRIT_QUEST.panelLines;
    lines.forEach((line, index) => {
      ctx.fillText(line, x + 14, y + 76 + index * 16);
    });
    if (objective === "defeatSpiritGuards") {
      const route = state.world.firstRoute;
      ctx.font = "13px 'Courier New', monospace";
      ctx.fillStyle = route.defeated >= route.total ? "#8fd48f" : COLORS.hudText;
      ctx.fillText(
        trFormat("Сахиул: {have} / {total}", {
          have: Math.min(route.defeated, route.total),
          total: route.total,
        }),
        x + 16,
        y + 119,
      );
    }
    if (objective === "growFlock") {
      const current = Math.min(1000, state.world.flock.total);
      ctx.font = "13px 'Courier New', monospace";
      ctx.fillStyle = current >= 1000 ? "#8fd48f" : COLORS.hudText;
      ctx.fillText(
        trFormat("Сүрэг: {have} / 1000", { have: current }),
        x + 16,
        y + 119,
      );
    }
  }
  ctx.restore();
}

export function drawHearthCompletionEffect(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
): void {
  const remaining = state.story.hearthCompletionEffectRemaining;
  if (
    (state.phase !== "playing" && state.phase !== "ger") ||
    remaining <= 0 ||
    !state.story.hearthCompletionEffectShown
  ) {
    return;
  }

  const elapsed = HEARTH_COMPLETION_EFFECT_DURATION - remaining;
  const alpha = clamp(
    Math.min(elapsed / 0.32, remaining / 0.55, 1),
    0,
    1,
  );
  // Гэрт — дэлгэцийн төв (зуух); гадаа — галын байрлал
  const fireX =
    state.phase === "ger"
      ? VIEW_W / 2
      : clamp(state.world.campfire.pos.x - camera.x, 70, VIEW_W - 70);
  const fireY =
    state.phase === "ger"
      ? VIEW_H * 0.42
      : clamp(state.world.campfire.pos.y - camera.y, 70, VIEW_H - 70);

  ctx.save();
  const edge = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.2,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_W * 0.68,
  );
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(0.62, `rgba(5,3,2,${0.18 * alpha})`);
  edge.addColorStop(1, `rgba(2,1,1,${0.78 * alpha})`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const glow = ctx.createRadialGradient(fireX, fireY, 8, fireX, fireY, 260);
  glow.addColorStop(0, `rgba(255,214,120,${0.34 * alpha})`);
  glow.addColorStop(0.28, `rgba(255,145,55,${0.22 * alpha})`);
  glow.addColorStop(1, "rgba(255,110,30,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(232,197,106,0.92)";
  ctx.lineWidth = 1.4;
  drawOrnamentalLine(ctx, VIEW_W / 2, 210, 560);
  drawOrnamentalLine(ctx, VIEW_W / 2, 328, 560);

  ctx.textAlign = "center";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(20,10,4,0.78)";
  ctx.font = "700 43px system-ui, sans-serif";
  ctx.strokeText("ГАЛ АСЛАА", VIEW_W / 2, 266);
  ctx.fillStyle = "#ffe5a0";
  ctx.fillText("ГАЛ АСЛАА", VIEW_W / 2, 266);

  ctx.font = "15px system-ui, sans-serif";
  ctx.lineWidth = 3;
  ctx.strokeText(
    "Түлээ цогшиж, гал аслаа.",
    VIEW_W / 2,
    299,
  );
  ctx.fillStyle = "#f2e8d5";
  ctx.fillText(
    "Түлээ цогшиж, гал аслаа.",
    VIEW_W / 2,
    299,
  );
  ctx.restore();
}

export function drawLivestockCompletionEffect(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
): void {
  const remaining = state.story.livestockCompletionEffectRemaining;
  if (
    state.phase !== "playing" ||
    remaining <= 0 ||
    !state.story.livestockCompletionEffectShown
  ) {
    return;
  }

  const elapsed = LIVESTOCK_COMPLETION_EFFECT_DURATION - remaining;
  const alpha = clamp(
    Math.min(elapsed / 0.32, remaining / 0.55, 1),
    0,
    1,
  );
  const pen = penCenter(state.world);
  const penX = clamp(pen.x - camera.x, 70, VIEW_W - 70);
  const penY = clamp(pen.y - camera.y, 70, VIEW_H - 70);

  ctx.save();
  const edge = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.2,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_W * 0.68,
  );
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(0.62, `rgba(5,3,2,${0.18 * alpha})`);
  edge.addColorStop(1, `rgba(2,1,1,${0.78 * alpha})`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const dust = ctx.createRadialGradient(penX, penY, 12, penX, penY, 250);
  dust.addColorStop(0, `rgba(226,190,125,${0.28 * alpha})`);
  dust.addColorStop(0.34, `rgba(176,132,82,${0.18 * alpha})`);
  dust.addColorStop(1, "rgba(130,95,62,0)");
  ctx.fillStyle = dust;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(232,197,106,0.92)";
  ctx.lineWidth = 1.4;
  drawOrnamentalLine(ctx, VIEW_W / 2, 210, 560);
  drawOrnamentalLine(ctx, VIEW_W / 2, 328, 560);

  ctx.textAlign = "center";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(20,10,4,0.78)";
  ctx.font = "700 43px system-ui, sans-serif";
  ctx.strokeText("МАЛ БҮРДЭВ", VIEW_W / 2, 266);
  ctx.fillStyle = "#ffe5a0";
  ctx.fillText("МАЛ БҮРДЭВ", VIEW_W / 2, 266);

  ctx.font = "15px system-ui, sans-serif";
  ctx.lineWidth = 3;
  ctx.strokeText(
    "Тарсан мал хашаандаа орж, хотон бүрдэв.",
    VIEW_W / 2,
    299,
  );
  ctx.fillStyle = "#f2e8d5";
  ctx.fillText(
    "Тарсан мал хашаандаа орж, хотон бүрдэв.",
    VIEW_W / 2,
    299,
  );
  ctx.restore();
}

export function drawNightCompletionEffect(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
): void {
  const remaining = state.story.nightCompletionEffectRemaining;
  if (
    state.phase !== "playing" ||
    remaining <= 0 ||
    !state.story.nightCompletionEffectShown
  ) {
    return;
  }

  const elapsed = NIGHT_COMPLETION_EFFECT_DURATION - remaining;
  const alpha = clamp(
    Math.min(elapsed / 0.32, remaining / 0.55, 1),
    0,
    1,
  );
  const wolf = getStoryWolf(state);
  const focusX = clamp(
    (wolf?.pos.x ?? state.player.pos.x) - camera.x,
    70,
    VIEW_W - 70,
  );
  const focusY = clamp(
    (wolf?.pos.y ?? state.player.pos.y) - camera.y,
    70,
    VIEW_H - 70,
  );

  ctx.save();
  const edge = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.18,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_W * 0.7,
  );
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(0.58, `rgba(4,7,10,${0.2 * alpha})`);
  edge.addColorStop(1, `rgba(1,3,6,${0.82 * alpha})`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const calm = ctx.createRadialGradient(
    focusX,
    focusY,
    10,
    focusX,
    focusY,
    245,
  );
  calm.addColorStop(0, `rgba(208,231,239,${0.25 * alpha})`);
  calm.addColorStop(0.34, `rgba(119,154,171,${0.14 * alpha})`);
  calm.addColorStop(1, "rgba(70,105,125,0)");
  ctx.fillStyle = calm;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(218,198,135,0.9)";
  ctx.lineWidth = 1.4;
  drawOrnamentalLine(ctx, VIEW_W / 2, 210, 560);
  drawOrnamentalLine(ctx, VIEW_W / 2, 328, 560);

  ctx.textAlign = "center";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(8,12,18,0.82)";
  ctx.font = "700 43px system-ui, sans-serif";
  ctx.strokeText("ШӨНИЙГ ДАВЛАА", VIEW_W / 2, 266);
  ctx.fillStyle = "#f1dda3";
  ctx.fillText("ШӨНИЙГ ДАВЛАА", VIEW_W / 2, 266);

  ctx.font = "15px system-ui, sans-serif";
  ctx.lineWidth = 3;
  ctx.strokeText(
    "Айдас арилаагүй ч хүү түүнд захирагдсангүй.",
    VIEW_W / 2,
    299,
  );
  ctx.fillStyle = "#e8edf0";
  ctx.fillText(
    "Айдас арилаагүй ч хүү түүнд захирагдсангүй.",
    VIEW_W / 2,
    299,
  );
  ctx.restore();
}

export function drawFamilyReunionEffect(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
): void {
  const remaining = state.story.familyReunionEffectRemaining;
  if (
    state.phase !== "playing" ||
    remaining <= 0 ||
    !state.story.familyReunionEffectShown
  ) {
    return;
  }

  const elapsed = FAMILY_REUNION_EFFECT_DURATION - remaining;
  const alpha = clamp(
    Math.min(elapsed / 0.38, remaining / 0.62, 1),
    0,
    1,
  );
  const campX = clamp(state.world.campPos.x - camera.x, 80, VIEW_W - 80);
  const campY = clamp(state.world.campPos.y - camera.y, 80, VIEW_H - 80);

  ctx.save();
  const edge = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.18,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_W * 0.7,
  );
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(0.6, `rgba(13,8,4,${0.18 * alpha})`);
  edge.addColorStop(1, `rgba(3,2,1,${0.8 * alpha})`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const glow = ctx.createRadialGradient(campX, campY, 12, campX, campY, 300);
  glow.addColorStop(0, `rgba(255,224,150,${0.34 * alpha})`);
  glow.addColorStop(0.32, `rgba(225,150,72,${0.19 * alpha})`);
  glow.addColorStop(1, "rgba(170,95,40,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(232,197,106,0.94)";
  ctx.lineWidth = 1.5;
  drawOrnamentalLine(ctx, VIEW_W / 2, 203, 620);
  drawOrnamentalLine(ctx, VIEW_W / 2, 334, 620);

  ctx.textAlign = "center";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(24,12,5,0.82)";
  ctx.font = "700 38px system-ui, sans-serif";
  ctx.strokeText("ГЭР БҮЛ ЭРГЭН НЭГДЭВ", VIEW_W / 2, 260);
  ctx.fillStyle = "#ffe5a0";
  ctx.fillText("ГЭР БҮЛ ЭРГЭН НЭГДЭВ", VIEW_W / 2, 260);

  ctx.font = "15px system-ui, sans-serif";
  ctx.lineWidth = 3;
  ctx.strokeText(
    "Хар хүлээс тасарч, голомтын бараа дахин бүтэн болов.",
    VIEW_W / 2,
    298,
  );
  ctx.fillStyle = "#f3ead8";
  ctx.fillText(
    "Хар хүлээс тасарч, голомтын бараа дахин бүтэн болов.",
    VIEW_W / 2,
    298,
  );
  ctx.restore();
}
