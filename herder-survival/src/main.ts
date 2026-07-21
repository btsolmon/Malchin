/**
 * Малчин — Survival + Herding Prototype
 * Vite + Vanilla TypeScript + HTML5 Canvas
 *
 * v0.2:
 *  - 10 хоньтой эхэлнэ → 1000 хүрвэл ялна
 *  - Өдөр бүр мал үржинэ
 *  - Чоно мал руу дайрна — тулалдаж хамгаална
 *  - Малын хулгайч мал авч зугтана — гүйцэж буцааж авна
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WeatherKind = "clear" | "wind" | "storm" | "snow";
type Season = "summer" | "autumn" | "winter" | "spring";
type GamePhase = "playing" | "won" | "lost";

interface Vector2 {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
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

/** Жимсний бут — түүж идэж болно */
interface BerryBush {
  id: number;
  pos: Vector2;
  berries: number;
  maxBerries: number;
  radius: number;
  /** Хоосон үед дахин ургах хугацаа */
  respawnIn: number;
}

interface Campfire {
  pos: Vector2;
  lit: boolean;
  fuel: number;
  radius: number;
}

/** Харагдах хонь (сүргийн төлөөлөл — жинхэнэ тоо flock.total) */
interface Sheep {
  id: number;
  pos: Vector2;
  vel: Vector2;
  radius: number;
}

interface Flock {
  /** Жинхэнэ малын тоо (ялалтын нөхцөл) */
  total: number;
  /** Дэлгэц дээрх төлөөлөх хоньнууд */
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
  /** Хулгайлсан хонь */
  stolen: number;
  /** Зугтах чиглэлийн зорилтот цэг (газрын ирмэг) */
  escapeTarget: Vector2;
  fleeing: boolean;
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
  /** Дараагийн чоны raid хүртэлх хугацаа */
  nextWolfIn: number;
  /** Дараагийн хулгайч хүртэлх хугацаа */
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
}

interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  tileSize: number;
}

interface GameState {
  player: Player;
  world: World;
  input: InputState;
  message: string;
  messageTimer: number;
  score: number;
  phase: GamePhase;
  nextEntityId: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIG: GameConfig = {
  canvasWidth: 960,
  canvasHeight: 540,
  tileSize: 32,
};

const WORLD_W = 2400;
const WORLD_H = 1600;
const START_SHEEP = 10;
const WIN_SHEEP = 1000;
/** Дэлгэц дээр хамгийн ихдээ хэдэн хонь зурах */
const MAX_VISUAL_SHEEP = 36;
const PASTURE_RADIUS = 160;

const COLORS = {
  grassA: "#3d6b3a",
  grassB: "#355f33",
  dirt: "#6b5340",
  treeTrunk: "#5c3d22",
  treeLeaf: "#2f7a3a",
  treeStump: "#4a3828",
  player: "#c4a574",
  playerCoat: "#2a4a6e",
  campfireOff: "#3a3028",
  campfireOn: "#ff8c2a",
  flame: "#ffe066",
  sheep: "#f0ebe3",
  sheepHead: "#d8d0c4",
  wolf: "#5a5a5a",
  wolfEye: "#ff3030",
  thief: "#4a3020",
  thiefHat: "#1a1010",
  hudBg: "rgba(12, 10, 8, 0.72)",
  hudText: "#f2e8d5",
  hudAccent: "#e8c56a",
  warmth: "#ff9f5a",
  hunger: "#c4a035",
  health: "#d64545",
  wood: "#c49a6c",
  berry: "#c42a5a",
  bush: "#2d5a28",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
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
    storm: "Шуурга",
    snow: "Цас",
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
    } while (dist(pos, center) < 200 && attempts < 40);

    trees.push({
      id: i,
      pos,
      hp: 3,
      maxHp: 3,
      radius: 18,
      respawnIn: 0,
    });
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
    } while (dist(pos, center) < 120 && attempts < 40);

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
      pos: { ...spawn },
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
      facing: { x: 0, y: 1 },
    },
    world: {
      width: WORLD_W,
      height: WORLD_H,
      trees: createTrees(40),
      bushes: createBushes(28),
      campfire: {
        pos: { x: spawn.x + 48, y: spawn.y },
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
    },
    message: `10 хоньтой эхэллээ. Жимс түүж өлсгөлөнгөө дарна.`,
    messageTimer: 5,
    score: 0,
    phase: "playing",
    nextEntityId: 100,
  };

  syncVisualFlock(state);
  return state;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function bindInput(input: InputState): void {
  const setKey = (code: string, pressed: boolean): void => {
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
    }
  };

  window.addEventListener("keydown", (e) => {
    setKey(e.code, true);
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    ) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => setKey(e.code, false));
}

