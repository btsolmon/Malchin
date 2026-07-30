// Хүн 1 (дундын суурь) — бүх төрөл, интерфэйс, тогтмолууд

export type WeatherKind = "clear" | "wind" | "storm" | "snow";
export type Season = "summer" | "autumn" | "winter" | "spring";
export type DayPhase = "dawn" | "day" | "evening" | "night";
export type GamePhase =
  | "menu"
  | "playing"
  | "paused"
  | "lost"
  | "levelup"
  | "ger";

/** Дэлгүүрээс авч болох эд зүйлс */
export type GearId = "dog" | "horse" | "bow" | "gun" | "axe" | "urga";

/** 5 хошуу мал */
export type LivestockKind = "sheep" | "goat" | "cattle" | "horse" | "camel";

export const LIVESTOCK_KINDS: LivestockKind[] = [
  "sheep",
  "goat",
  "cattle",
  "horse",
  "camel",
];

export const LIVESTOCK_MN: Record<LivestockKind, string> = {
  sheep: "хонь",
  goat: "ямаа",
  cattle: "үхэр",
  horse: "морь",
  camel: "тэмээ",
};

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vitals {
  health: number;
  maxHealth: number;
  warmth: number;
  maxWarmth: number;
  hunger: number;
  maxHunger: number;
}

export interface Inventory {
  wood: number;
  berries: number;
  /** Тэжээгчид хийх хадгалсан өвс */
  hay: number;
  /** Хонь / тэмээний ноос (хоньны ноос зөвхөн зун) */
  wool: number;
  /** Ямааны ноолуур (зөвхөн хавар) */
  cashmere: number;
  /** Сүү (ямаа, үхэр, гүү, тэмээ) */
  milk: number;
  /** Боловсруулсан эсгий */
  felt: number;
  /** Ааруул */
  aaruul: number;
}

export interface Player {
  pos: Vector2;
  speed: number;
  radius: number;
  vitals: Vitals;
  inventory: Inventory;
  chopCooldown: number;
  attackCooldown: number;
  eatCooldown: number;
  /** Цохилтын арк-ийн үлдсэн хугацаа */
  attackAnim: number;
  /** true = J таяг цохилт (буу/нумтай байсан ч таяг зурна) */
  attackMelee: boolean;
  /** Цохилт авсны дараах хамгаалалт */
  invuln: number;
  /** Ур чадварын үржүүлэгчид */
  damageMult: number;
  reachMult: number;
  cooldownMult: number;
  warmthResist: number;
  /** Дэлгүүрээс авсан эд зүйлс */
  gear: Record<GearId, boolean>;
  /** Морины амь — морь цохилтын дийлэнхийг өөр дээрээ авна */
  horseHp: number;
  horseMaxHp: number;
  /** Дахин унтаж болох хүртэлх хугацаа */
  sleepCooldown: number;
  moving: boolean;
  facing: Vector2;
}

export interface Tree {
  id: number;
  pos: Vector2;
  hp: number;
  maxHp: number;
  radius: number;
  respawnIn: number;
}

export interface BerryBush {
  id: number;
  pos: Vector2;
  berries: number;
  maxBerries: number;
  radius: number;
  respawnIn: number;
}

export interface Campfire {
  pos: Vector2;
  lit: boolean;
  fuel: number;
  radius: number;
}

/** Хашааны шат: 1 модон · 2 өргөстэй · 3 цахилгаан/чулуун */
export type FenceTier = 1 | 2 | 3;

/** Модон хашааны нэг хэсэг — чоно/баавгай/хулгайчийг хаана */
export interface Fence {
  id: number;
  pos: Vector2;
  radius: number;
  /** 0 = зүүн–баруун төмөр, 1 = хойд–өмнөд төмөр */
  orient: 0 | 1;
  /** 1 анхан · 2 дунд · 3 дээд */
  tier: FenceTier;
  hp: number;
  maxHp: number;
  /** Хашаа хаагдах сүүлийн хэсэг — хаалга */
  isGate: boolean;
  /** 0 = хаалттай · 1 = бүрэн нээлттэй */
  gateOpen: number;
  /** Нээлттэй үед авто-хаагдах хүртэлх үлдсэн хугацаа (сек) */
  gateCloseIn: number;
}

