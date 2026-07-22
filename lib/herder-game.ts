/**
 * Малчин — Survival + Herding (HD upgrade)
 * TypeScript + HTML5 Canvas
 *
 * v0.3 — өндөр чанарын шинэчлэл:
 *  - Урьдчилан зурсан газрын зураглал (өвс, цэцэг, чулуу, зам)
 *  - Гэр, амьд дүрсүүд (алхаа, сүүл, чих, ноос)
 *  - Particle эффект, эргэн тойрны гэрэлтүүлэг (гал, шөнө)
 *  - Улирлын эргэлт (намар→өвөл→хавар→зун), цас/бороо
 *  - Дэлгэцийн доргилт, хөвөгч текст, minimap, аюулын сум
 *  - Retina (devicePixelRatio) дэмжлэг, R дахин эхлэх
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WeatherKind = "clear" | "wind" | "storm" | "snow";
type Season = "summer" | "autumn" | "winter" | "spring";
type GamePhase = "playing" | "won" | "lost" | "levelup";

interface Vector2 {
  x: number;
  y: number;
}

interface Vitals {
  health: number;
  maxHealth: number;
  warmth: number;
  maxWarmth: number;
  hunger: number;
  maxHunger: number;
}

interface Inventory {
  wood: number;
  berries: number;
}

interface Player {
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
  moving: boolean;
  facing: Vector2;
}

interface Tree {
  id: number;
  pos: Vector2;
  hp: number;
  maxHp: number;
  radius: number;
  respawnIn: number;
}

interface BerryBush {
  id: number;
  pos: Vector2;
  berries: number;
  maxBerries: number;
  radius: number;
  respawnIn: number;
}

interface Campfire {
  pos: Vector2;
  lit: boolean;
  fuel: number;
  radius: number;
}

interface Sheep {
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

interface Flock {
  total: number;
  visuals: Sheep[];
}

interface Wolf {
  id: number;
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

interface Thief {
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

interface World {
  width: number;
  height: number;
  trees: Tree[];
  bushes: BerryBush[];
  campfire: Campfire;
  flock: Flock;
  wolves: Wolf[];
  thieves: Thief[];
  season: Season;
  weather: WeatherKind;
  timeOfDay: number;
  dayNumber: number;
  elapsed: number;
  nextWolfIn: number;
  nextThiefIn: number;
}

interface InputState {
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
}

interface Particle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

interface FloatingText {
  pos: Vector2;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

interface Effects {
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

interface Skill {
  id: string;
  name: string;
  desc: string;
  apply: (state: GameState) => void;
}

interface GameState {
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
  nextEntityId: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIEW_W = 960;
const VIEW_H = 540;
const WORLD_W = 2400;
const WORLD_H = 1600;
const START_SHEEP = 10;
const WIN_SHEEP = 1000;
const MAX_VISUAL_SHEEP = 36;
const PASTURE_RADIUS = 160;
/** Нэг улирал хэдэн өдөр үргэлжлэх */
const SEASON_DAYS = 6;

const SEASON_ORDER: Season[] = ["autumn", "winter", "spring", "summer"];