// ---------------------------------------------------------------------------
// Spawning threats
// ---------------------------------------------------------------------------

function spawnWolf(state: GameState): void {
  const edge = Math.floor(Math.random() * 4);
  let pos: Vector2;
  if (edge === 0) pos = { x: randRange(40, WORLD_W - 40), y: 40 };
  else if (edge === 1) pos = { x: randRange(40, WORLD_W - 40), y: WORLD_H - 40 };
  else if (edge === 2) pos = { x: 40, y: randRange(40, WORLD_H - 40) };
  else pos = { x: WORLD_W - 40, y: randRange(40, WORLD_H - 40) };

  const night = state.world.timeOfDay < 6 || state.world.timeOfDay > 19;
  state.world.wolves.push({
    id: allocId(state),
    pos,
    vel: { x: 0, y: 0 },
    hp: night ? 45 : 30,
    maxHp: night ? 45 : 30,
    radius: 14,
    speed: night ? 115 : 95,
    attackCooldown: 0,
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

  // Зугтах ирмэг
  const escapeAng = Math.atan2(pos.y - center.y, pos.x - center.x);
  const escapeTarget: Vector2 = {
    x: clamp(center.x + Math.cos(escapeAng) * 1400, 20, WORLD_W - 20),
    y: clamp(center.y + Math.sin(escapeAng) * 1400, 20, WORLD_H - 20),
  };

  const stealWant = clamp(2 + Math.floor(Math.random() * 4), 1, 8);
  const stolen = loseSheep(state, stealWant);
  if (stolen <= 0) return;

  state.world.thieves.push({
    id: allocId(state),
    pos,
    vel: { x: 0, y: 0 },
    hp: 40,
    maxHp: 40,
    radius: 13,
    speed: 88,
    stolen,
    escapeTarget,
    fleeing: true,
    alive: true,
  });

  setMessage(
    state,
    `Хулгайч ${stolen} хонь авч зугтав! Гүйцэж ав!`,
    4,
  );
}

// ---------------------------------------------------------------------------
// Update systems
// ---------------------------------------------------------------------------

function updateWeatherCycle(state: GameState, dt: number): void {
  const world = state.world;
  const prevDay = Math.floor(world.timeOfDay);
  world.timeOfDay = (world.timeOfDay + dt * 0.8) % 24;
  world.elapsed += dt;

  // Шинэ өдөр эхлэхэд мал үржинэ
  const curDay = Math.floor(world.timeOfDay);
  if (curDay < prevDay) {
    world.dayNumber += 1;
    // ~8–15% өсөлт, хамгийн багадаа +1
    const growth = Math.max(
      1,
      Math.floor(world.flock.total * randRange(0.08, 0.15)),
    );
    addSheep(state, growth);
    state.score += growth;
    if (state.phase === "playing") {
      setMessage(
        state,
        `Өдөр ${world.dayNumber}: сүрэг +${growth} (нийт ${world.flock.total})`,
        3.5,
      );
    }
  }

  const t = world.elapsed;
  if (world.season === "winter") {
    world.weather = t % 40 < 18 ? "snow" : "wind";
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

  if (n.x !== 0 || n.y !== 0) {
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

function nearestBerryBush(player: Player, bushes: BerryBush[]): BerryBush | null {
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

/** E: эхлээд жимс, дараа нь мод */
function tryInteract(state: GameState): void {
  const { player, world } = state;
  if (player.chopCooldown > 0 || !state.input.interact) return;

  const bush = nearestBerryBush(player, world.bushes);
  if (bush) {
    bush.berries -= 1;
    player.inventory.berries += 1;
    player.chopCooldown = 0.35;
    state.score += 2;
    if (bush.berries <= 0) {
      bush.respawnIn = 18 + Math.random() * 12;
    }
    setMessage(
      state,
      `Жимс түүв! (нөөц: ${player.inventory.berries}) · Q-аар ид`,
      2,
    );
    return;
  }

  const tree = nearestAliveTree(player, world.trees);
  if (!tree) {
    setMessage(state, "Ойрхон мод/жимс алга.", 1.5);
    return;
  }

  tree.hp -= 1;
  player.chopCooldown = 0.45;

  if (tree.hp <= 0) {
    const gained = 1 + Math.floor(Math.random() * 2);
    player.inventory.wood += gained;
    state.score += gained * 5;
    tree.respawnIn = 25 + Math.random() * 15;
    setMessage(state, `+${gained} түлээ`, 2);
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
  // Бага зэрэг эдгээнэ
  player.vitals.health = clamp(
    player.vitals.health + 4,
    0,
    player.vitals.maxHealth,
  );
  player.eatCooldown = 0.5;
  state.input.eat = false;
  setMessage(
    state,
    `Жимс идлээ. Өлсгөлөн: ${Math.ceil(player.vitals.hunger)}`,
    1.8,
  );
}

function tryLightCampfire(state: GameState): void {
  if (!state.input.lightFire) return;

  const { player, world } = state;
  const fire = world.campfire;
  if (dist(player.pos, fire.pos) >= fire.radius) {
    setMessage(state, "Гал руу ойрт (F).", 1.5);
    return;
  }

  const cost = 3;
  if (player.inventory.wood < cost) {
    setMessage(state, `Галд ${cost} түлээ хэрэгтэй.`, 2);
    return;
  }

  player.inventory.wood -= cost;
  fire.lit = true;
  fire.fuel = Math.max(fire.fuel, 0) + 18;
  state.input.lightFire = false;
  setMessage(state, "Гал асаалаа.", 2);
}

function tryAttack(state: GameState): void {
  const { player, world } = state;
  if (player.attackCooldown > 0 || !state.input.attack) return;

  player.attackCooldown = 0.4;
  const reach = 42;
  let hit = false;

  // Чоно руу цохих
  for (const wolf of world.wolves) {
    if (!wolf.alive) continue;
    if (dist(player.pos, wolf.pos) > reach) continue;
    wolf.hp -= 18;
    hit = true;
    // knockback
    const away = normalize({
      x: wolf.pos.x - player.pos.x,
      y: wolf.pos.y - player.pos.y,
    });
    wolf.pos.x += away.x * 28;
    wolf.pos.y += away.y * 28;
    if (wolf.hp <= 0) {
      wolf.alive = false;
      state.score += 25;
      setMessage(state, "Чоно устгагдлаа!", 2);
    } else {
      setMessage(state, "Чонод цохилт!", 1);
    }
    break;
  }

  // Хулгайч руу — мал буцааж авна
  if (!hit) {
    for (const thief of world.thieves) {
      if (!thief.alive) continue;
      if (dist(player.pos, thief.pos) > reach) continue;
      thief.hp -= 20;
      hit = true;
      const away = normalize({
        x: thief.pos.x - player.pos.x,
        y: thief.pos.y - player.pos.y,
      });
      thief.pos.x += away.x * 32;
      thief.pos.y += away.y * 32;

      if (thief.hp <= 0) {
        thief.alive = false;
        const recovered = thief.stolen;
        thief.stolen = 0;
        addSheep(state, recovered);
        state.score += recovered * 15;
        setMessage(state, `Мал буцааж авлаа! +${recovered} хонь`, 3);
      } else {
        setMessage(state, "Хулгайчийг цохилоо!", 1.2);
      }
      break;
    }
  }

  if (!hit) {
    // Хоосон swing — мессеж үгүй
  }
}

function updateFlock(state: GameState, dt: number): void {
  const center = pastureCenter(state.world);
  const { player } = state;

  for (const sheep of state.world.flock.visuals) {
    // Бэлчээрийн төв + тоглогчийн зөөлөн таталцал
    const toCenter = normalize({
      x: center.x - sheep.pos.x,
      y: center.y - sheep.pos.y,
    });
    const toPlayer = normalize({
      x: player.pos.x - sheep.pos.x,
      y: player.pos.y - sheep.pos.y,
    });
    const wander = {
      x: Math.sin(state.world.elapsed * 0.7 + sheep.id) * 0.4,
      y: Math.cos(state.world.elapsed * 0.5 + sheep.id * 1.3) * 0.4,
    };

    const dCenter = dist(sheep.pos, center);
    const pull = dCenter > PASTURE_RADIUS ? 1.2 : 0.25;

    sheep.vel.x += (toCenter.x * pull + toPlayer.x * 0.15 + wander.x) * 40 * dt;
    sheep.vel.y += (toCenter.y * pull + toPlayer.y * 0.15 + wander.y) * 40 * dt;
    sheep.vel.x *= 0.92;
    sheep.vel.y *= 0.92;
    sheep.pos.x += sheep.vel.x * dt;
    sheep.pos.y += sheep.vel.y * dt;
    sheep.pos.x = clamp(sheep.pos.x, 30, WORLD_W - 30);
    sheep.pos.y = clamp(sheep.pos.y, 30, WORLD_H - 30);
  }
}

function updateWolves(state: GameState, dt: number): void {
  const { wolves, flock } = state.world;
  const player = state.player;

  for (const wolf of wolves) {
    if (!wolf.alive) continue;
    wolf.attackCooldown = Math.max(0, wolf.attackCooldown - dt);

    const prey = nearestSheep(wolf.pos, flock.visuals);
    const target = prey?.pos ?? pastureCenter(state.world);

    // Тоглогч ойрхон бол бага зэрэг зайлна / эсвэл дайрна
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

    wolf.pos.x += dir.x * wolf.speed * dt;
    wolf.pos.y += dir.y * wolf.speed * dt;

    // Мал идэх
    if (prey && dist(wolf.pos, prey.pos) < wolf.radius + prey.radius + 4) {
      if (wolf.attackCooldown <= 0) {
        wolf.attackCooldown = 1.4;
        const lost = loseSheep(state, 1);
        if (lost > 0) {
          setMessage(state, "Чоно хонь идэв! −1", 2);
        }
      }
    }

    // Тоглогчийг хазах
    if (dPlayer < wolf.radius + player.radius + 2 && wolf.attackCooldown <= 0) {
      wolf.attackCooldown = 1.1;
      player.vitals.health = clamp(
        player.vitals.health - 12,
        0,
        player.vitals.maxHealth,
      );
      const knock = normalize({
        x: player.pos.x - wolf.pos.x,
        y: player.pos.y - wolf.pos.y,
      });
      player.pos.x += knock.x * 24;
      player.pos.y += knock.y * 24;
      setMessage(state, "Чоно хазав! −12 HP", 1.5);
      if (player.vitals.health <= 0) {
        state.phase = "lost";
        setMessage(state, "Чононд ялагдлаа…", 99);
      }
    }
  }

  state.world.wolves = wolves.filter((w) => w.alive);
}

function updateThieves(state: GameState, dt: number): void {
  for (const thief of state.world.thieves) {
    if (!thief.alive) continue;

    const dir = normalize({
      x: thief.escapeTarget.x - thief.pos.x,
      y: thief.escapeTarget.y - thief.pos.y,
    });
    thief.pos.x += dir.x * thief.speed * dt;
    thief.pos.y += dir.y * thief.speed * dt;

    // Газрын ирмэгд хүрсэн → мал алга болно
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

  const night = world.timeOfDay < 6 || world.timeOfDay > 19;
  if (world.nextWolfIn <= 0) {
    spawnWolf(state);
    // Шөнө илүү ойрхон дайрна
    world.nextWolfIn = night ? randRange(10, 18) : randRange(22, 38);
  }

  if (world.nextThiefIn <= 0) {
    // Шөнийн оронд өдөр илүү хулгайч
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

  // Өдөр дулаацах шаардлагагүй — зөвхөн шөнө/хүйтэнд буурна
  let warmthDelta = 0;
  if (night || coldWeather) {
    warmthDelta = -2.5 * dt;
    if (coldWeather && night) warmthDelta -= 1.5 * dt;
  } else {
    // Өдөр өөрөө дулаарна
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

  // Өлсгөлөн — байнга буурна
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
}

function update(state: GameState, dt: number): void {
  if (state.phase !== "playing") return;

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

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

interface Camera {
  x: number;
  y: number;
}

function getCamera(player: Player): Camera {
  return {
    x: clamp(
      player.pos.x - CONFIG.canvasWidth / 2,
      0,
      WORLD_W - CONFIG.canvasWidth,
    ),
    y: clamp(
      player.pos.y - CONFIG.canvasHeight / 2,
      0,
      WORLD_H - CONFIG.canvasHeight,
    ),
  };
}

function drawGrass(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  world: World,
): void {
  const ts = CONFIG.tileSize;
  const startX = Math.floor(cam.x / ts);
  const startY = Math.floor(cam.y / ts);
  const cols = Math.ceil(CONFIG.canvasWidth / ts) + 1;
  const rows = Math.ceil(CONFIG.canvasHeight / ts) + 1;

  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const tx = startX + ix;
      const ty = startY + iy;
      const checker = (tx + ty) % 2 === 0;
      ctx.fillStyle = checker ? COLORS.grassA : COLORS.grassB;
      if (world.weather === "snow" || world.season === "winter") {
        ctx.fillStyle = checker ? "#9bb8a0" : "#8aab92";
      }
      ctx.fillRect(tx * ts - cam.x, ty * ts - cam.y, ts, ts);
    }
  }

  const pad: Rect = {
    x: WORLD_W / 2 - 70,
    y: WORLD_H / 2 - 50,
    w: 140,
    h: 100,
  };
  ctx.fillStyle = COLORS.dirt;
  ctx.fillRect(pad.x - cam.x, pad.y - cam.y, pad.w, pad.h);

  // Бэлчээрийн тойрог
  const c = pastureCenter(world);
  ctx.strokeStyle = "rgba(232, 197, 106, 0.2)";
  ctx.beginPath();
  ctx.arc(c.x - cam.x, c.y - cam.y, PASTURE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  tree: Tree,
  cam: Camera,
): void {
  const x = tree.pos.x - cam.x;
  const y = tree.pos.y - cam.y;

  if (tree.hp <= 0) {
    ctx.fillStyle = COLORS.treeStump;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.fillStyle = COLORS.treeTrunk;
  ctx.fillRect(x - 4, y - 8, 8, 18);
  ctx.fillStyle = COLORS.treeLeaf;
  ctx.beginPath();
  ctx.arc(x, y - 18, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 10, y - 10, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10, y - 10, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawBerryBush(
  ctx: CanvasRenderingContext2D,
  bush: BerryBush,
  cam: Camera,
): void {
  const x = bush.pos.x - cam.x;
  const y = bush.pos.y - cam.y;

  ctx.fillStyle = bush.berries > 0 ? COLORS.bush : "#3a4a35";
  ctx.beginPath();
  ctx.ellipse(x, y, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 6, y - 6, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 7, y - 5, 7, 0, Math.PI * 2);
  ctx.fill();

  if (bush.berries > 0) {
    ctx.fillStyle = COLORS.berry;
    const n = Math.min(bush.berries, 5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 6, y - 4 + Math.sin(a) * 4, 3, 0, Math.PI * 2);
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

  ctx.fillStyle = COLORS.campfireOff;
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6a6558";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 14, y + Math.sin(a) * 7 + 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (fire.lit) {
    const flicker = 1 + Math.sin(time * 10) * 0.12;
    ctx.fillStyle = COLORS.campfireOn;
    ctx.beginPath();
    ctx.moveTo(x, y - 22 * flicker);
    ctx.lineTo(x + 10, y + 2);
    ctx.lineTo(x - 10, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.flame;
    ctx.beginPath();
    ctx.moveTo(x, y - 14 * flicker);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawSheep(ctx: CanvasRenderingContext2D, sheep: Sheep, cam: Camera): void {
  const x = sheep.pos.x - cam.x;
  const y = sheep.pos.y - cam.y;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.sheep;
  ctx.beginPath();
  ctx.ellipse(x, y, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.sheepHead;
  ctx.beginPath();
  ctx.arc(x + 8, y - 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawWolf(ctx: CanvasRenderingContext2D, wolf: Wolf, cam: Camera): void {
  const x = wolf.pos.x - cam.x;
  const y = wolf.pos.y - cam.y;
  ctx.fillStyle = COLORS.wolf;
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 12, y - 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.wolfEye;
  ctx.fillRect(x + 14, y - 4, 3, 3);
  // HP
  const bw = 22;
  ctx.fillStyle = "#222";
  ctx.fillRect(x - bw / 2, y - 20, bw, 3);
  ctx.fillStyle = "#e05050";
  ctx.fillRect(x - bw / 2, y - 20, (bw * wolf.hp) / wolf.maxHp, 3);
}

function drawThief(
  ctx: CanvasRenderingContext2D,
  thief: Thief,
  cam: Camera,
): void {
  const x = thief.pos.x - cam.x;
  const y = thief.pos.y - cam.y;
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.thiefHat;
  ctx.fillRect(x - 10, y - 16, 20, 6);
  ctx.fillRect(x - 6, y - 22, 12, 8);
  // Stolen badge
  ctx.fillStyle = COLORS.hudAccent;
  ctx.font = "bold 11px system-ui";
  ctx.fillText(`−${thief.stolen}`, x - 8, y - 26);
  const bw = 22;
  ctx.fillStyle = "#222";
  ctx.fillRect(x - bw / 2, y + 14, bw, 3);
  ctx.fillStyle = "#50a0e0";
  ctx.fillRect(x - bw / 2, y + 14, (bw * thief.hp) / thief.maxHp, 3);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cam: Camera,
): void {
  const x = player.pos.x - cam.x;
  const y = player.pos.y - cam.y;

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.playerCoat;
  ctx.beginPath();
  ctx.arc(x, y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(x, y - 6, 7, 0, Math.PI * 2);
  ctx.fill();

  // Таяг / зэвсэг
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + player.facing.x * 22, y + player.facing.y * 22);
  ctx.stroke();
}

function drawWeatherOverlay(
  ctx: CanvasRenderingContext2D,
  world: World,
  time: number,
): void {
  const { canvasWidth: w, canvasHeight: h } = CONFIG;
  const hour = world.timeOfDay;
  let nightAlpha = 0;
  if (hour < 5 || hour > 21) nightAlpha = 0.55;
  else if (hour < 7) nightAlpha = 0.55 * (1 - (hour - 5) / 2);
  else if (hour > 19) nightAlpha = 0.55 * ((hour - 19) / 2);

  if (nightAlpha > 0) {
    ctx.fillStyle = `rgba(8, 12, 28, ${nightAlpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  if (world.weather === "snow" || world.weather === "storm") {
    ctx.fillStyle =
      world.weather === "storm"
        ? "rgba(200,210,230,0.7)"
        : "rgba(255,255,255,0.85)";
    for (let i = 0; i < 60; i++) {
      const sx =
        ((i * 97 + time * (world.weather === "storm" ? 180 : 60)) % (w + 40)) -
        20;
      const sy = ((i * 53 + time * 120) % (h + 40)) - 20;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  color: string,
  label: string,
): void {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(ratio, 0, 1), h);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(label, x, y - 4);
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { player, world } = state;
  const pad = 12;

  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(pad, pad, 300, 188);
  ctx.strokeStyle = "rgba(232, 197, 106, 0.35)";
  ctx.strokeRect(pad, pad, 300, 188);

  drawBar(
    ctx,
    pad + 12,
    pad + 28,
    270,
    12,
    player.vitals.health / player.vitals.maxHealth,
    COLORS.health,
    `Амьдрал  ${Math.ceil(player.vitals.health)}`,
  );
  drawBar(
    ctx,
    pad + 12,
    pad + 58,
    270,
    12,
    player.vitals.hunger / player.vitals.maxHunger,
    COLORS.hunger,
    `Өлсгөлөн  ${Math.ceil(player.vitals.hunger)}`,
  );
  drawBar(
    ctx,
    pad + 12,
    pad + 88,
    270,
    12,
    player.vitals.warmth / player.vitals.maxWarmth,
    COLORS.warmth,
    `Дулаан  ${Math.ceil(player.vitals.warmth)}`,
  );
  drawBar(
    ctx,
    pad + 12,
    pad + 118,
    270,
    12,
    world.flock.total / WIN_SHEEP,
    "#d4c4a0",
    `Хонь  ${world.flock.total} / ${WIN_SHEEP}`,
  );

  ctx.fillStyle = COLORS.hudAccent;
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(
    `Түлээ: ${player.inventory.wood}  Жимс: ${player.inventory.berries}  Өдөр: ${world.dayNumber}`,
    pad + 12,
    pad + 168,
  );

  const panelW = 250;
  const rx = CONFIG.canvasWidth - panelW - pad;
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(rx, pad, panelW, 88);
  ctx.strokeStyle = "rgba(232, 197, 106, 0.35)";
  ctx.strokeRect(rx, pad, panelW, 88);

  ctx.fillStyle = COLORS.hudText;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(weatherLabel(world.weather, world.season), rx + 12, pad + 24);
  ctx.fillText(`Цаг: ${formatClock(world.timeOfDay)}`, rx + 12, pad + 46);
  ctx.fillStyle = COLORS.hudAccent;
  ctx.fillText(`Оноо: ${state.score}`, rx + 12, pad + 68);

  // Active threats
  if (world.wolves.length > 0 || world.thieves.length > 0) {
    ctx.fillStyle = "rgba(120, 20, 20, 0.75)";
    ctx.fillRect(pad, CONFIG.canvasHeight - 70, 280, 36);
    ctx.fillStyle = "#ffb0b0";
    ctx.font = "13px system-ui";
    const parts: string[] = [];
    if (world.wolves.length)
      parts.push(`Чоно: ${world.wolves.length}`);
    if (world.thieves.length) {
      const stolen = world.thieves.reduce((s, t) => s + t.stolen, 0);
      parts.push(`Хулгайч (мал −${stolen})`);
    }
    ctx.fillText(parts.join("  ·  "), pad + 12, CONFIG.canvasHeight - 46);
  }

  if (state.messageTimer > 0 && state.message) {
    ctx.font = "14px system-ui, sans-serif";
    const tw = ctx.measureText(state.message).width;
    const mx = (CONFIG.canvasWidth - tw) / 2 - 12;
    const my = CONFIG.canvasHeight - 36;
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(mx, my, tw + 24, 28);
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText(state.message, mx + 12, my + 19);
  }

  if (state.phase === "won" || state.phase === "lost") {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    ctx.textAlign = "center";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.fillStyle = state.phase === "won" ? "#e8c56a" : "#ff6b6b";
    ctx.fillText(
      state.phase === "won" ? "ЯЛАЛТ!" : "ЯЛАГДЛАА",
      CONFIG.canvasWidth / 2,
      CONFIG.canvasHeight / 2 - 10,
    );
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(
      state.phase === "won"
        ? `${WIN_SHEEP} хоньтой сүрэг бүрдүүллээ`
        : "Хуудсыг шинэчилж дахин эхлүүл",
      CONFIG.canvasWidth / 2,
      CONFIG.canvasHeight / 2 + 28,
    );
    ctx.textAlign = "left";
  }
}

function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
): void {
  const cam = getCamera(state.player);
  ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
  drawGrass(ctx, cam, state.world);

  type Drawable = { y: number; draw: () => void };
  const drawables: Drawable[] = [];

  for (const tree of state.world.trees) {
    drawables.push({ y: tree.pos.y, draw: () => drawTree(ctx, tree, cam) });
  }
  for (const bush of state.world.bushes) {
    drawables.push({
      y: bush.pos.y,
      draw: () => drawBerryBush(ctx, bush, cam),
    });
  }
  drawables.push({
    y: state.world.campfire.pos.y,
    draw: () => drawCampfire(ctx, state.world.campfire, cam, time),
  });
  for (const sheep of state.world.flock.visuals) {
    drawables.push({ y: sheep.pos.y, draw: () => drawSheep(ctx, sheep, cam) });
  }
  for (const wolf of state.world.wolves) {
    drawables.push({ y: wolf.pos.y, draw: () => drawWolf(ctx, wolf, cam) });
  }
  for (const thief of state.world.thieves) {
    drawables.push({ y: thief.pos.y, draw: () => drawThief(ctx, thief, cam) });
  }
  drawables.push({
    y: state.player.pos.y,
    draw: () => drawPlayer(ctx, state.player, cam),
  });

  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw();

  drawWeatherOverlay(ctx, state.world, time);
  drawHud(ctx, state);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function main(): void {
  const canvas = document.getElementById("game") as HTMLCanvasElement | null;
  if (!canvas) throw new Error("#game canvas олдсонгүй");

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context дэмжигдэхгүй");

  canvas.width = CONFIG.canvasWidth;
  canvas.height = CONFIG.canvasHeight;

  const state = createInitialState();
  bindInput(state.input);

  let last = performance.now();

  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(state, dt);
    if (state.messageTimer > 0 && state.phase !== "playing") {
      // keep message visible on end screens
    } else if (state.phase === "playing" && state.messageTimer > 0) {
      // already decremented in update
    }
    render(ctx, state, now / 1000);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

main();