export interface HerdAnimal {
  id: number;
  kind: LivestockKind;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  /** Бэлчих/толгой гудайх фаза */
  grazeSeed: number;
  /** Чонын хазалт даах амь (3 хазалт) */
  hp: number;
  /** Хазуулсны дараах анивчилт */
  flash: number;
  /** Тогтвортой харах чиг */
  face: 1 | -1;
  /** Бүтээгдэхүүн бэлэн болох хүртэлх секунд */
  produceIn: number;
  /** E-ээр цуглуулах бэлэн */
  produceReady: boolean;
  /** Хаврын төллөлт — дулаан хэрэгтэй */
  newborn: boolean;
  /** 0–100, шөнө гадаа бол буурна */
  newbornWarmth: number;
}

/** Хуучин нэр — нийцүүлэлт */
export type Sheep = HerdAnimal;

export interface Flock {
  counts: Record<LivestockKind, number>;
  total: number;
  visuals: HerdAnimal[];
  /** 0 = өлсгөлөн · 100 = цатгалан (өвөл өвсгүй бол буурна) */
  hunger: number;
  /** Өлсгөлөнгөөр мал алдах хуримтлуулагч */
  starveAcc: number;
}

/** Бэлчээрийн дэргэдэх өвсний тэжээгч */
export interface Feeder {
  pos: Vector2;
  hay: number;
  maxHay: number;
  radius: number;
}

/** Зэрлэг морь — уургаар барина */
export interface WildHorse {
  id: number;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  face: 1 | -1;
  spooked: number;
}

export interface Wolf {
  id: number;
  /** Чоно эсвэл баавгай — баавгай 2 дахин их амь, хүчтэй */
  kind: "wolf" | "bear";
  pos: Vector2;
  vel: Vector2;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  attackCooldown: number;
  /** Тоглогчид өгөх хохирол (түвшингээр өснө) */
  damage: number;
  /** Биеийн хэмжээ (түвшингээр томорно) */
  scale: number;
  /** Цохиулсны дараах цагаан анивчилт */
  flash: number;
  /** Тогтвортой харах чиг */
  face: 1 | -1;
  alive: boolean;
}

export interface Thief {
  id: number;
  pos: Vector2;
  vel: Vector2;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  stolen: number;
  escapeTarget: Vector2;
  /** Тоглогчид өгөх хохирол */
  damage: number;
  /** Зөрүүлж цохих cooldown */
  attackCooldown: number;
  flash: number;
  /** Тогтвортой харах чиг */
  face: 1 | -1;
  alive: boolean;
}

/** Хоньчин нохой — чоно руу өөрөө дайрдаг, амьтай */
export interface Dog {
  pos: Vector2;
  vel: Vector2;
  face: 1 | -1;
  attackCooldown: number;
  hp: number;
  maxHp: number;
  /** Хазуулсны дараах анивчилт */
  flash: number;
}

/** Нум сум, бууны сум */
export interface Projectile {
  pos: Vector2;
  vel: Vector2;
  dmg: number;
  life: number;
  kind: "arrow" | "bullet";
}

