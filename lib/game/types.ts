// Хүн 1 (дундын суурь) — бүх төрөл, интерфэйс, тогтмолууд

export type WeatherKind = "clear" | "wind" | "storm" | "snow";
export type Season = "summer" | "autumn" | "winter" | "spring";
export type DayPhase = "dawn" | "day" | "evening" | "night";
export type GamePhase =
  | "menu"
  | "intro"
  | "playing"
  | "paused"
  | "won"
  | "lost"
  | "levelup"
  | "ger"
  | "riddle"
  | "elder"
  | "spirit";

/** Дэлгүүрээс авч болох эд зүйлс */
export type GearId =
  | "dog"
  | "horse"
  | "bow"
  | "gun"
  | "axe"
  | "urga"
  | "fishingRod";
export type CombatPhase = "idle" | "startup" | "active" | "recovery";
export type AttackVariant = 0 | 1 | 2;
export type PlayerWeapon = "staff" | "skySword";

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

export const LIVESTOCK_EMOJI: Record<LivestockKind, string> = {
  sheep: "🐑",
  goat: "🐐",
  cattle: "🐄",
  horse: "🐴",
  camel: "🐪",
};

export interface Vector2 {
  x: number;
  y: number;
}

/** Өвгөн — задарсан гэрийн дэргэд завилж сууна */
export interface Elder {
  pos: Vector2;
  /** Задарсан өвөрмөц гэрийн байрлал */
  gerPos: Vector2;
  radius: number;
  /** Нүдний туяа: idle / сүнсний яриа / ховор бараа */
  eyeMode: "idle" | "spirit" | "rare";
  /** Нээлтийн түүхийн үеэр нэг NPC сууж/алхаж/зогсож харагдах төлөв. */
  pose: "seated" | "walking" | "standing";
  face: 1 | -1;
  walkPhase: number;
}

/** Оньсогын асуулттай объектын төрөл */
export type RiddleHostKind = "rock" | "tree" | "bush";

export interface RiddleHostRef {
  kind: RiddleHostKind;
  id: number;
}

/** Том чулуу — зөвхөн оньсогын асуулт */
export interface WorldRock {
  id: number;
  pos: Vector2;
  radius: number;
  /** Зөв хариулсны дараа true — дахин асуухгүй */
  riddleSolved: boolean;
  /** Анх нээхэд оноогдсон оньсогын id (буруу хариулбал ижил хэвээр) */
  riddleId: string | null;
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
  /** Тэвшид хийх хадгалсан өвс */
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
  /** Голоос барьсан загас */
  fish: number;
}

export interface Player {
  /** Шинэ тулааны 3 цохилтын ээлж. */
  attackVariant: AttackVariant;
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
  /** true = J цохилт (буу/нумтай байсан ч цохилт зурна) */
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
  /** Унах морь дээр сууж байгаа эсэх (gear.horse = эзэмшил) */
  riding: boolean;
  /** Дахин унтаж болох хүртэлх хугацаа */
  sleepCooldown: number;
  moving: boolean;
  facing: Vector2;
  /** Тулааны тамир */
  stamina: number;
  maxStamina: number;
  staminaRegenDelay: number;
  /** ZIP тулааны модульд ашиглагдах фаз; хуучин melee фазтай зэрэгцэн хадгална. */
  combatPhase: CombatPhase;
  combatTimer: number;
  attackHitDone: boolean;
  parryArmed: boolean;
  weapon: PlayerWeapon;
  hasSkySword: boolean;
  meleePhase: "idle" | "startup" | "active" | "recovery";
  meleeTimer: number;
  meleeHitDone: boolean;
  attackFacing: Vector2;
  dodgePhase: "idle" | "dodging" | "recovery";
  dodgeTimer: number;
  dodgeDirection: Vector2;
  parryPhase: "idle" | "startup" | "active" | "recovery";
  parryTimer: number;
}

export interface Tree {
  id: number;
  pos: Vector2;
  hp: number;
  maxHp: number;
  radius: number;
  respawnIn: number;
  /** Оньсогын асуулттай мод */
  riddleHost: boolean;
  riddleSolved: boolean;
  riddleId: string | null;
}