const COLORS = {
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

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function dist(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(v: Vector2): Vector2 {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function pastureCenter(world: World): Vector2 {
  return { x: world.width / 2, y: world.height / 2 };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function weatherLabel(w: WeatherKind, season: Season): string {
  const seasonMn: Record<Season, string> = {
    summer: "Зун",
    autumn: "Намар",
    winter: "Өвөл",
    spring: "Хавар",
  };
  const weatherMn: Record<WeatherKind, string> = {
    clear: "Цэлмэг",
    wind: "Салхитай",
    storm: "Бороотой",
    snow: "Цастай",
  };
  return `${seasonMn[season]} · ${weatherMn[w]}`;
}

function formatClock(timeOfDay: number): string {
  const h = Math.floor(timeOfDay) % 24;
  const m = Math.floor((timeOfDay % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function setMessage(state: GameState, text: string, seconds = 2.5): void {
  state.message = text;
  state.messageTimer = seconds;
}

function allocId(state: GameState): number {
  state.nextEntityId += 1;
  return state.nextEntityId;
}

function seasonForDay(day: number): Season {
  return SEASON_ORDER[Math.floor((day - 1) / SEASON_DAYS) % SEASON_ORDER.length];
}

function isNight(world: World): boolean {
  return world.timeOfDay < 6 || world.timeOfDay > 19;
}

// ---------------------------------------------------------------------------
// XP, Level, Skills
// ---------------------------------------------------------------------------

const SKILL_POOL: Skill[] = [
  {
    id: "power",
    name: "Хүчтэй цохилт",
    desc: "Цохилтын хүч +30%",
    apply: (s) => {
      s.player.damageMult *= 1.3;
    },
  },
  {
    id: "swift",
    name: "Хурдан цохилт",
    desc: "Цохилт хоорондын зай −25%",
    apply: (s) => {
      s.player.cooldownMult *= 0.75;
    },
  },
  {
    id: "speed",
    name: "Хурдан хөл",
    desc: "Гүйх хурд +12%",
    apply: (s) => {
      s.player.speed *= 1.12;
    },
  },
  {
    id: "vitality",
    name: "Их амь",
    desc: "Дээд амь +25, бүрэн эдгэрнэ",
    apply: (s) => {
      s.player.vitals.maxHealth += 25;
      s.player.vitals.health = s.player.vitals.maxHealth;
    },
  },
  {
    id: "reach",
    name: "Урт таяг",
    desc: "Цохилтын хүрээ +20%",
    apply: (s) => {
      s.player.reachMult *= 1.2;
    },
  },
  {
    id: "warm",
    name: "Дулаан дээл",
    desc: "Хүйтэнд 2 дахин тэсвэртэй",
    apply: (s) => {
      s.player.warmthResist *= 0.5;
    },
  },
];

function pickSkillChoices(): Skill[] {
  const pool = [...SKILL_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

function maybeLevelUp(state: GameState): void {
  if (state.phase !== "playing") return;
  if (state.xp < state.xpNext) return;
  state.xp -= state.xpNext;
  state.level += 1;
  state.xpNext = 60 + state.level * 30;
  state.skillChoices = pickSkillChoices();
  state.phase = "levelup";
}

function gainXp(state: GameState, n: number, at?: Vector2): void {
  state.xp += n;
  if (at) spawnText(state, at, `+${n} XP`, "#c0a0ff");
  maybeLevelUp(state);
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

function spawnParticles(
  state: GameState,
  pos: Vector2,
  count: number,
  color: string,
  opts: { speed?: number; life?: number; size?: number; gravity?: number } = {},
): void {
  const { speed = 90, life = 0.5, size = 3, gravity = 160 } = opts;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = randRange(speed * 0.3, speed);
    state.fx.particles.push({
      pos: { x: pos.x, y: pos.y },
      vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp - speed * 0.3 },
      life: life * randRange(0.6, 1.2),
      maxLife: life,
      size: size * randRange(0.6, 1.3),
      color,
      gravity,
    });
  }
}

function spawnText(
  state: GameState,
  pos: Vector2,
  text: string,
  color = "#ffffff",
): void {
  state.fx.texts.push({
    pos: { x: pos.x + randRange(-8, 8), y: pos.y },
    text,
    life: 1.4,
    maxLife: 1.4,
    color,
  });
}

function updateEffects(state: GameState, dt: number): void {
  const fx = state.fx;
  for (const p of fx.particles) {
    p.life -= dt;
    p.vel.y += p.gravity * dt;
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);

  for (const t of fx.texts) {
    t.life -= dt;
    t.pos.y -= 26 * dt;
  }
  fx.texts = fx.texts.filter((t) => t.life > 0);

  fx.shake = Math.max(0, fx.shake - dt * 14);
  fx.hurtFlash = Math.max(0, fx.hurtFlash - dt * 2.2);

  // Галын оч
  const fire = state.world.campfire;
  if (fire.lit) {
    fx.emberAcc += dt;
    while (fx.emberAcc > 0.08) {
      fx.emberAcc -= 0.08;
      fx.particles.push({
        pos: { x: fire.pos.x + randRange(-6, 6), y: fire.pos.y - 8 },
        vel: { x: randRange(-14, 14), y: randRange(-70, -30) },
        life: randRange(0.4, 0.9),
        maxLife: 0.9,
        size: randRange(1.5, 3),
        color: Math.random() < 0.5 ? "#ffb347" : "#ff7733",
        gravity: -30,
      });
    }
  }

  // Явахад тоос
  if (state.player.moving && state.phase === "playing") {
    fx.dustAcc += dt;
    if (fx.dustAcc > 0.18) {
      fx.dustAcc = 0;
      fx.particles.push({
        pos: {
          x: state.player.pos.x + randRange(-4, 4),
          y: state.player.pos.y + 10,
        },
        vel: { x: randRange(-10, 10), y: randRange(-16, -4) },
        life: 0.4,
        maxLife: 0.4,
        size: randRange(2, 4),
        color: "rgba(150,130,95,0.5)",
        gravity: 0,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Flock helpers
// ---------------------------------------------------------------------------

function createVisualSheep(id: number, around: Vector2): Sheep {
  const ang = Math.random() * Math.PI * 2;
  const r = randRange(20, PASTURE_RADIUS * 0.7);
  return {
    id,
    pos: {
      x: around.x + Math.cos(ang) * r,
      y: around.y + Math.sin(ang) * r,
    },
    vel: { x: 0, y: 0 },
    radius: 10,
    grazeSeed: Math.random() * 10,
    hp: 3,
    flash: 0,
    face: 1,
  };
}

function syncVisualFlock(state: GameState): void {
  const { flock } = state.world;
  const center = pastureCenter(state.world);
  const want = Math.min(MAX_VISUAL_SHEEP, flock.total);

  while (flock.visuals.length < want) {
    flock.visuals.push(createVisualSheep(allocId(state), center));
  }
  while (flock.visuals.length > want) {
    flock.visuals.pop();
  }
}

function addSheep(state: GameState, n: number): void {
  state.world.flock.total = Math.min(WIN_SHEEP, state.world.flock.total + n);
  syncVisualFlock(state);
  checkWin(state);
}

function loseSheep(state: GameState, n: number): number {
  const lost = Math.min(n, state.world.flock.total);
  state.world.flock.total -= lost;
  syncVisualFlock(state);
  if (state.world.flock.total <= 0) {
    state.phase = "lost";
    setMessage(state, "Бүх мал үгүй болов… Ялагдлаа.", 99);
  }
  return lost;
}

/** Тодорхой нэг хонь чонод идэгдэх */
function killSheepVisual(state: GameState, sheep: Sheep): void {
  const flock = state.world.flock;
  flock.total = Math.max(0, flock.total - 1);
  const i = flock.visuals.indexOf(sheep);
  if (i >= 0) flock.visuals.splice(i, 1);
  syncVisualFlock(state);
  if (flock.total <= 0) {
    state.phase = "lost";
    setMessage(state, "Бүх мал үгүй болов… Ялагдлаа.", 99);
  }
}

function checkWin(state: GameState): void {
  if (state.world.flock.total >= WIN_SHEEP) {
    state.phase = "won";
    setMessage(state, `Ялалт! ${WIN_SHEEP} хоньтой болоо!`, 99);
  }
}

function nearestSheep(from: Vector2, visuals: Sheep[]): Sheep | null {
  let best: Sheep | null = null;
  let bestD = Infinity;
  for (const s of visuals) {
    const d = dist(from, s.pos);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// World bootstrap
// ---------------------------------------------------------------------------

function createTrees(count: number): Tree[] {
  const trees: Tree[] = [];
  const center: Vector2 = { x: WORLD_W / 2, y: WORLD_H / 2 };

  for (let i = 0; i < count; i++) {
    let pos: Vector2;
    let attempts = 0;
    do {
      pos = {
        x: 80 + Math.random() * (WORLD_W - 160),
        y: 80 + Math.random() * (WORLD_H - 160),
      };
      attempts++;
    } while (dist(pos, center) < 220 && attempts < 40);

    trees.push({ id: i, pos, hp: 3, maxHp: 3, radius: 18, respawnIn: 0 });
  }
  return trees;
}

function createBushes(count: number): BerryBush[] {
  const bushes: BerryBush[] = [];
  const center: Vector2 = { x: WORLD_W / 2, y: WORLD_H / 2 };

  for (let i = 0; i < count; i++) {
    let pos: Vector2;
    let attempts = 0;
    do {
      pos = {
        x: 80 + Math.random() * (WORLD_W - 160),
        y: 80 + Math.random() * (WORLD_H - 160),
      };
      attempts++;
    } while (dist(pos, center) < 140 && attempts < 40);

    bushes.push({
      id: 1000 + i,
      pos,
      berries: 3 + Math.floor(Math.random() * 3),
      maxBerries: 5,
      radius: 16,
      respawnIn: 0,
    });
  }
  return bushes;
}

function createInitialState(): GameState {
  const spawn: Vector2 = { x: WORLD_W / 2, y: WORLD_H / 2 };

  const state: GameState = {
    player: {
      pos: { x: spawn.x, y: spawn.y + 60 },
      speed: 155,
      radius: 14,
      vitals: {
        health: 100,
        maxHealth: 100,
        warmth: 100,
        maxWarmth: 100,
        hunger: 85,
        maxHunger: 100,
      },
      inventory: { wood: 0, berries: 0 },
      chopCooldown: 0,
      attackCooldown: 0,
      eatCooldown: 0,
      attackAnim: 0,
      invuln: 0,
      damageMult: 1,
      reachMult: 1,
      cooldownMult: 1,
      warmthResist: 1,
      moving: false,
      facing: { x: 0, y: 1 },
    },
    world: {
      width: WORLD_W,
      height: WORLD_H,
      trees: createTrees(40),
      bushes: createBushes(28),
      campfire: {
        pos: { x: spawn.x + 52, y: spawn.y + 14 },
        lit: false,
        fuel: 0,
        radius: 56,
      },
      flock: { total: START_SHEEP, visuals: [] },
      wolves: [],
      thieves: [],
      season: "autumn",
      weather: "clear",
      timeOfDay: 8,
      dayNumber: 1,
      elapsed: 0,
      nextWolfIn: 18,
      nextThiefIn: 35,
    },
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
      interact: false,
      attack: false,
      lightFire: false,
      eat: false,
      restart: false,
      skill1: false,
      skill2: false,
      skill3: false,
    },
    fx: {
      particles: [],
      texts: [],
      shake: 0,
      hurtFlash: 0,
      emberAcc: 0,
      dustAcc: 0,
    },
    message: "10 хоньтой эхэллээ. Жимс идэж, сүргээ хамгаал!",
    messageTimer: 5,
    score: 0,
    xp: 0,
    level: 1,
    xpNext: 90,
    skillChoices: [],
    phase: "playing",
    nextEntityId: 100,
  };

  syncVisualFlock(state);
  return state;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function bindInput(getInput: () => InputState): () => void {
  const setKey = (code: string, pressed: boolean): void => {
    const input = getInput();
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        input.up = pressed;
        break;
      case "KeyS":
      case "ArrowDown":
        input.down = pressed;
        break;
      case "KeyA":
      case "ArrowLeft":
        input.left = pressed;
        break;
      case "KeyD":
      case "ArrowRight":
        input.right = pressed;
        break;
      case "KeyE":
        input.interact = pressed;
        break;
      case "Space":
      case "KeyJ":
        input.attack = pressed;
        break;
      case "KeyF":
        input.lightFire = pressed;
        break;
      case "KeyQ":
        input.eat = pressed;
        break;
      case "KeyR":
        if (pressed) input.restart = true;
        break;
      case "Digit1":
      case "Numpad1":
        if (pressed) input.skill1 = true;
        break;
      case "Digit2":
      case "Numpad2":
        if (pressed) input.skill2 = true;
        break;
      case "Digit3":
      case "Numpad3":
        if (pressed) input.skill3 = true;
        break;
    }
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    setKey(e.code, true);
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    ) {
      e.preventDefault();
    }
  };
  const onKeyUp = (e: KeyboardEvent): void => setKey(e.code, false);

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
}

// ---------------------------------------------------------------------------
// Threat spawning
// ---------------------------------------------------------------------------

function spawnWolf(state: GameState): void {
  const edge = Math.floor(Math.random() * 4);
  let pos: Vector2;
  if (edge === 0) pos = { x: randRange(40, WORLD_W - 40), y: 40 };
  else if (edge === 1) pos = { x: randRange(40, WORLD_W - 40), y: WORLD_H - 40 };
  else if (edge === 2) pos = { x: 40, y: randRange(40, WORLD_H - 40) };
  else pos = { x: WORLD_W - 40, y: randRange(40, WORLD_H - 40) };

  const night = isNight(state.world);
  const lvl = state.level - 1;
  const hp = Math.round((night ? 45 : 30) * (1 + 0.12 * lvl));
  state.world.wolves.push({
    id: allocId(state),
    pos,
    vel: { x: 0, y: 0 },
    hp,
    maxHp: hp,
    radius: 14,
    speed: (night ? 115 : 95) + Math.min(30, lvl * 3),
    attackCooldown: 0,
    damage: 12 + lvl * 2,
    scale: Math.min(1.8, 1 + lvl * 0.09),
    flash: 0,
    face: 1,
    alive: true,
  });
  setMessage(
    state,
    night ? "Шөнийн чоно мал руу дайрлаа!" : "Чоно ойртлоо — хамгаал!",
    3,
  );
}

function spawnThief(state: GameState): void {
  if (state.world.flock.total <= 0) return;

  const center = pastureCenter(state.world);
  const ang = Math.random() * Math.PI * 2;
  const pos: Vector2 = {
    x: center.x + Math.cos(ang) * (PASTURE_RADIUS + 40),
    y: center.y + Math.sin(ang) * (PASTURE_RADIUS + 40),
  };

  const escapeAng = Math.atan2(pos.y - center.y, pos.x - center.x);
  const escapeTarget: Vector2 = {
    x: clamp(center.x + Math.cos(escapeAng) * 1400, 20, WORLD_W - 20),
    y: clamp(center.y + Math.sin(escapeAng) * 1400, 20, WORLD_H - 20),
  };

  const stealWant = clamp(2 + Math.floor(Math.random() * 4), 1, 8);
  const stolen = loseSheep(state, stealWant);
  if (stolen <= 0) return;

  const lvl = state.level - 1;
  const thiefHp = 40 + lvl * 8;
  state.world.thieves.push({
    id: allocId(state),
    pos,
    vel: { x: 0, y: 0 },
    hp: thiefHp,
    maxHp: thiefHp,
    radius: 13,
    speed: 88 + Math.min(20, lvl * 2),
    stolen,
    escapeTarget,
    damage: 8 + lvl * 2,
    attackCooldown: 0,
    flash: 0,
    face: 1,
    alive: true,
  });

  spawnText(state, pos, `−${stolen} хонь!`, "#ff8080");
  setMessage(state, `Хулгайч ${stolen} хонь авч зугтав! Гүйцэж ав!`, 4);
}

// ---------------------------------------------------------------------------
// Update systems
// ---------------------------------------------------------------------------

function updateWeatherCycle(state: GameState, dt: number): void {
  const world = state.world;
  const prevDay = Math.floor(world.timeOfDay);
  world.timeOfDay = (world.timeOfDay + dt * 0.8) % 24;
  world.elapsed += dt;

  const curDay = Math.floor(world.timeOfDay);
  if (curDay < prevDay) {
    world.dayNumber += 1;
    const growth = Math.max(
      1,
      Math.floor(world.flock.total * randRange(0.08, 0.15)),
    );
    addSheep(state, growth);
    state.score += growth;
    gainXp(state, 12);
    spawnText(state, pastureCenter(world), `+${growth} хонь`, "#b8e8a0");
    if (state.phase === "playing") {
      setMessage(
        state,
        `Өдөр ${world.dayNumber}: сүрэг +${growth} (нийт ${world.flock.total})`,
        3.5,
      );
    }
  }

  world.season = seasonForDay(world.dayNumber);

  const t = world.elapsed;
  if (world.season === "winter") {
    world.weather = t % 40 < 18 ? "snow" : "wind";
  } else if (world.season === "summer") {
    world.weather = t % 60 > 50 ? "wind" : "clear";
  } else if (t % 55 > 40) {
    world.weather = "storm";
  } else if (t % 55 > 28) {
    world.weather = "wind";
  } else {
    world.weather = "clear";
  }
}

function updatePlayerMovement(state: GameState, dt: number): void {
  const { player, input, world } = state;
  const dir: Vector2 = {
    x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    y: (input.down ? 1 : 0) - (input.up ? 1 : 0),
  };
  const n = normalize(dir);
  player.moving = n.x !== 0 || n.y !== 0;

  if (player.moving) {
    player.facing = n;
    player.pos.x += n.x * player.speed * dt;
    player.pos.y += n.y * player.speed * dt;
  }

  player.pos.x = clamp(player.pos.x, player.radius, world.width - player.radius);
  player.pos.y = clamp(
    player.pos.y,
    player.radius,
    world.height - player.radius,
  );
}

function nearestAliveTree(player: Player, trees: Tree[]): Tree | null {
  let best: Tree | null = null;
  let bestD = Infinity;
  for (const tree of trees) {
    if (tree.hp <= 0) continue;
    const d = dist(player.pos, tree.pos);
    if (d < bestD) {
      bestD = d;
      best = tree;
    }
  }
  return bestD < player.radius + 36 ? best : null;
}

function nearestBerryBush(
  player: Player,
  bushes: BerryBush[],
): BerryBush | null {
  let best: BerryBush | null = null;
  let bestD = Infinity;
  for (const bush of bushes) {
    if (bush.berries <= 0) continue;
    const d = dist(player.pos, bush.pos);
    if (d < bestD) {
      bestD = d;
      best = bush;
    }
  }
  return bestD < player.radius + 34 ? best : null;
}

function tryInteract(state: GameState): void {
  const { player, world } = state;
  if (player.chopCooldown > 0 || !state.input.interact) return;

  const bush = nearestBerryBush(player, world.bushes);
  if (bush) {
    bush.berries -= 1;
    player.inventory.berries += 1;
    player.chopCooldown = 0.35;
    state.score += 2;
    gainXp(state, 1);
    spawnParticles(state, bush.pos, 5, "#e04070", { speed: 60, size: 2.5 });
    spawnText(state, bush.pos, "+1 жимс", "#ff9fbf");
    if (bush.berries <= 0) {
      bush.respawnIn = 18 + Math.random() * 12;
    }
    return;
  }

  const tree = nearestAliveTree(player, world.trees);
  if (!tree) {
    setMessage(state, "Ойрхон мод/жимс алга.", 1.5);
    return;
  }

  tree.hp -= 1;
  player.chopCooldown = 0.45;
  spawnParticles(state, { x: tree.pos.x, y: tree.pos.y - 8 }, 6, "#a0733d", {
    speed: 80,
    size: 3,
  });
  state.fx.shake = Math.max(state.fx.shake, 1.2);

  if (tree.hp <= 0) {
    const gained = 1 + Math.floor(Math.random() * 2);
    player.inventory.wood += gained;
    state.score += gained * 5;
    gainXp(state, 3);
    tree.respawnIn = 25 + Math.random() * 15;
    spawnParticles(state, tree.pos, 10, "#8a6a3a", { speed: 110 });
    spawnText(state, tree.pos, `+${gained} түлээ`, "#e8c56a");
  }
}

function tryEatBerry(state: GameState): void {
  const { player } = state;
  if (!state.input.eat || player.eatCooldown > 0) return;

  if (player.inventory.berries <= 0) {
    setMessage(state, "Жимс алга. Бутнаас E-ээр түү.", 2);
    state.input.eat = false;
    return;
  }

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
  state.input.eat = false;
  spawnParticles(state, { x: player.pos.x, y: player.pos.y - 16 }, 4, "#e04070", {
    speed: 40,
    gravity: -20,
    size: 2,
  });
  spawnText(state, player.pos, "+28 хоол", "#ffd080");
}

function tryLightCampfire(state: GameState): void {
  if (!state.input.lightFire) return;

  const { player, world } = state;
  const fire = world.campfire;
  if (dist(player.pos, fire.pos) >= fire.radius) {
    setMessage(state, "Гал руу ойрт (F).", 1.5);
    state.input.lightFire = false;
    return;
  }

  const cost = 3;
  if (player.inventory.wood < cost) {
    setMessage(state, `Галд ${cost} түлээ хэрэгтэй.`, 2);
    state.input.lightFire = false;
    return;
  }

  player.inventory.wood -= cost;
  fire.lit = true;
  fire.fuel = Math.max(fire.fuel, 0) + 18;
  state.input.lightFire = false;
  spawnParticles(state, fire.pos, 14, "#ffb347", { speed: 70, gravity: -40 });
  setMessage(state, "Гал асаалаа.", 2);
}

function tryAttack(state: GameState): void {
  const { player, world } = state;
  if (player.attackCooldown > 0 || !state.input.attack) return;

  player.attackCooldown = 0.4 * player.cooldownMult;
  player.attackAnim = 0.22;
  const reach = 42 * player.reachMult;
  let hit = false;

  for (const wolf of world.wolves) {
    if (!wolf.alive) continue;
    if (dist(player.pos, wolf.pos) > reach) continue;
    wolf.hp -= 18 * player.damageMult;
    wolf.flash = 0.12;
    hit = true;
    const away = normalize({
      x: wolf.pos.x - player.pos.x,
      y: wolf.pos.y - player.pos.y,
    });
    wolf.pos.x += away.x * 28;
    wolf.pos.y += away.y * 28;
    spawnParticles(state, wolf.pos, 8, "#c03030", { speed: 100 });
    state.fx.shake = Math.max(state.fx.shake, 2.5);

    if (wolf.hp <= 0) {
      wolf.alive = false;
      state.score += 25;
      spawnParticles(state, wolf.pos, 16, "#909090", { speed: 130 });
      spawnText(state, wolf.pos, "+25", "#ffd060");
      gainXp(state, 22, wolf.pos);
      setMessage(state, "Чоно устгагдлаа!", 2);
    }
    break;
  }

  if (!hit) {
    for (const thief of world.thieves) {
      if (!thief.alive) continue;
      if (dist(player.pos, thief.pos) > reach) continue;
      thief.hp -= 20 * player.damageMult;
      thief.flash = 0.12;
      hit = true;
      const away = normalize({
        x: thief.pos.x - player.pos.x,
        y: thief.pos.y - player.pos.y,
      });
      thief.pos.x += away.x * 32;
      thief.pos.y += away.y * 32;
      spawnParticles(state, thief.pos, 8, "#7050a0", { speed: 100 });
      state.fx.shake = Math.max(state.fx.shake, 2.5);

      if (thief.hp <= 0) {
        thief.alive = false;
        const recovered = thief.stolen;
        thief.stolen = 0;
        addSheep(state, recovered);
        state.score += recovered * 15;
        spawnText(state, thief.pos, `+${recovered} хонь!`, "#b8e8a0");
        gainXp(state, 30 + recovered * 2, thief.pos);
        setMessage(state, `Мал буцааж авлаа! +${recovered} хонь`, 3);
      }
      break;
    }
  }
}

function updateFlock(state: GameState, dt: number): void {
  const center = pastureCenter(state.world);
  const { player, world } = state;

  for (const sheep of world.flock.visuals) {
    const toCenter = normalize({
      x: center.x - sheep.pos.x,
      y: center.y - sheep.pos.y,
    });
    const toPlayer = normalize({
      x: player.pos.x - sheep.pos.x,
      y: player.pos.y - sheep.pos.y,
    });
    const wander = {
      x: Math.sin(world.elapsed * 0.7 + sheep.id) * 0.4,
      y: Math.cos(world.elapsed * 0.5 + sheep.id * 1.3) * 0.4,
    };

    // Чононоос зугтана
    let fleeX = 0;
    let fleeY = 0;
    for (const wolf of world.wolves) {
      const d = dist(sheep.pos, wolf.pos);
      if (d < 140 && d > 1) {
        const w = (140 - d) / 140;
        fleeX += ((sheep.pos.x - wolf.pos.x) / d) * w * 3.5;
        fleeY += ((sheep.pos.y - wolf.pos.y) / d) * w * 3.5;
      }
    }

    const dCenter = dist(sheep.pos, center);
    const pull = dCenter > PASTURE_RADIUS ? 1.2 : 0.25;

    sheep.vel.x +=
      (toCenter.x * pull + toPlayer.x * 0.15 + wander.x + fleeX) * 40 * dt;
    sheep.vel.y +=
      (toCenter.y * pull + toPlayer.y * 0.15 + wander.y + fleeY) * 40 * dt;
    sheep.vel.x *= 0.92;
    sheep.vel.y *= 0.92;
    sheep.pos.x += sheep.vel.x * dt;
    sheep.pos.y += sheep.vel.y * dt;
    sheep.pos.x = clamp(sheep.pos.x, 30, WORLD_W - 30);
    sheep.pos.y = clamp(sheep.pos.y, 30, WORLD_H - 30);

    if (sheep.flash > 0) sheep.flash -= dt;
    // Харах чигийг зөвхөн мэдэгдэхүйц хөдөлгөөнд солино (анивчилт арилгана)
    if (Math.abs(sheep.vel.x) > 8) sheep.face = sheep.vel.x < 0 ? -1 : 1;
  }
}

function updateWolves(state: GameState, dt: number): void {
  const { wolves, flock } = state.world;
  const player = state.player;

  for (const wolf of wolves) {
    if (!wolf.alive) continue;
    wolf.attackCooldown = Math.max(0, wolf.attackCooldown - dt);
    wolf.flash = Math.max(0, wolf.flash - dt);

    const prey = nearestSheep(wolf.pos, flock.visuals);
    const target = prey?.pos ?? pastureCenter(state.world);

    const dPlayer = dist(wolf.pos, player.pos);
    let dir: Vector2;
    if (dPlayer < 50 && wolf.hp < wolf.maxHp * 0.4) {
      dir = normalize({
        x: wolf.pos.x - player.pos.x,
        y: wolf.pos.y - player.pos.y,
      });
    } else {
      dir = normalize({ x: target.x - wolf.pos.x, y: target.y - wolf.pos.y });
    }

    wolf.vel = dir;
    // Харах чигийг зөөлөн солино — олз дээрээ чичрэхгүй
    if (Math.abs(dir.x) > 0.25) wolf.face = dir.x < 0 ? -1 : 1;

    const dPrey = prey ? dist(wolf.pos, prey.pos) : Infinity;
    const biteRange = wolf.radius * wolf.scale + (prey ? prey.radius : 0) + 4;

    // Олзондоо хүрсэн бол зогсож хазна (мөргөлдөж анивчихгүй)
    if (dPrey > biteRange - 3) {
      wolf.pos.x += dir.x * wolf.speed * dt;
      wolf.pos.y += dir.y * wolf.speed * dt;
    }

    // 3 хазалтаар хонь унана
    if (prey && dPrey < biteRange + 4 && wolf.attackCooldown <= 0) {
      wolf.attackCooldown = 1.3;
      prey.hp -= 1;
      prey.flash = 0.18;
      spawnParticles(state, prey.pos, 5, "#f0ebe3", { speed: 70 });
      if (prey.hp <= 0) {
        spawnParticles(state, prey.pos, 12, "#f0ebe3", { speed: 100 });
        spawnText(state, prey.pos, "−1 хонь", "#ff8080");
        killSheepVisual(state, prey);
        setMessage(state, "Чоно хонь барив!", 2);
      }
    }

    if (
      dPlayer < wolf.radius * wolf.scale + player.radius + 2 &&
      wolf.attackCooldown <= 0 &&
      player.invuln <= 0
    ) {
      wolf.attackCooldown = 1.1;
      player.invuln = 0.6;
      player.vitals.health = clamp(
        player.vitals.health - wolf.damage,
        0,
        player.vitals.maxHealth,
      );
      const knock = normalize({
        x: player.pos.x - wolf.pos.x,
        y: player.pos.y - wolf.pos.y,
      });
      player.pos.x += knock.x * 24;
      player.pos.y += knock.y * 24;
      state.fx.shake = Math.max(state.fx.shake, 5);
      state.fx.hurtFlash = 1;
      spawnParticles(state, player.pos, 8, "#d64545", { speed: 90 });
      spawnText(state, player.pos, `−${wolf.damage}`, "#ff6060");
      if (player.vitals.health <= 0) {
        state.phase = "lost";
        setMessage(state, "Чононд ялагдлаа…", 99);
      }
    }
  }

  state.world.wolves = wolves.filter((w) => w.alive);
}

function updateThieves(state: GameState, dt: number): void {
  const player = state.player;
  for (const thief of state.world.thieves) {
    if (!thief.alive) continue;
    thief.flash = Math.max(0, thief.flash - dt);
    thief.attackCooldown = Math.max(0, thief.attackCooldown - dt);

    const dPlayer = dist(thief.pos, player.pos);
    const dir = normalize({
      x: thief.escapeTarget.x - thief.pos.x,
      y: thief.escapeTarget.y - thief.pos.y,
    });
    thief.vel = dir;

    if (dPlayer < 70) {
      // Тоглогч ойртвол эргэж зөрүүлж зодолдоно — удаан зугтана
      thief.face = player.pos.x < thief.pos.x ? -1 : 1;
      thief.pos.x += dir.x * thief.speed * 0.45 * dt;
      thief.pos.y += dir.y * thief.speed * 0.45 * dt;

      if (
        dPlayer < thief.radius + player.radius + 6 &&
        thief.attackCooldown <= 0 &&
        player.invuln <= 0
      ) {
        thief.attackCooldown = 1.1;
        player.invuln = 0.5;
        player.vitals.health = clamp(
          player.vitals.health - thief.damage,
          0,
          player.vitals.maxHealth,
        );
        const knock = normalize({
          x: player.pos.x - thief.pos.x,
          y: player.pos.y - thief.pos.y,
        });
        player.pos.x += knock.x * 20;
        player.pos.y += knock.y * 20;
        state.fx.shake = Math.max(state.fx.shake, 4);
        state.fx.hurtFlash = 1;
        spawnParticles(state, player.pos, 6, "#d64545", { speed: 80 });
        spawnText(state, player.pos, `−${thief.damage}`, "#ff6060");
        if (player.vitals.health <= 0 && state.phase === "playing") {
          state.phase = "lost";
          setMessage(state, "Хулгайчид зодуулж ялагдлаа…", 99);
        }
      }
    } else {
      if (Math.abs(dir.x) > 0.25) thief.face = dir.x < 0 ? -1 : 1;
      thief.pos.x += dir.x * thief.speed * dt;
      thief.pos.y += dir.y * thief.speed * dt;
    }

    const atEdge =
      thief.pos.x <= 30 ||
      thief.pos.x >= WORLD_W - 30 ||
      thief.pos.y <= 30 ||
      thief.pos.y >= WORLD_H - 30 ||
      dist(thief.pos, thief.escapeTarget) < 40;

    if (atEdge) {
      const lost = thief.stolen;
      thief.stolen = 0;
      thief.alive = false;
      setMessage(
        state,
        lost > 0
          ? `Хулгайч зугтав… ${lost} хонь үгүй болов.`
          : "Хулгайч зугтав.",
        3,
      );
    }
  }

  state.world.thieves = state.world.thieves.filter((t) => t.alive);
}

function updateThreatTimers(state: GameState, dt: number): void {
  const world = state.world;
  world.nextWolfIn -= dt;
  world.nextThiefIn -= dt;

  const night = isNight(world);
  if (world.nextWolfIn <= 0) {
    spawnWolf(state);
    world.nextWolfIn = night ? randRange(10, 18) : randRange(22, 38);
  }

  if (world.nextThiefIn <= 0) {
    if (!night || Math.random() < 0.35) {
      spawnThief(state);
    }
    world.nextThiefIn = randRange(28, 50);
  }
}

function updateSurvival(state: GameState, dt: number): void {
  const { player, world } = state;
  const fire = world.campfire;

  if (fire.lit) {
    fire.fuel -= dt;
    if (fire.fuel <= 0) {
      fire.lit = false;
      fire.fuel = 0;
    }
  }

  const nearFire = fire.lit && dist(player.pos, fire.pos) < fire.radius;
  const night = world.timeOfDay < 6 || world.timeOfDay > 20;
  const coldWeather =
    world.weather === "snow" ||
    world.weather === "storm" ||
    world.season === "winter";

  let warmthDelta = 0;
  if (night || coldWeather) {
    warmthDelta = -2.5 * dt * player.warmthResist;
    if (coldWeather && night) warmthDelta -= 1.5 * dt * player.warmthResist;
  } else {
    warmthDelta = 6 * dt;
  }
  if (nearFire) warmthDelta = 14 * dt;

  player.vitals.warmth = clamp(
    player.vitals.warmth + warmthDelta,
    0,
    player.vitals.maxWarmth,
  );

  if (player.vitals.warmth <= 0) {
    player.vitals.health = clamp(
      player.vitals.health - 3 * dt,
      0,
      player.vitals.maxHealth,
    );
    if (player.vitals.health <= 0 && state.phase === "playing") {
      state.phase = "lost";
      setMessage(state, "Хүйтэнд нэрвэгдлээ…", 99);
    }
  }

  player.vitals.hunger = clamp(
    player.vitals.hunger - 2.8 * dt,
    0,
    player.vitals.maxHunger,
  );
  if (player.vitals.hunger <= 0) {
    player.vitals.health = clamp(
      player.vitals.health - 5 * dt,
      0,
      player.vitals.maxHealth,
    );
    if (player.vitals.health <= 0 && state.phase === "playing") {
      state.phase = "lost";
      setMessage(state, "Өлсөж үхлээ… Жимс түүж ид!", 99);
    }
  }

  for (const tree of world.trees) {
    if (tree.hp > 0) continue;
    tree.respawnIn -= dt;
    if (tree.respawnIn <= 0) {
      tree.hp = tree.maxHp;
      tree.respawnIn = 0;
    }
  }

  for (const bush of world.bushes) {
    if (bush.berries > 0) continue;
    bush.respawnIn -= dt;
    if (bush.respawnIn <= 0) {
      bush.berries = bush.maxBerries;
      bush.respawnIn = 0;
    }
  }

  if (player.chopCooldown > 0) player.chopCooldown -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.eatCooldown > 0) player.eatCooldown -= dt;
  if (player.attackAnim > 0) player.attackAnim -= dt;
  if (player.invuln > 0) player.invuln -= dt;
}

function update(state: GameState, dt: number): void {
  // Түвшин ахисан — ур чадвар сонгох (тоглоом түр зогсоно)
  if (state.phase === "levelup") {
    const picks: Array<[boolean, number]> = [
      [state.input.skill1, 0],
      [state.input.skill2, 1],
      [state.input.skill3, 2],
    ];
    for (const [pressed, idx] of picks) {
      if (pressed && state.skillChoices[idx]) {
        const skill = state.skillChoices[idx];
        skill.apply(state);
        state.skillChoices = [];
        state.phase = "playing";
        setMessage(state, `Ур чадвар: ${skill.name}!`, 3);
        maybeLevelUp(state);
        break;
      }
    }
  }
  state.input.skill1 = false;
  state.input.skill2 = false;
  state.input.skill3 = false;

  if (state.phase === "playing") {
    updateWeatherCycle(state, dt);
    updatePlayerMovement(state, dt);
    tryInteract(state);
    tryEatBerry(state);
    tryLightCampfire(state);
    tryAttack(state);
    updateFlock(state, dt);
    updateThreatTimers(state, dt);
    updateWolves(state, dt);
    updateThieves(state, dt);
    updateSurvival(state, dt);
    if (state.messageTimer > 0) state.messageTimer -= dt;
  }
  updateEffects(state, dt);
}

// ---------------------------------------------------------------------------
// Terrain prerender
// ---------------------------------------------------------------------------

function renderTerrain(winter: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext("2d")!;

  // Суурь градиент
  const base = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  if (winter) {
    base.addColorStop(0, "#c2cfc0");
    base.addColorStop(1, "#a8bba6");
  } else {
    base.addColorStop(0, "#4b7d44");
    base.addColorStop(1, "#3b6636");
  }
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Өнгөний том толбо (нуга)
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    const r = randRange(60, 220);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (winter) {
      g.addColorStop(0, "rgba(255,255,255,0.16)");
      g.addColorStop(1, "rgba(255,255,255,0)");
    } else {
      const light = Math.random() < 0.5;
      g.addColorStop(
        0,
        light ? "rgba(120,170,90,0.18)" : "rgba(40,80,40,0.15)",
      );
      g.addColorStop(1, "rgba(0,0,0,0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Өвсний ширхэг
  ctx.lineWidth = 1;
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    const h = randRange(3, 7);
    const lean = randRange(-2, 2);
    ctx.strokeStyle = winter
      ? `rgba(${200 + Math.floor(Math.random() * 40)},${210 + Math.floor(Math.random() * 30)},205,0.5)`
      : `rgba(${40 + Math.floor(Math.random() * 40)},${95 + Math.floor(Math.random() * 50)},${40 + Math.floor(Math.random() * 25)},0.6)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - h);
    ctx.stroke();
  }

  // Чулуунууд
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    const r = randRange(3, 9);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(x + 1.5, y + 1.5, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = winter ? "#9aa4a0" : "#8a8f88";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.25, r * 0.45, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Цэцэг (өвөлд байхгүй)
  if (!winter) {
    const petals = ["#f5f0e0", "#f0d060", "#e890b0", "#c8d8f8"];
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      const c = petals[Math.floor(Math.random() * petals.length)];
      ctx.strokeStyle = "rgba(50,90,45,0.7)";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 4);
      ctx.stroke();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y - 5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Гэрийн шороон талбай
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const padG = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
  padG.addColorStop(0, winter ? "#8a7a60" : "#6f5742");
  padG.addColorStop(1, winter ? "rgba(138,122,96,0)" : "rgba(111,87,66,0)");
  ctx.fillStyle = padG;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  // Шороон дээрх толбо
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 90;
    ctx.fillStyle = "rgba(60,45,32,0.25)";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, randRange(2, 5), 0, Math.PI * 2);
    ctx.fill();
  }

  // Бэлчээрийн хилийн тойрог (бүдэг)
  ctx.strokeStyle = winter
    ? "rgba(140,120,80,0.25)"
    : "rgba(232,197,106,0.18)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.arc(cx, cy, PASTURE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  return canvas;
}

// ---------------------------------------------------------------------------
// Entity rendering
// ---------------------------------------------------------------------------

interface Camera {
  x: number;
  y: number;
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  ctx.fillStyle = "rgba(20,25,15,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  drawShadow(ctx, x, y + 26, 52, 14);

  // Их бие (цагаан эсгий)
  const bodyG = ctx.createLinearGradient(x - 46, y, x + 46, y);
  bodyG.addColorStop(0, "#cfc8b8");
  bodyG.addColorStop(0.5, "#f2ecdc");
  bodyG.addColorStop(1, "#d8d0c0");
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.moveTo(x - 46, y + 24);
  ctx.lineTo(x - 46, y - 4);
  ctx.quadraticCurveTo(x, y - 12, x + 46, y - 4);
  ctx.lineTo(x + 46, y + 24);
  ctx.closePath();
  ctx.fill();

  // Дээвэр
  const roofG = ctx.createLinearGradient(x, y - 40, x, y - 2);
  roofG.addColorStop(0, "#f8f2e2");
  roofG.addColorStop(1, "#d0c8b4");
  ctx.fillStyle = roofG;
  ctx.beginPath();
  ctx.moveTo(x - 50, y - 2);
  ctx.quadraticCurveTo(x, y - 46, x + 50, y - 2);
  ctx.closePath();
  ctx.fill();

  // Тооно
  ctx.fillStyle = "#b8845a";
  ctx.beginPath();
  ctx.arc(x, y - 32, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a5230";
  ctx.beginPath();
  ctx.arc(x, y - 32, 3, 0, Math.PI * 2);
  ctx.fill();

  // Бүслүүр оосор
  ctx.strokeStyle = "rgba(160,110,60,0.5)";
  ctx.lineWidth = 2;
  for (const oy of [4, 12]) {
    ctx.beginPath();
    ctx.moveTo(x - 46, y + oy);
    ctx.quadraticCurveTo(x, y + oy - 5, x + 46, y + oy);
    ctx.stroke();
  }

  // Хаалга
  ctx.fillStyle = "#a04820";
  ctx.fillRect(x - 9, y + 2, 18, 22);
  ctx.strokeStyle = "#5a2810";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 9, y + 2, 18, 22);
  ctx.strokeStyle = "#c86830";
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x, y + 24);
  ctx.stroke();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  tree: Tree,
  cam: Camera,
  time: number,
  windAmp: number,
): void {
  const x = tree.pos.x - cam.x;
  const y = tree.pos.y - cam.y;

  if (tree.hp <= 0) {
    drawShadow(ctx, x, y + 4, 11, 5);
    ctx.fillStyle = "#4a3828";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a5238";
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const sway = Math.sin(time * 1.6 + tree.id * 1.7) * windAmp;
  drawShadow(ctx, x + 4, y + 6, 18, 7);

  // Иш
  ctx.fillStyle = "#5c3d22";
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 8);
  ctx.quadraticCurveTo(x - 2 + sway * 0.3, y - 8, x - 1.5 + sway * 0.5, y - 16);
  ctx.lineTo(x + 1.5 + sway * 0.5, y - 16);
  ctx.quadraticCurveTo(x + 2 + sway * 0.3, y - 8, x + 4, y + 8);
  ctx.closePath();
  ctx.fill();

  // Навчис — давхарласан
  const cx = x + sway;
  const layers: Array<[number, number, number, string]> = [
    [0, -20, 17, "#2a6332"],
    [-11, -13, 12, "#2f7a3a"],
    [11, -13, 12, "#2f7a3a"],
    [0, -28, 12, "#3d8f48"],
    [-5, -21, 8, "#4aa356"],
  ];
  for (const [ox, oy, r, c] of layers) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(cx + ox, y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (tree.hp < tree.maxHp) {
    const bw = 26;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - 46, bw, 5, 2);
    ctx.fill();
    ctx.fillStyle = "#6fcf6f";
    roundRectPath(ctx, x - bw / 2, y - 46, (bw * tree.hp) / tree.maxHp, 5, 2);
    ctx.fill();
  }
}

function drawBerryBush(
  ctx: CanvasRenderingContext2D,
  bush: BerryBush,
  cam: Camera,
): void {
  const x = bush.pos.x - cam.x;
  const y = bush.pos.y - cam.y;

  drawShadow(ctx, x, y + 6, 16, 6);

  const alive = bush.berries > 0;
  const clumps: Array<[number, number, number]> = [
    [0, 0, 13],
    [-9, -5, 9],
    [8, -4, 8],
    [0, -8, 8],
  ];
  for (const [ox, oy, r] of clumps) {
    const g = ctx.createRadialGradient(x + ox - 2, y + oy - 3, 1, x + ox, y + oy, r);
    g.addColorStop(0, alive ? "#3f7a38" : "#485842");
    g.addColorStop(1, alive ? "#274d22" : "#37452f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (alive) {
    const n = Math.min(bush.berries, 5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.5;
      const bx = x + Math.cos(a) * 7;
      const by = y - 4 + Math.sin(a) * 5;
      ctx.fillStyle = "#c42a5a";
      ctx.beginPath();
      ctx.arc(bx, by, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(bx - 0.8, by - 0.8, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCampfire(
  ctx: CanvasRenderingContext2D,
  fire: Campfire,
  cam: Camera,
  time: number,
): void {
  const x = fire.pos.x - cam.x;
  const y = fire.pos.y - cam.y;

  drawShadow(ctx, x, y + 6, 17, 7);

  // Чулуун хүрээ
  ctx.fillStyle = "#6a6558";
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 15, y + Math.sin(a) * 7 + 3, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Түлээний гуалин
  ctx.strokeStyle = "#5a3a20";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 4);
  ctx.lineTo(x + 9, y - 2);
  ctx.moveTo(x - 9, y - 2);
  ctx.lineTo(x + 9, y + 4);
  ctx.stroke();

  if (fire.lit) {
    const f1 = 1 + Math.sin(time * 11) * 0.15;
    const f2 = 1 + Math.sin(time * 17 + 2) * 0.2;

    // Гадна дөл
    const outer = ctx.createLinearGradient(x, y - 26 * f1, x, y + 2);
    outer.addColorStop(0, "rgba(255,120,30,0.15)");
    outer.addColorStop(0.4, "#ff8c2a");
    outer.addColorStop(1, "#d84a10");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(x, y - 26 * f1);
    ctx.quadraticCurveTo(x + 11, y - 8, x + 8, y + 2);
    ctx.lineTo(x - 8, y + 2);
    ctx.quadraticCurveTo(x - 11, y - 8, x, y - 26 * f1);
    ctx.fill();

    // Дотор дөл
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.moveTo(x, y - 14 * f2);
    ctx.quadraticCurveTo(x + 5, y - 4, x + 4, y + 1);
    ctx.lineTo(x - 4, y + 1);
    ctx.quadraticCurveTo(x - 5, y - 4, x, y - 14 * f2);
    ctx.fill();

    // Газрын гэрэлт толбо
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 42);
    glow.addColorStop(0, "rgba(255,150,50,0.28)");
    glow.addColorStop(1, "rgba(255,150,50,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 42, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSheep(
  ctx: CanvasRenderingContext2D,
  sheep: Sheep,
  cam: Camera,
  time: number,
): void {
  const x = sheep.pos.x - cam.x;
  const y = sheep.pos.y - cam.y;
  const flip = sheep.face;
  const moving = Math.hypot(sheep.vel.x, sheep.vel.y) > 6;
  const walk = moving ? Math.sin(time * 10 + sheep.id) * 2 : 0;
  const graze =
    !moving && Math.sin(time * 0.6 + sheep.grazeSeed) > 0.4 ? 3.5 : 0;

  drawShadow(ctx, x, y + 8, 11, 4);

  // Хөл
  ctx.strokeStyle = "#8a7f70";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 3);
  ctx.lineTo(x - 6 + walk * 0.4, y + 9);
  ctx.moveTo(x + 5, y + 3);
  ctx.lineTo(x + 5 - walk * 0.4, y + 9);
  ctx.stroke();

  // Ноосон бие
  const wool = ctx.createRadialGradient(x - 3, y - 4, 2, x, y, 13);
  wool.addColorStop(0, "#fbf7ee");
  wool.addColorStop(1, "#ddd4c4");
  ctx.fillStyle = wool;
  ctx.beginPath();
  ctx.ellipse(x, y, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ноосны овгор
  for (const [ox, oy, r] of [
    [-7, -4, 4.5],
    [-1, -6, 5],
    [5, -4, 4.5],
  ] as Array<[number, number, number]>) {
    ctx.beginPath();
    ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Толгой
  const hx = x + 9 * flip;
  const hy = y - 1 + graze;
  ctx.fillStyle = "#c9bfae";
  ctx.beginPath();
  ctx.ellipse(hx, hy, 5, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Чих
  ctx.fillStyle = "#b5a892";
  ctx.beginPath();
  ctx.ellipse(hx - 3 * flip, hy - 3, 2.6, 1.4, -0.5 * flip, 0, Math.PI * 2);
  ctx.fill();
  // Нүд
  ctx.fillStyle = "#332a20";
  ctx.beginPath();
  ctx.arc(hx + 1.8 * flip, hy - 1, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Хазуулсны анивчилт
  if (sheep.flash > 0) {
    ctx.fillStyle = `rgba(255,90,90,${Math.min(1, sheep.flash * 4)})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Хазуулсан хонины амь
  if (sheep.hp < 3) {
    const bw = 18;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - 18, bw, 3.5, 1.5);
    ctx.fill();
    ctx.fillStyle = "#8fd08f";
    roundRectPath(ctx, x - bw / 2, y - 18, (bw * sheep.hp) / 3, 3.5, 1.5);
    ctx.fill();
  }
}

function drawWolf(
  ctx: CanvasRenderingContext2D,
  wolf: Wolf,
  cam: Camera,
  time: number,
): void {
  const x = wolf.pos.x - cam.x;
  const y = wolf.pos.y - cam.y;
  const flip = wolf.face;
  const run = Math.sin(time * 14 + wolf.id) * 3;
  const s = wolf.scale;

  drawShadow(ctx, x, y + 9 * s, 15 * s, 5 * s);

  // Түвшингээр томорсон чоныг scale-тэй зурна
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // Хөл
  ctx.strokeStyle = "#3f3f42";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-9, 4);
  ctx.lineTo(-9 + run, 10);
  ctx.moveTo(-3, 5);
  ctx.lineTo(-3 - run, 10);
  ctx.moveTo(4, 5);
  ctx.lineTo(4 + run, 10);
  ctx.moveTo(9, 4);
  ctx.lineTo(9 - run, 10);
  ctx.stroke();

  // Сүүл
  ctx.strokeStyle = "#4a4a4e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-13 * flip, 0);
  ctx.quadraticCurveTo(
    -19 * flip,
    -3 + Math.sin(time * 6) * 2,
    -22 * flip,
    -7,
  );
  ctx.stroke();

  // Бие
  const body = ctx.createLinearGradient(0, -8, 0, 6);
  body.addColorStop(0, "#6a6a70");
  body.addColorStop(1, "#45454a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Толгой + хоншоор
  const hx = 12 * flip;
  ctx.fillStyle = "#5a5a60";
  ctx.beginPath();
  ctx.ellipse(hx, -3, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a4a4e";
  ctx.beginPath();
  ctx.ellipse(hx + 5 * flip, -1.5, 4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Хамар
  ctx.fillStyle = "#1a1a1c";
  ctx.beginPath();
  ctx.arc(hx + 8.5 * flip, -1.8, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // Чих
  ctx.fillStyle = "#3f3f44";
  ctx.beginPath();
  ctx.moveTo(hx - 3 * flip, -7);
  ctx.lineTo(hx - 1 * flip, -13);
  ctx.lineTo(hx + 2 * flip, -8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + 1 * flip, -8);
  ctx.lineTo(hx + 4 * flip, -12);
  ctx.lineTo(hx + 6 * flip, -6);
  ctx.closePath();
  ctx.fill();
  // Улаан нүд
  ctx.fillStyle = "#ff3030";
  ctx.beginPath();
  ctx.arc(hx + 2 * flip, -4.5, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Цохиулсан анивчилт
  if (wolf.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${wolf.flash * 5})`;
    ctx.beginPath();
    ctx.ellipse(0, -1, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (wolf.hp < wolf.maxHp) {
    const bw = 24 * s;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, x - bw / 2, y - 20 * s, bw, 4, 2);
    ctx.fill();
    ctx.fillStyle = "#e05050";
    roundRectPath(
      ctx,
      x - bw / 2,
      y - 20 * s,
      (bw * wolf.hp) / wolf.maxHp,
      4,
      2,
    );
    ctx.fill();
  }
}

function drawThief(
  ctx: CanvasRenderingContext2D,
  thief: Thief,
  cam: Camera,
  time: number,
): void {
  const x = thief.pos.x - cam.x;
  const y = thief.pos.y - cam.y;
  const flip = thief.face;
  const run = Math.sin(time * 13 + thief.id) * 3;

  drawShadow(ctx, x, y + 11, 10, 4);

  // Хөл
  ctx.strokeStyle = "#2a2020";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 4);
  ctx.lineTo(x - 3 + run, y + 11);
  ctx.moveTo(x + 3, y + 4);
  ctx.lineTo(x + 3 - run, y + 11);
  ctx.stroke();

  // Уут (хулгайлсан хонь)
  if (thief.stolen > 0) {
    ctx.fillStyle = "#7a5c3a";
    ctx.beginPath();
    ctx.ellipse(x - 10 * flip, y - 6, 8, 9, 0.3 * flip, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a3820";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Хонины толгой цухуйна
    ctx.fillStyle = "#e8e0d0";
    ctx.beginPath();
    ctx.arc(x - 10 * flip, y - 14, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Дээл (хар хүрэн)
  const deel = ctx.createLinearGradient(x, y - 8, x, y + 6);
  deel.addColorStop(0, "#4a3020");
  deel.addColorStop(1, "#332015");
  ctx.fillStyle = deel;
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 8.5, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Бүс
  ctx.strokeStyle = "#8a2020";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + 8, y);
  ctx.stroke();

  // Толгой — нүүр далдалсан алчуур
  ctx.fillStyle = "#c4a574";
  ctx.beginPath();
  ctx.arc(x, y - 13, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1010";
  ctx.fillRect(x - 5.5, y - 15, 11, 4);
  // Малгай
  ctx.fillStyle = "#2a1a12";
  ctx.beginPath();
  ctx.arc(x, y - 16, 5.5, Math.PI, 0);
  ctx.fill();

  if (thief.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${thief.flash * 5})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Хулгайлсан тоо
  ctx.fillStyle = "#ffd0d0";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`−${thief.stolen}`, x, y - 25);
  ctx.textAlign = "left";

  const bw = 22;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRectPath(ctx, x - bw / 2, y + 14, bw, 4, 2);
  ctx.fill();
  ctx.fillStyle = "#50a0e0";
  roundRectPath(ctx, x - bw / 2, y + 14, (bw * thief.hp) / thief.maxHp, 4, 2);
  ctx.fill();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
  time: number,
): void {
  const x = player.pos.x - cam.x;
  const y = player.pos.y - cam.y;
  const flip = player.facing.x < 0 ? -1 : 1;
  const walk = player.moving ? Math.sin(time * 11) * 3 : 0;
  const bob = player.moving ? Math.abs(Math.sin(time * 11)) * 1.5 : Math.sin(time * 2) * 0.6;

  // Хамгаалалттай үед анивчина
  if (player.invuln > 0 && Math.floor(time * 14) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  drawShadow(ctx, x, y + 12, 11, 4.5);

  // Хөл (гутал)
  ctx.strokeStyle = "#2a2a30";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(x - 3.5, y + 4);
  ctx.lineTo(x - 3.5 + walk, y + 12);
  ctx.moveTo(x + 3.5, y + 4);
  ctx.lineTo(x + 3.5 - walk, y + 12);
  ctx.stroke();

  // Дээл — хөх торгон, градиенттай
  const deel = ctx.createLinearGradient(x - 8, y - 10, x + 8, y + 6);
  deel.addColorStop(0, "#3a62a0");
  deel.addColorStop(1, "#24457a");
  ctx.fillStyle = deel;
  ctx.beginPath();
  ctx.ellipse(x, y - 2 - bob * 0.4, 9.5, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Энгэрийн эмжээр
  ctx.strokeStyle = "#e8c56a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 1 * flip, y - 11);
  ctx.quadraticCurveTo(x + 7 * flip, y - 6, x + 5 * flip, y + 2);
  ctx.stroke();
  // Улбар шар бүс
  ctx.strokeStyle = "#d88a2a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 1);
  ctx.lineTo(x + 9, y + 1);
  ctx.stroke();

  // Толгой
  ctx.fillStyle = "#d8b088";
  ctx.beginPath();
  ctx.arc(x, y - 15 - bob, 6, 0, Math.PI * 2);
  ctx.fill();
  // Нүд
  ctx.fillStyle = "#2a2018";
  ctx.beginPath();
  ctx.arc(x + 2.4 * flip, y - 15.5 - bob, 1, 0, Math.PI * 2);
  ctx.fill();

  // Лоовууз малгай
  ctx.fillStyle = "#8a2020";
  ctx.beginPath();
  ctx.arc(x, y - 18 - bob, 6.2, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#6a1515";
  roundRectPath(ctx, x - 6.5, y - 19.5 - bob, 13, 3, 1.5);
  ctx.fill();
  // Оройн товгор
  ctx.fillStyle = "#e8c56a";
  ctx.beginPath();
  ctx.arc(x, y - 24 - bob, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Таяг
  const ang = Math.atan2(player.facing.y, player.facing.x);
  let staffAng = ang;
  if (player.attackAnim > 0) {
    const p = 1 - player.attackAnim / 0.22;
    staffAng = ang + lerp(-1.3, 1.3, p);
  }
  const hx = x + Math.cos(staffAng + 0.5) * 8;
  const hy = y - 4 + Math.sin(staffAng + 0.5) * 6;
  ctx.strokeStyle = "#9a6a34";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + Math.cos(staffAng) * 26, hy + Math.sin(staffAng) * 26);
  ctx.stroke();
  // Таягны толгой
  ctx.fillStyle = "#c9a227";
  ctx.beginPath();
  ctx.arc(
    hx + Math.cos(staffAng) * 26,
    hy + Math.sin(staffAng) * 26,
    2.6,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Цохилтын арк
  if (player.attackAnim > 0) {
    const p = 1 - player.attackAnim / 0.22;
    ctx.strokeStyle = `rgba(255,240,180,${0.7 * (1 - p)})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - 2, 38, ang - 1.1 + p * 1.4, ang - 0.5 + p * 1.6);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Overlays & HUD
// ---------------------------------------------------------------------------

/** Өдрийн цагаас хамаарсан тинт (r,g,b,a) */
function skyTint(hour: number): [number, number, number, number] {
  const keys: Array<[number, [number, number, number, number]]> = [
    [0, [10, 16, 48, 0.6]],
    [5, [10, 16, 48, 0.6]],
    [6.5, [255, 150, 60, 0.16]],
    [8, [0, 0, 0, 0]],
    [18, [0, 0, 0, 0]],
    [19.5, [255, 120, 50, 0.18]],
    [21, [10, 16, 48, 0.6]],
    [24, [10, 16, 48, 0.6]],
  ];
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, c0] = keys[i];
    const [h1, c1] = keys[i + 1];
    if (hour >= h0 && hour <= h1) {
      const t = h1 === h0 ? 0 : (hour - h0) / (h1 - h0);
      return [
        lerp(c0[0], c1[0], t),
        lerp(c0[1], c1[1], t),
        lerp(c0[2], c1[2], t),
        lerp(c0[3], c1[3], t),
      ];
    }
  }
  return [0, 0, 0, 0];
}

function drawLighting(
  ctx: CanvasRenderingContext2D,
  lightCanvas: HTMLCanvasElement,
  state: GameState,
  cam: Camera,
  time: number,
): void {
  const [r, g, b, a] = skyTint(state.world.timeOfDay);
  if (a <= 0.02) return;

  const fire = state.world.campfire;

  if (a < 0.3 || !fire.lit) {
    // Энгийн тинт (гэрлийн нүх шаардлагагүй үед мөн адил, гэхдээ галтай бол нүхлэх)
    if (!fire.lit) {
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      return;
    }
  }

  const lc = lightCanvas.getContext("2d")!;
  lc.clearRect(0, 0, VIEW_W, VIEW_H);
  lc.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  lc.fillRect(0, 0, VIEW_W, VIEW_H);

  lc.globalCompositeOperation = "destination-out";

  if (fire.lit) {
    const fx = fire.pos.x - cam.x;
    const fy = fire.pos.y - cam.y;
    const rad = 150 * (1 + Math.sin(time * 9) * 0.05);
    const fg = lc.createRadialGradient(fx, fy, 8, fx, fy, rad);
    fg.addColorStop(0, "rgba(0,0,0,0.95)");
    fg.addColorStop(0.6, "rgba(0,0,0,0.5)");
    fg.addColorStop(1, "rgba(0,0,0,0)");
    lc.fillStyle = fg;
    lc.beginPath();
    lc.arc(fx, fy, rad, 0, Math.PI * 2);
    lc.fill();
  }

  // Тоглогчийн эргэн тойрны бүдэг гэрэл
  const px = state.player.pos.x - cam.x;
  const py = state.player.pos.y - cam.y;
  const pg = lc.createRadialGradient(px, py, 4, px, py, 80);
  pg.addColorStop(0, "rgba(0,0,0,0.4)");
  pg.addColorStop(1, "rgba(0,0,0,0)");
  lc.fillStyle = pg;
  lc.beginPath();
  lc.arc(px, py, 80, 0, Math.PI * 2);
  lc.fill();

  lc.globalCompositeOperation = "source-over";
  ctx.drawImage(lightCanvas, 0, 0, VIEW_W, VIEW_H);
}

function drawWeatherFx(
  ctx: CanvasRenderingContext2D,
  world: World,
  time: number,
): void {
  if (world.weather === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 90; i++) {
      const drift = Math.sin(time * 1.5 + i) * 24;
      const sx = ((i * 97 + time * 40 + drift) % (VIEW_W + 40)) - 20;
      const sy = ((i * 53 + time * 90) % (VIEW_H + 40)) - 20;
      const s = 1.2 + (i % 3);
      ctx.globalAlpha = 0.4 + (i % 5) * 0.12;
      ctx.beginPath();
      ctx.arc(sx, sy, s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (world.weather === "storm") {
    ctx.fillStyle = "rgba(20,30,50,0.16)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.strokeStyle = "rgba(180,200,230,0.5)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const sx = ((i * 137 + time * 500) % (VIEW_W + 60)) - 30;
      const sy = ((i * 71 + time * 620) % (VIEW_H + 40)) - 20;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 4, sy + 12);
    }
    ctx.stroke();
  }
}

function drawBarFancy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  color: string,
  label: string,
): void {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();

  const fillW = w * clamp(ratio, 0, 1);
  if (fillW > h / 2) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, color);
    g.addColorStop(1, shade(color, -30));
    ctx.fillStyle = g;
    roundRectPath(ctx, x, y, fillW, h, h / 2);
    ctx.fill();
    // Гялбаа
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundRectPath(ctx, x + 2, y + 1.5, Math.max(2, fillW - 4), h * 0.35, h * 0.2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.stroke();

  ctx.fillStyle = COLORS.hudText;
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText(label, x + 1, y - 4);
}

/** Hex өнгийг гэрэлтүүлэх/бараанруулах */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function drawWeatherIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  weather: WeatherKind,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = COLORS.hudAccent;
  ctx.fillStyle = COLORS.hudAccent;
  ctx.lineWidth = 1.5;

  if (weather === "clear") {
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5);
      ctx.stroke();
    }
  } else if (weather === "wind") {
    for (const oy of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.moveTo(-8, oy);
      ctx.quadraticCurveTo(0, oy - 3, 8, oy);
      ctx.stroke();
    }
  } else if (weather === "storm") {
    ctx.beginPath();
    ctx.arc(-3, -2, 4, 0, Math.PI * 2);
    ctx.arc(3, -2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(-6, 9);
    ctx.moveTo(1, 4);
    ctx.lineTo(-1, 9);
    ctx.moveTo(6, 4);
    ctx.lineTo(4, 9);
    ctx.stroke();
  } else {
    // snow
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -7, Math.sin(a) * -7);
      ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  const mw = 150;
  const mh = 100;
  const mx = VIEW_W - mw - 14;
  const my = VIEW_H - mh - 14;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;

  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, mx - 4, my - 4, mw + 8, mh + 8, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.3)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, mx - 4, my - 4, mw + 8, mh + 8, 6);
  ctx.stroke();

  ctx.fillStyle = "rgba(70,110,60,0.5)";
  ctx.fillRect(mx, my, mw, mh);

  // Гэр
  ctx.fillStyle = "#e8c56a";
  ctx.fillRect(mx + (WORLD_W / 2) * sx - 2, my + (WORLD_H / 2) * sy - 2, 4, 4);

  // Хонь
  ctx.fillStyle = "#f0ebe3";
  for (const s of state.world.flock.visuals) {
    ctx.fillRect(mx + s.pos.x * sx - 1, my + s.pos.y * sy - 1, 2, 2);
  }
  // Чоно
  ctx.fillStyle = "#ff5050";
  for (const w of state.world.wolves) {
    ctx.fillRect(mx + w.pos.x * sx - 1.5, my + w.pos.y * sy - 1.5, 3, 3);
  }
  // Хулгайч
  ctx.fillStyle = "#c080ff";
  for (const t of state.world.thieves) {
    ctx.fillRect(mx + t.pos.x * sx - 1.5, my + t.pos.y * sy - 1.5, 3, 3);
  }
  // Тоглогч
  ctx.fillStyle = "#60c0ff";
  ctx.fillRect(
    mx + state.player.pos.x * sx - 2,
    my + state.player.pos.y * sy - 2,
    4,
    4,
  );

  // Камерын харах хүрээ
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(mx + cam.x * sx, my + cam.y * sy, VIEW_W * sx, VIEW_H * sy);
}

function drawThreatArrows(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  const threats: Array<{ pos: Vector2; color: string }> = [];
  for (const w of state.world.wolves)
    threats.push({ pos: w.pos, color: "#ff5050" });
  for (const t of state.world.thieves)
    threats.push({ pos: t.pos, color: "#c080ff" });

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

function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { player, world } = state;
  const pad = 14;

  // Зүүн дээд самбар
  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, pad, pad, 296, 218, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.3)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, pad, pad, 296, 218, 10);
  ctx.stroke();

  drawBarFancy(
    ctx,
    pad + 14,
    pad + 26,
    266,
    12,
    player.vitals.health / player.vitals.maxHealth,
    "#d64545",
    `Амьдрал ${Math.ceil(player.vitals.health)}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 58,
    266,
    12,
    player.vitals.hunger / player.vitals.maxHunger,
    "#c4a035",
    `Өлсгөлөн ${Math.ceil(player.vitals.hunger)}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 90,
    266,
    12,
    player.vitals.warmth / player.vitals.maxWarmth,
    "#ff9f5a",
    `Дулаан ${Math.ceil(player.vitals.warmth)}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 122,
    266,
    12,
    world.flock.total / WIN_SHEEP,
    "#d4c4a0",
    `Хонь ${world.flock.total} / ${WIN_SHEEP}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 154,
    266,
    12,
    clamp(state.xp / state.xpNext, 0, 1),
    "#9060d0",
    `Түвшин ${state.level} · XP ${Math.floor(state.xp)} / ${state.xpNext}`,
  );

  // Нөөц
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillStyle = "#c49a6c";
  ctx.fillText(`🪵 ${player.inventory.wood}`, pad + 14, pad + 198);
  ctx.fillStyle = "#e890b0";
  ctx.fillText(`🍒 ${player.inventory.berries}`, pad + 80, pad + 198);
  ctx.fillStyle = COLORS.hudAccent;
  ctx.fillText(`Өдөр ${world.dayNumber}`, pad + 150, pad + 198);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.fillText(`Оноо ${state.score}`, pad + 218, pad + 198);

  // Баруун дээд: цаг агаар
  const panelW = 196;
  const rx = VIEW_W - panelW - pad;
  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, rx, pad, panelW, 58, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.3)";
  roundRectPath(ctx, rx, pad, panelW, 58, 10);
  ctx.stroke();

  drawWeatherIcon(ctx, rx + 22, pad + 29, world.weather);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(weatherLabel(world.weather, world.season), rx + 40, pad + 24);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(
    `Цаг ${formatClock(world.timeOfDay)} ${isNight(world) ? "🌙" : "☀️"}`,
    rx + 40,
    pad + 44,
  );

  // Аюулын мэдээлэл
  if (world.wolves.length > 0 || world.thieves.length > 0) {
    const parts: string[] = [];
    if (world.wolves.length) parts.push(`Чоно ${world.wolves.length}`);
    if (world.thieves.length) {
      const stolen = world.thieves.reduce((s, t) => s + t.stolen, 0);
      parts.push(`Хулгайч (−${stolen} хонь)`);
    }
    const text = parts.join("  ·  ");
    ctx.font = "600 13px system-ui, sans-serif";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(120,20,20,0.8)";
    roundRectPath(ctx, VIEW_W / 2 - tw / 2 - 14, pad, tw + 28, 30, 15);
    ctx.fill();
    ctx.fillStyle = "#ffc0c0";
    ctx.fillText(text, VIEW_W / 2 - tw / 2, pad + 20);
  }

  // Мессеж
  if (state.messageTimer > 0 && state.message && state.phase === "playing") {
    const alpha = clamp(state.messageTimer / 0.4, 0, 1);
    ctx.font = "14px system-ui, sans-serif";
    const tw = ctx.measureText(state.message).width;
    const mx = (VIEW_W - tw) / 2 - 14;
    const my = VIEW_H - 46;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(12,10,8,0.78)";
    roundRectPath(ctx, mx, my, tw + 28, 30, 15);
    ctx.fill();
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText(state.message, mx + 14, my + 20);
    ctx.globalAlpha = 1;
  }

  // Түвшин ахих — ур чадвар сонгох дэлгэц
  if (state.phase === "levelup") {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#c0a0ff";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.fillText(`ТҮВШИН ${state.level}!`, VIEW_W / 2, 120);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText("Ур чадвараа сонго — 1, 2, 3 товч дар", VIEW_W / 2, 152);

    const cardW = 240;
    const cardH = 130;
    const gap = 24;
    const x0 = (VIEW_W - (cardW * 3 + gap * 2)) / 2;
    const y0 = 195;

    state.skillChoices.forEach((skill, i) => {
      const cx = x0 + i * (cardW + gap);
      ctx.fillStyle = "rgba(25,20,35,0.92)";
      roundRectPath(ctx, cx, y0, cardW, cardH, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(192,160,255,0.5)";
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, cx, y0, cardW, cardH, 12);
      ctx.stroke();

      ctx.fillStyle = "#9060d0";
      ctx.beginPath();
      ctx.arc(cx + cardW / 2, y0 + 32, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.fillText(String(i + 1), cx + cardW / 2, y0 + 37);

      ctx.fillStyle = COLORS.hudAccent;
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText(skill.name, cx + cardW / 2, y0 + 76);
      ctx.fillStyle = COLORS.hudMuted;
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(skill.desc, cx + cardW / 2, y0 + 100);
    });
    ctx.textAlign = "left";
  }

  // Төгсгөлийн дэлгэц
  if (state.phase === "won" || state.phase === "lost") {
    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = "center";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillStyle = state.phase === "won" ? "#e8c56a" : "#ff6b6b";
    ctx.fillText(
      state.phase === "won" ? "ЯЛАЛТ!" : "ЯЛАГДЛАА",
      VIEW_W / 2,
      VIEW_H / 2 - 30,
    );

    ctx.fillStyle = COLORS.hudText;
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(
      state.phase === "won"
        ? `${WIN_SHEEP} хоньтой сүрэг бүрдүүллээ!`
        : state.message,
      VIEW_W / 2,
      VIEW_H / 2 + 8,
    );
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(
      `Түвшин: ${state.level} · Өдөр: ${state.world.dayNumber} · Хонь: ${state.world.flock.total} · Оноо: ${state.score}`,
      VIEW_W / 2,
      VIEW_H / 2 + 36,
    );
    ctx.fillStyle = COLORS.hudAccent;
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillText("R — дахин эхлэх", VIEW_W / 2, VIEW_H / 2 + 70);
    ctx.textAlign = "left";
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  terrain: HTMLCanvasElement;
  terrainWinter: HTMLCanvasElement;
  lightCanvas: HTMLCanvasElement;
  vignette: HTMLCanvasElement;
}

function makeVignette(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = VIEW_W;
  c.height = VIEW_H;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.45,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.95,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(10,10,20,0.4)");
  g.fillStyle = grad;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  return c;
}

function getCamera(state: GameState): Camera {
  const shake = state.fx.shake;
  return {
    x:
      clamp(state.player.pos.x - VIEW_W / 2, 0, WORLD_W - VIEW_W) +
      (shake > 0 ? randRange(-shake, shake) : 0),
    y:
      clamp(state.player.pos.y - VIEW_H / 2, 0, WORLD_H - VIEW_H) +
      (shake > 0 ? randRange(-shake, shake) : 0),
  };
}

function render(rc: RenderContext, state: GameState, time: number): void {
  const { ctx } = rc;
  const cam = getCamera(state);
  const world = state.world;

  // Газар
  const terrain =
    world.season === "winter" ? rc.terrainWinter : rc.terrain;
  ctx.drawImage(
    terrain,
    cam.x,
    cam.y,
    VIEW_W,
    VIEW_H,
    0,
    0,
    VIEW_W,
    VIEW_H,
  );

  // Салхины хүч (модны найгалт)
  const windAmp =
    world.weather === "storm"
      ? 5
      : world.weather === "wind"
        ? 3
        : world.weather === "snow"
          ? 2
          : 1;

  // Гүнээр эрэмбэлсэн объектууд.
  // key — тогтвортой хоёрдогч эрэмбэ: ойролцоо y-тэй объектууд давхцахад
  // зурах дараалал frame бүр солигдож анивчихаас сэргийлнэ.
  type Drawable = { y: number; key: number; draw: () => void };
  const drawables: Drawable[] = [];

  const center = pastureCenter(world);
  drawables.push({
    y: center.y - 20,
    key: -2,
    draw: () => drawGer(ctx, center.x - 46 - cam.x, center.y - 26 - cam.y),
  });

  for (const tree of world.trees) {
    drawables.push({
      y: tree.pos.y,
      key: tree.id,
      draw: () => drawTree(ctx, tree, cam, time, windAmp),
    });
  }
  for (const bush of world.bushes) {
    drawables.push({
      y: bush.pos.y,
      key: 1000 + bush.id,
      draw: () => drawBerryBush(ctx, bush, cam),
    });
  }
  drawables.push({
    y: world.campfire.pos.y,
    key: -1,
    draw: () => drawCampfire(ctx, world.campfire, cam, time),
  });
  for (const sheep of world.flock.visuals) {
    drawables.push({
      y: sheep.pos.y,
      key: 2000 + sheep.id,
      draw: () => drawSheep(ctx, sheep, cam, time),
    });
  }
  for (const wolf of world.wolves) {
    drawables.push({
      y: wolf.pos.y,
      key: 2000 + wolf.id,
      draw: () => drawWolf(ctx, wolf, cam, time),
    });
  }
  for (const thief of world.thieves) {
    drawables.push({
      y: thief.pos.y,
      key: 2000 + thief.id,
      draw: () => drawThief(ctx, thief, cam, time),
    });
  }
  drawables.push({
    y: state.player.pos.y,
    key: Number.MAX_SAFE_INTEGER,
    draw: () => drawPlayer(ctx, state.player, cam, time),
  });

  drawables.sort(
    (a, b) => Math.round(a.y) - Math.round(b.y) || a.key - b.key,
  );
  for (const d of drawables) d.draw();

  // Particles
  for (const p of state.fx.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x - cam.x, p.pos.y - cam.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Хөвөгч текст
  for (const t of state.fx.texts) {
    const a = clamp(t.life / t.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 3;
    ctx.textAlign = "center";
    ctx.strokeText(t.text, t.pos.x - cam.x, t.pos.y - cam.y - 20);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.pos.x - cam.x, t.pos.y - cam.y - 20);
    ctx.textAlign = "left";
  }
  ctx.globalAlpha = 1;

  // Гэрэлтүүлэг + цаг агаар
  drawLighting(ctx, rc.lightCanvas, state, cam, time);
  drawWeatherFx(ctx, world, time);

  // Vignette
  ctx.drawImage(rc.vignette, 0, 0, VIEW_W, VIEW_H);

  // Цохиулах улаан ирмэг
  if (state.fx.hurtFlash > 0) {
    const a = state.fx.hurtFlash * 0.35;
    const g = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.3,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.8,
    );
    g.addColorStop(0, "rgba(200,30,30,0)");
    g.addColorStop(1, `rgba(200,30,30,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawThreatArrows(ctx, state, cam);
  drawMinimap(ctx, state, cam);
  drawHud(ctx, state);
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

export interface HerderGameHandle {
  destroy: () => void;
}

/** Canvas дээр тоглоом эхлүүлнэ. Unmount үед destroy() дуудна. */
export function mountHerderGame(canvas: HTMLCanvasElement): HerderGameHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context дэмжигдэхгүй");

  // Retina дэмжлэг
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  canvas.style.width = "960px";
  canvas.style.height = "auto";
  canvas.style.aspectRatio = `${VIEW_W} / ${VIEW_H}`;
  ctx.scale(dpr, dpr);

  const rc: RenderContext = {
    ctx,
    terrain: renderTerrain(false),
    terrainWinter: renderTerrain(true),
    lightCanvas: (() => {
      const c = document.createElement("canvas");
      c.width = VIEW_W;
      c.height = VIEW_H;
      return c;
    })(),
    vignette: makeVignette(),
  };

  let state = createInitialState();
  const unbindInput = bindInput(() => state.input);

  let last = performance.now();
  let raf = 0;
  let alive = true;

  const frame = (now: number): void => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (state.input.restart) {
      if (state.phase !== "playing") {
        state = createInitialState();
      }
      state.input.restart = false;
    }

    update(state, dt);
    render(rc, state, now / 1000);
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);

  return {
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      unbindInput();
    },
  };
}