export interface World {
  width: number;
  height: number;
  trees: Tree[];
  bushes: BerryBush[];
  campfire: Campfire;
  fences: Fence[];
  flock: Flock;
  wolves: Wolf[];
  thieves: Thief[];
  dog: Dog | null;
  projectiles: Projectile[];
  season: Season;
  weather: WeatherKind;
  timeOfDay: number;
  dayNumber: number;
  elapsed: number;
  /** Үүр / өдөр / орой / шөнө */
  dayPhase: DayPhase;
  /** Мал бэлчээрт гарсан эсэх */
  flockOut: boolean;
  /** Шөнийн гадаа эрсдэлийн хуримтлуулагч */
  outdoorRiskAcc: number;
  nextWolfIn: number;
  nextThiefIn: number;
  nextWildHorseIn: number;
  /** Одоогийн бууц/гэрийн төв */
  campPos: Vector2;
  /** true = гэр хураасан, нүүж байна */
  gerPacked: boolean;
  /** Бэлчээрийн өвс — мал идэж дуусгана; улирал солигдоход дахин ургана */
  pastureGrass: number;
  /** Өвс хамгийн сүүлд ургасан улирал */
  pastureSeason: Season | null;
  feeder: Feeder;
  wildHorses: WildHorse[];
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
  attack: boolean;
  /** K — буу / нум харвах */
  shoot: boolean;
  lightFire: boolean;
  /** B — хашаа барих / шинэчлэх */
  buildFence: boolean;
  eat: boolean;
  /** Debug — / дарж XP нэмэх */
  debugXp: boolean;
  /** Debug — . дарж мод хязгааргүй болгох */
  debugWood: boolean;
  /** N барих — хонь туух */
  herd: boolean;
  /** G — гэр хураах / буулгах (нүүдэл) */
  migrate: boolean;
  skill1: boolean;
  skill2: boolean;
  skill3: boolean;
  skill4: boolean;
  /** Enter/Space — меню дэх сонголт */
  confirm: boolean;
  /** P — түр зогсоох */
  pause: boolean;
  /** Меню доторх нэг удаагийн шилжилтүүд */
  menuUp: boolean;
  menuDown: boolean;
  menuLeft: boolean;
  menuRight: boolean;
  /** Хулгана (canvas координатаар) */
  mouseX: number;
  mouseY: number;
  mouseMoved: boolean;
  mouseClicked: boolean;
}