export interface BerryBush {
  id: number;
  pos: Vector2;
  berries: number;
  maxBerries: number;
  radius: number;
  respawnIn: number;
  /** Оньсогын асуулттай бут */
  riddleHost: boolean;
  riddleSolved: boolean;
  riddleId: string | null;
}

export interface Campfire {
  pos: Vector2;
  lit: boolean;
  fuel: number;
  radius: number;
  /** Хээр түлсэн эсэх — false бол гал зурагдахгүй */
  placed: boolean;
  /** Гал асааж буй үлдсэн секунд (0 = бүрэн ассан) */
  igniting: number;
}

/** Хашааны шат: 1 модон · 2 өргөстэй · 3 цахилгаан/чулуун */
export type FenceTier = 1 | 2 | 3;

/** Модон хашааны нэг хэсэг — чоно/баавгай/хулгайчийг хаана */
export interface Fence {
  id: number;
  pos: Vector2;
  radius: number;
  /**
   * Сегментийн чиглэл (радиан). 0 = зүүн–баруун төмөр.
   * π/2 = хойд–өмнөд. Бусад өнцөг = налуу тал.
   */
  angle: number;
  /** 0 ≈ хэвтээ, 1 ≈ босоо — depth sort / хурдан ангилал */
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

/** Аав / ээжийн ажил */
export type ParentTask =
  | "idle"
  | "wander"
  | "herd"
  | "fillFeeder"
  | "collect"
  | "craft";

export interface ParentNpc {
  role: "father" | "mother";
  pos: Vector2;
  facing: Vector2;
  /** Зургийн нүүр — анивчихгүй */
  face: 1 | -1;
  moving: boolean;
  task: ParentTask;
  taskTimer: number;
  /** Ажиллаж буй анимейшн */
  workPulse: number;
  targetId: number | null;
  /** Алхах зорилт — нэг удаа сонгогдоно */
  walkTarget: Vector2 | null;
  /** Алхалтын фаза (хөл/гар) */
  walkPhase: number;
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

/** Бэлчээрийн дэргэдэх өвсний тэвш */
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

/** Голын загас — уургаар барина */
export interface Fish {
  id: number;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  face: 1 | -1;
  spook: number;
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
  /** Тулааны posture / фаз */
  posture: number;
  maxPosture: number;
  /** Шинэ enemy AI-ийн posture нөхөгдөх саатал. */
  postureRegenDelay: number;
  postureRecoveryDelay: number;
  attackPhase:
    | "chasing"
    | "windup"
    | "leaping"
    | "grabbing"
    | "recovery"
    | "stunned";
  attackKind: "leap" | "claw" | "bearGrab" | "bearSwipe";
  attackTimer: number;
  combatPhase: "idle" | "windup" | "active" | "recovery" | "staggered";
  combatTimer: number;
  attackDirection: Vector2;
  attackHitDone: boolean;
  knockbackResistance: number;
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
  posture: number;
  maxPosture: number;
  postureRecoveryDelay: number;
  combatPhase: "idle" | "windup" | "active" | "recovery" | "staggered";
  combatTimer: number;
  attackDirection: Vector2;
  attackHitDone: boolean;
  knockbackResistance: number;
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

/** Нум сум, бууны сум, сүнсний сум */
export interface Projectile {
  pos: Vector2;
  vel: Vector2;
  dmg: number;
  life: number;
  kind: "arrow" | "bullet" | "spiritBolt";
}

export type RouteEnemyKind =
  | "talynHaragch"
  | "shulmasynHuu"
  | "shidetHarvaach"
  | "shulmasynZarts"
  | "shulmasynBaatar";

export type RouteEnemyAttackKind =
  | "melee"
  | "rush"
  | "bolt"
  | "bossOverhead"
  | "bossCharge"
  | "bossSweep";

export type RouteEnemyPhase =
  | "idle"
  | "chasing"
  | "windup"
  | "attacking"
  | "recovery"
  | "retreating"
  | "stunned";

export interface RouteEnemy {
  id: number;
  kind: RouteEnemyKind;
  pos: Vector2;
  spawnPos: Vector2;
  vel: Vector2;
  facing: 1 | -1;
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  posture: number;
  maxPosture: number;
  postureRegenDelay: number;
  damage: number;
  aggroRange: number;
  attackRange: number;
  attackCooldown: number;
  phase: RouteEnemyPhase;
  phaseTimer: number;
  attackDirection: Vector2;
  retreatDirection: Vector2;
  attackKind: RouteEnemyAttackKind;
  attackIndex: number;
  attackHitDone: boolean;
  flash: number;
  deathTimer: number;
  alive: boolean;
  engaged: boolean;
}

export interface RouteBolt {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  damage: number;
  life: number;
}

export interface FirstRoute {
  active: boolean;
  complete: boolean;
  introductionShown: boolean;
  gateMessageShown: boolean;
  startX: number;
  gatePos: Vector2;
  gateRadius: number;
  arenaCenter: Vector2;
  arenaRadius: number;
  bossStarted: boolean;
  bossDefeated: boolean;
  swordDrop: {
    pos: Vector2;
    visible: boolean;
    collected: boolean;
  };
  enemies: RouteEnemy[];
  bolts: RouteBolt[];
  defeated: number;
  total: number;
}

export type TumurShulmasPhase =
  | "sealed"
  | "summoning"
  | "idle"
  | "walking"
  | "claw"
  | "needle"
  | "ironBloom"
  | "phaseShift"
  | "stagger"
  | "death";

export interface TumurNeedle {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  damage: number;
  life: number;
}

export interface TumurShulmasEncounter {
  gatePos: Vector2;
  gateRadius: number;
  arenaCenter: Vector2;
  arenaRadius: number;
  exitPos: Vector2;
  unlocked: boolean;
  active: boolean;
  defeated: boolean;
  phase: TumurShulmasPhase;
  phaseTimer: number;
  cycleIndex: number;
  pos: Vector2;
  facing: Vector2;
  attackDirection: Vector2;
  attackHitDone: boolean;
  attackCooldown: number;
  hp: number;
  maxHp: number;
  posture: number;
  maxPosture: number;
  postureRegenDelay: number;
  bossPhase: 1 | 2;
  ward: number;
  maxWard: number;
  phaseShifted: boolean;
  flash: number;
  needles: TumurNeedle[];
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
  /** Оньсогын чулуунууд */
  rocks: WorldRock[];
  /** Өвгөн NPC */
  elder: Elder;
  /** Гэрээс Хар төмөр хаалга хүртэлх замын дайснууд ба mini-boss. */
  firstRoute: FirstRoute;
  /** Тусдаа Төмөр шулмасын boss encounter. */
  tumurShulmas: TumurShulmasEncounter;
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
  /** Голын загас */
  fish: Fish[];
  /** Буусан / гадаа уясан унах морь (riding=false үед) */
  mountHorse: MountHorse | null;
}

/** Тоглогчийн унах морь — буусан эсвэл уясан */
export interface MountHorse {
  pos: Vector2;
  face: 1 | -1;
  /** Гэрийн гадаа уясан */
  tied: boolean;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
  attack: boolean;
  /** J — нэг frame melee */
  attackPressed: boolean;
  /** Шинэ combat модульд зориулсан нэг удаагийн dodge оролт. */
  dodge: boolean;
  /** Shift — булт */
  dodgePressed: boolean;
  /** Шинэ combat модульд зориулсан нэг удаагийн parry оролт. */
  parry: boolean;
  /** L — сөрөх (parry) */
  parryPressed: boolean;
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
  /** Debug — , дарж үхэшгүй болгох */
  debugGod: boolean;
  /** Debug — 5 дарж Төмөр шулмасын boss тулаан эхлүүлэх */
  debugBoss: boolean;
  /** N барих — хонь туух */
  herd: boolean;
  /** G — гэр хураах / буулгах (нүүдэл) */
  migrate: boolean;
  /** H — морь унах / буух / уях */
  horseMount: boolean;
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

export interface SoulEffect {
  pos: Vector2;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  seed: number;
}

export interface CameraShakeState {
  remaining: number;
  duration: number;
  strength: number;
}

export interface ScreenPulseState {
  remaining: number;
  duration: number;
  intensity: number;
  color: string;
}

export interface Effects {
  particles: Particle[];
  texts: FloatingText[];
  souls: SoulEffect[];
  cameraShake: CameraShakeState;
  screenPulse: ScreenPulseState;
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

export type MainObjectiveId =
  | "restoreHearth"
  | "findScatteredLivestock"
  | "protectFlock"
  | "observeWolfMovement"
  | "parryStoryWolf"
  | "counterStoryWolf"
  | "talkToOldMan"
  | "visitOldManAtDawn"
  | "inspectStormTrace"
  | "returnToOldManWithTrace"
  | "defeatSpiritGuards"
  | "reachCursedGate"
  | "defeatShulmasBaatar"
  | "claimSkySword"
  | "openBlackIronGate"
  | "defeatTumurShulmas"
  | "returnFromSpirit"
  | "growFlock";

export interface OpeningLivestockAnchor {
  id: number;
  pos: Vector2;
}

export type FirstNightStage =
  | "pending"
  | "recoveringLivestock"
  | "sunset"
  | "nightNarration"
  | "wolfWarning"
  | "protecting"
  | "elderIntervention"
  | "elderApproach"
  | "elderDialogue"
  | "completed";

export interface StoryState {
  introCompleted: boolean;
  introSection: number;
  introSectionElapsed: number;
  hearthQuestStarted: boolean;
  hearthWoodCollected: number;
  campfireRelit: boolean;
  hearthQuestCompleted: boolean;
  activeMainObjective: MainObjectiveId | null;
  hearthCompletionEffectRemaining: number;
  hearthCompletionEffectShown: boolean;
  livestockQuestStarted: boolean;
  livestockNarrationShown: boolean;
  openingLivestockIds: number[];
  openingLivestockAnchors: OpeningLivestockAnchor[];
  openingLivestockTotal: number;
  livestockFoundIds: number[];
  livestockReturnedIds: number[];
  livestockQuestCompleted: boolean;
  livestockCompletionEffectRemaining: number;
  livestockCompletionEffectShown: boolean;
  firstNightStage: FirstNightStage;
  firstNightStageRemaining: number;
  firstDayTimeAccelerationStarted: boolean;
  firstDayEveningHoldActive: boolean;
  firstNightSunsetStarted: boolean;
  firstNightNormalTimeRestored: boolean;
  firstNightNarrationShown: boolean;
  firstNightWolfWarningShown: boolean;
  wolfThreatQuestStarted: boolean;
  storyWolfId: number | null;
  storyWolfSpawned: boolean;
  storyWolfSceneElapsed: number;
  helplessPhaseElapsed: number;
  storyWolfAttackAttempts: number;
  storyWolfAttackInProgress: boolean;
  temporaryPlayerProtectionActive: boolean;
  temporaryLivestockProtectionActive: boolean;
  oldManArrivalStarted: boolean;
  oldManArrived: boolean;
  oldManArrivalElapsed: number;
  shortDialogueStarted: boolean;
  shortDialogueCompleted: boolean;
  milestone3Completed: boolean;
  milestone4Started: boolean;
  storyWolfRedSignalSeen: boolean;
  storyWolfParryCompleted: boolean;
  storyWolfOpeningActive: boolean;
  storyWolfCounterCompleted: boolean;
  storyWolfDefeated: boolean;
  nightCompletionEffectRemaining: number;
  nightCompletionEffectShown: boolean;
  milestone4Completed: boolean;
  milestone5Started: boolean;
  milestone5DialogueCompleted: boolean;
  milestone6Started: boolean;
  milestone6DialogueCompleted: boolean;
  milestone7Started: boolean;
  stormTracePos: Vector2 | null;
  stormTraceInspected: boolean;
  stormTraceEffectRemaining: number;
  stormTraceDialogueCompleted: boolean;
  spiritPathOpened: boolean;
  milestone7Completed: boolean;
  milestone8Started: boolean;
  familyReunionEffectRemaining: number;
  familyReunionEffectShown: boolean;
  familyReunionDialogueStarted: boolean;
  familyReunionDialogueCompleted: boolean;
  milestone8Completed: boolean;
}

export type MenuScreen = "main" | "settings" | "controls" | "credits";

export interface GameState {
  player: Player;
  world: World;
  story: StoryState;
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
  /** Паузаас буцах фаз (playing / spirit) */
  pauseReturnPhase: GamePhase;
  menuScreen: MenuScreen;
  menuIndex: number;
  pauseIndex: number;
  /** Гэр доторх дэлгүүр нээлттэй эсэх */
  shopOpen: boolean;
  /** Гэр доторх урлал (зүүн авдар / тахил) нээлттэй эсэх */
  craftOpen: boolean;
  /** Гэр доторх малчны байрлал (дэлгэцийн координат) */
  gerPlayer: Vector2;
  /** Орон дээр унтаж байгаа үлдсэн хугацаа (сек). 0 = унтаагүй */
  gerSleepTimer: number;
  /** Аль орон дээр унтаж байгаа */
  gerSleepBed: "L" | "R" | null;
  /** Гэр доторх зуух ассан эсэх */
  gerStoveLit: boolean;
  /** Зуухны түлшний үлдэгдэл (сек) */
  gerStoveFuel: number;
  /** Пауз менюгээс үндсэн цэс рүү буцах */
  requestRestart: boolean;
  /** B эхний даралт — хашааны цагаан preview идэвхтэй */
  fencePreview: boolean;
  /** Preview үеийн хашааны өнцөг (радиан). 0 = зүүн–баруун */
  fencePreviewAngle: number;
  /** Preview байршлын нэмэлт алхам (хагас тор) — сумнаар */
  fencePreviewOffset: Vector2;
  /** . cheat — мод/түлээ хязгааргүй, зарцуулалт хасагдахгүй */
  unlimitedWood: boolean;
  /** , cheat — амь багасахгүй, үхэхгүй */
  godMode: boolean;
  /** Melee/parry үед хэвийн хөдөлгөөн түгжигдсэн */
  combatMovementLocked: boolean;
  /** Dodge идэвхтэй — хэвийн хөдөлгөөн алгасна */
  combatDodgeActive: boolean;
  nextEntityId: number;
  /** Идэвхтэй оньсогын id (phase === "riddle") */
  activeRiddleId: string | null;
  activeRiddleHost: RiddleHostRef | null;
  riddleFeedback: "idle" | "wrong" | "correct";
  /** Сүүлд сонгосон хариултын индекс (UI highlight) */
  riddleSelectedIndex: number | null;
  /** Сүүлчийн онооны өөрчлөлт (шагнал/торгууль) */
  riddleLastDelta: number;
  /** Сүнс = нэмэлт амь (хуучин арилжааны урамшуулал; одоо олгохгүй) */
  spiritPoints: number;
  elderTab: "trade" | "talk";
  elderDialogueId: string | null;
  elderDialogueLine: number;
  elderShowingChoices: boolean;
  elderHeardDialogues: string[];
  /** Сүнсний ертөнцийн шилжилтийн манан (сек) */
  spiritTransition: number;
  spiritReturnPos: Vector2 | null;
  spiritCleared: boolean;
  /**
   * Сүнсний горим:
   * - purge — ердийн сүнсний дайснууд
   * - shulmas — Төмөр шулмас / туслах нарын орон
   */
  spiritMode: "purge" | "shulmas";
  /** Сүнс рүү орохоос өмнөх дайснууд */
  spiritSavedWolves: Wolf[] | null;
  spiritSavedThieves: Thief[] | null;
  /** Төмөр шулмасыг ялсны дараа аав ээж буцаж ирсэн */
  parentsReturned: boolean;
  /** Аав ээж — буцаж ирсний дараа мал маллана */
  parents: { father: ParentNpc; mother: ParentNpc } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const VIEW_W = 960;
export const VIEW_H = 540;
/** Томруулсан газрын хэмжээ (~1.5×) — бүс нутгийн биомтой */
export const WORLD_W = 3600;
export const WORLD_H = 2400;
export const START_SHEEP = 2;
export const START_GOATS = 2;
export const CAMPFIRE_WOOD_COST = 3;
export const MAX_VISUAL_SHEEP = 36;
export const MAX_VISUAL_SHEEP = 1000;
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
/** Нэг хонинд өдөрт хэрэгтэй өвс (өвөл тэвш) */
export const HAY_PER_SHEEP_PER_DAY = 0.18;
/** Бэлчээрт 1 мал 1 өдөрт идэх өвс */
export const GRAZE_PER_ANIMAL_PER_DAY = 0.85;
/** Тоглоомын нэг өдрийн бодит хугацаа (сек) — 4 мин = 1 өдөр */
export const DAY_LENGTH_SEC = 240;
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
