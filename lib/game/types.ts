// Хүн 1 (дундын суурь) — бүх төрөл, интерфэйс, тогтмолууд

export type WeatherKind = "clear" | "wind" | "storm" | "snow";
export type Season = "summer" | "autumn" | "winter" | "spring";
export type GamePhase =
  | "menu"
  | "playing"
  | "paused"
  | "won"
  | "lost"
  | "levelup"
  | "ger";

/** Дэлгүүрээс авч болох эд зүйлс */
export type GearId = "dog" | "horse" | "bow" | "gun";

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

export interface Sheep {
  id: number;
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
}

export interface Flock {
  total: number;
  visuals: Sheep[];
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
  nextWolfIn: number;
  nextThiefIn: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
  attack: boolean;
  lightFire: boolean;
  eat: boolean;
  restart: boolean;
  skill1: boolean;
  skill2: boolean;
  skill3: boolean;
  skill4: boolean;
  /** Enter/Space — меню дэх сонголт */
  confirm: boolean;
  /** Escape — түр зогсоох */
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
  /** Гэр доторх малчны байрлал (дэлгэцийн координат) */
  gerPlayer: Vector2;
  /** Пауз менюгээс "Дахин эхлэх" дарсан */
  requestRestart: boolean;
  nextEntityId: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const VIEW_W = 960;
export const VIEW_H = 540;
export const WORLD_W = 2400;
export const WORLD_H = 1600;
export const START_SHEEP = 10;
export const WIN_SHEEP = 1000;
export const MAX_VISUAL_SHEEP = 36;
export const PASTURE_RADIUS = 160;
/** Нэг улирал хэдэн өдөр үргэлжлэх */
export const SEASON_DAYS = 6;

export const SEASON_ORDER: Season[] = ["autumn", "winter", "spring", "summer"];

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