export interface Particle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export interface FloatingText {
  pos: Vector2;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

export interface Effects {
  particles: Particle[];
  texts: FloatingText[];
  /** Дэлгэцийн доргилтын хүч */
  shake: number;
  /** Цохиулах үеийн улаан ирмэг */
  hurtFlash: number;
  /** Галын оч гаргах хуримтлуулагч */
  emberAcc: number;
  dustAcc: number;
}

export interface Skill {
  id: string;
  name: string;
  desc: string;
  apply: (state: GameState) => void;
}

export type MenuScreen = "main" | "settings" | "controls" | "credits";

export interface GameState {
  player: Player;
  world: World;
  input: InputState;
  fx: Effects;
  message: string;
  messageTimer: number;
  score: number;
  xp: number;
  level: number;
  xpNext: number;
  skillChoices: Skill[];
  phase: GamePhase;
  menuScreen: MenuScreen;
  menuIndex: number;
  pauseIndex: number;
  /** Гэр доторх дэлгүүр нээлттэй эсэх */
  shopOpen: boolean;
  /** Гэр доторх урлал (тахилын ширээ) нээлттэй эсэх */
  craftOpen: boolean;
  /** Гэр доторх малчны байрлал (дэлгэцийн координат) */
  gerPlayer: Vector2;
  /** Орон дээр унтаж байгаа үлдсэн хугацаа (сек). 0 = унтаагүй */
  gerSleepTimer: number;
  /** Аль орон дээр унтаж байгаа */
  gerSleepBed: "L" | "R" | null;
  /** Пауз менюгээс үндсэн цэс рүү буцах */
  requestRestart: boolean;
  /** B эхний даралт — хашааны цагаан preview идэвхтэй */
  fencePreview: boolean;
  /** . cheat — мод/түлээ хязгааргүй, зарцуулалт хасагдахгүй */
  unlimitedWood: boolean;
  nextEntityId: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const VIEW_W = 960;
export const VIEW_H = 540;
export const WORLD_W = 2400;
export const WORLD_H = 1600;
export const START_SHEEP = 2;
export const START_GOATS = 2;
export const MAX_VISUAL_SHEEP = 36;
export const MAX_FEEDER_HAY = 80;
/** Малын бүтээгдэхүүн гарах хугацаа (сек) */
export const PRODUCE_INTERVAL: Record<LivestockKind, number> = {
  sheep: 48,
  goat: 42,
  cattle: 36,
  horse: 55,
  camel: 60,
};
export const PASTURE_RADIUS = 160;
/** Хашааны мөргөлдөөний радиус */
export const FENCE_RADIUS = 14;
/** Анхан шатны хашаа барихад зарцуулах мод */
export const FENCE_COST = 3;
/** Байрлуулах торны хэмжээ */
export const FENCE_GRID = 28;
export const FENCE_TIER_NAMES: Record<FenceTier, string> = {
  1: "Модон хашаа",
  2: "Өргөстэй тор",
  3: "Цахилгаан хашаа",
};

export const FENCE_TIER_SHORT: Record<FenceTier, string> = {
  1: "Анхан",
  2: "Дунд",
  3: "Дээд",
};

/** Шат бүрийн дээд HP */
export const FENCE_MAX_HP_BY_TIER: Record<FenceTier, number> = {
  1: 40,
  2: 120,
  3: 320,
};

/** 1→2, 2→3 шинэчлэх зардал */
export const FENCE_UPGRADE_COST: Record<
  1 | 2,
  { wood: number; score: number; berries: number; minLevel: number }
> = {
  1: { wood: 5, score: 40, berries: 0, minLevel: 1 },
  2: { wood: 8, score: 120, berries: 3, minLevel: 3 },
};

/** Дайсан хашаанд өгөх хохирол/сек — T3 хулгайч/баавгайг найдвартай зогсооно */
export const FENCE_BREAK_DPS: Record<
  FenceTier,
  Record<"wolf" | "bear" | "thief", number>
> = {
  1: { wolf: 12, bear: 20, thief: 9 },
  2: { wolf: 2.2, bear: 4.5, thief: 2.5 },
  3: { wolf: 0.3, bear: 0, thief: 0 },
};

/** Хашаа дайсанд өгөх хохирол/сек (өргөс / цахилгаан) */
export const FENCE_CONTACT_DPS: Record<FenceTier, number> = {
  1: 0,
  2: 6,
  3: 16,
};

/** Мөргөлдөхөд дайсныг түлхэх хүч */
export const FENCE_KNOCKBACK: Record<FenceTier, number> = {
  1: 0,
  2: 14,
  3: 28,
};

/** Хаалга нээгдэх/хаагдах хугацаа (сек) */
export const GATE_ANIM_SEC = 0.4;
/** Биеэр түлхэж нээсний дараа авто-хаагдах хүлээлт (сек) */
export const GATE_CLOSE_DELAY = 2;
/** Энэ хэмжээнээс дээш нээлттэй бол нэвтрэх боломжтой */
export const GATE_PASS_OPEN = 0.55;
/** Нэг улирал хэдэн өдөр үргэлжлэх */
export const SEASON_DAYS = 6;

export const SEASON_ORDER: Season[] = ["autumn", "winter", "spring", "summer"];

/** Хадгалж болох өвсний дээд хэмжээ */
export const MAX_HAY = 150;
/** Бэлчээрийн өвсний нөөц (мал идэж, хадахад зарцуулагдана) */
export const MAX_PASTURE_GRASS = 100;
/** Нэг хадалтад зарцуулах бэлчээрийн өвс */
export const HAY_GRASS_COST = 6;
/** Нэг хонинд өдөрт хэрэгтэй өвс (өвөл тэжээгч) */
export const HAY_PER_SHEEP_PER_DAY = 0.18;
/** Бэлчээрт 1 мал 1 өдөрт идэх өвс */
export const GRAZE_PER_ANIMAL_PER_DAY = 0.85;
/** Тоглоомын нэг өдрийн бодит хугацаа (сек) — 24 сек = 1 өдөр */
export const DAY_LENGTH_SEC = 24;
/** Бэлчээрээс өвс хадах зай (гэрийн гадна) */
export const HAY_HARVEST_RADIUS = PASTURE_RADIUS + 28;

export const COLORS = {
  hudText: "#f2e8d5",
  hudAccent: "#e8c56a",
  hudMuted: "#a89880",
  health: "#d64545",
  hunger: "#c4a035",
  warmth: "#ff9f5a",
  flockBar: "#d4c4a0",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export interface Camera {
  x: number;
  y: number;
}
