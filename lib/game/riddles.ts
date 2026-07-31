// Монгол өв — оньсого / соёлын асуулт

import { sfx } from "./audio";
import { spawnText } from "./effects";
import { setMessage } from "./utils";
import type {
  GameState,
  RiddleHostKind,
  RiddleHostRef,
  Vector2,
  World,
} from "./types";
import { WORLD_H, WORLD_W } from "./types";

export interface RiddleReward {
  /** Зөвхөн оноо (state.score) */
  amount: number;
}

export interface Riddle {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  reward: RiddleReward;
}

export const MONGOLIAN_RIDDLES: Riddle[] = [
  {
    id: "riddle_1",
    question:
      "Салхи нар даган эргэж, оройдоо хүчтэй болбол ямар цаг агаар болохын дохио вэ?",
    options: [
      "Маргааш тэнгэр тогтуун сайхан болно",
      "Маргааш тэнгэр аягүй (муухай) болно",
      "Өдөртөө цэлмэг бүгчим болно",
      "Оройдоо манан татна",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Салхи нар даган эргэж оройдоо ширүүсвэл маргааш тэнгэр аягүй болохын дохио гэж үздэг.",
    reward: { amount: 50 },
  },
  {
    id: "riddle_2",
    question: 'Ямар тохиолдолд "хавсарга тавина" гэж үздэг вэ?',
    options: [
      "Салхи буруу эргэж, орой тийш ширүүсэхэд",
      "Өглөө эрт баруун өмнө зүгт бараан үүл гарахад",
      "Нар улбар өнгөтэй жаргахад",
      "Нар мандах үеэр манантай байхад",
    ],
    correctAnswerIndex: 0,
    explanation:
      "Салхи буруу эргэж орой тийш ширүүсвэл хавсарга тавина гэж нүүдэлчид ажигладаг.",
    reward: { amount: 50 },
  },
  {
    id: "riddle_3",
    question:
      "Өглөөний нар ердийнхөөс том, улаан хүрэн өнгөтэй, эгц дээшээ цацрагтай харагдвал яах вэ?",
    options: [
      "Хүчтэй салхи хөдөлнө",
      "Зун бол бороо, өвөл бол цас орно",
      "Өдөртөө тэнгэр муудахгүй",
      "Маргааш тэнгэр цэлмэнэ",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Ийм нар зун бороо, өвөл цас орохын шинж гэж ардын цаг агаарын мэдлэгт үздэг.",
    reward: { amount: 60 },
  },
  {
    id: "riddle_4",
    question:
      "Өглөө эрт баруун өмнө зүгт бараан үүл гарвал цаг агаар хэрхэн өөрчлөгдөх вэ?",
    options: [
      "Шөнөдөө сэрүүснэ",
      "Үдийн урд хур бороо орно",
      "Хүчтэй салхи тавина",
      "Маргааш хүйтэрнэ",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Баруун өмнөөс бараан үүл гарвал үдийн урд хур бороо орох шинж.",
    reward: { amount: 60 },
  },
  {
    id: "riddle_5",
    question:
      'Нар жаргах үеэр ямар шинж ажиглагдвал "хүчтэй салхи хөдлөхийн" дохио болдог вэ?',
    options: [
      "Нар тод ягаан өнгөтэй жаргах",
      "Нар улбар өнгөтэй жаргах",
      "Нар тосон цагаан өнгөтэй жаргах",
      "Нар шингэх зүгт цэлмэг байх",
    ],
    correctAnswerIndex: 0,
    explanation:
      "Нар тод ягаанаар жаргавал хүчтэй салхи хөдлөхийн дохио гэж үздэг.",
    reward: { amount: 70 },
  },
  {
    id: "riddle_6",
    question:
      "Тэнгэрийн баруун хаяанаас махирласан толгойтой үүл гарвал ямар цаг агаарын шинж тэмдэг вэ?",
    options: [
      "Маргааш салхи тавьж, хүйтэрнэ",
      "Үдээс хойш аадар бороо орно",
      "Өдөртөө цэлмэг, бүгчим болно",
      "Шөнөдөө сэмжин үүл сарнина",
    ],
    correctAnswerIndex: 0,
    explanation:
      "Баруун хаяанаас махирласан толгойтой үүл маргааш салхи, хүйтрэхийн шинж.",
    reward: { amount: 70 },
  },
  {
    id: "riddle_7",
    question:
      "Монголчууд нүүхийн урд өдөр амьдарч байгаа газрынхаа орчин тойронд юу хийдэг вэ?",
    options: [
      "Орчин тойрноо сайтар цэвэрлэдэг",
      "Гэрийнхээ хаяаг манаж шороо асгадаг",
      "Малаа бэлчээрт нь үлдээж амраадаг",
      "Шинэ нутаг руугаа малын ачаа явуулдаг",
    ],
    correctAnswerIndex: 0,
    explanation:
      "Нүүхийн өмнө орчин тойрноо цэвэрлэж, газрын эзэнд хүндэтгэл үзүүлдэг.",
    reward: { amount: 80 },
  },
  {
    id: "riddle_8",
    question:
      'Нүүх өдрийнхөө өглөө өргөдөг "Талархлын тахил"-ын утга учир юу вэ?',
    options: [
      "Шинэ газар нутагтаа дасан зохицохыг гуйх",
      "Аян замдаа саадгүй, аюулгүй явахыг даатгах",
      "Тухайн газар нутагт сайн сайхан байлгасанд газар тэнгэртээ талархах",
      "Ирэх жилийн ургац, малын буянаа гуйх",
    ],
    correctAnswerIndex: 2,
    explanation:
      "Талархлын тахил нь тухайн газарт сайн сайхан байлгасанд газар тэнгэртээ талархах ёс.",
    reward: { amount: 80 },
  },
  {
    id: "riddle_9",
    question:
      "Нүүхдээ гэрийн буурь, хот бууцаа цэвэрлэхгүй орхивол юу болдог гэж үздэг вэ?",
    options: [
      "Хот бууцны өвс ногоо нь сэргэхгүй, хогийн ургамал ургана",
      "Дараагийн айл тэр буурин дээр буух боломжгүй болно",
      "Аян замдаа төөрөх, ачаа тээшээ гээх аюултай",
      "Малын хөл хорио тогтож, өвчин дэгдэнэ",
    ],
    correctAnswerIndex: 0,
    explanation:
      "Буурь, хот бууцаа цэвэрлэхгүй орхивол өвс ногоо сэргэхгүй, хогийн ургамал ургана гэж үздэг.",
    reward: { amount: 90 },
  },
  {
    id: "riddle_10",
    question: "Нүүдлийн хөсөг тэрэгний хамгийн ТЭРГҮҮНД ямар малыг залдаг вэ?",
    options: [
      "Шинээр сургасан залуу малыг",
      "Олон жил аян жин тээсэн цагаан ат, улаан үхэр зэргийг",
      "Төлтэй эм малыг",
      "Сүргийн манлай азарга, хуц, ухныг",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Тэргүүнд олон жил аян жин тээсэн туршлагатай цагаан ат, улаан үхрийг залдаг.",
    reward: { amount: 90 },
  },
  {
    id: "riddle_11",
    question:
      "Нүүдлийн хөсөг тэргэнд шинэ сургасан мал болон төлтэй эм малыг хэрхэн хөлөглөдөг ёстой вэ?",
    options: [
      "Шинэ сургасан малыг хамгийн түрүүнд, төлтэй эм малыг дунд нь",
      "Шинэ сургасан малыг дунд нь, төлтэй эм малыг сүүлийн тэргэнд",
      "Хоёр төрлийн малыг хамтад нь сүүлийн тэргэнд",
      "Төлтэй эм малыг тэргүүнд, шинэ сургасан малыг хамгийн сүүлд",
    ],
    correctAnswerIndex: 1,
    explanation:
      "Шинэ сургасан малыг дунд, төлтэй эм малыг сүүлийн тэргэнд хөлөглөнө.",
    reward: { amount: 100 },
  },
];

export function getRandomRiddle(): Riddle {
  const index = Math.floor(Math.random() * MONGOLIAN_RIDDLES.length);
  return MONGOLIAN_RIDDLES[index]!;
}

export function findRiddleById(id: string): Riddle | null {
  return MONGOLIAN_RIDDLES.find((r) => r.id === id) ?? null;
}

/** Өөр объектод аль хэдийн өгсөн оньсогоо давтахгүйгээр сонгоно */
export function pickRiddleForSpot(state: GameState): Riddle {
  const used = new Set(collectAssignedRiddleIds(state.world));
  const unused = MONGOLIAN_RIDDLES.filter((r) => !used.has(r.id));
  const pool = unused.length > 0 ? unused : MONGOLIAN_RIDDLES;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function collectAssignedRiddleIds(world: World): string[] {
  const ids: string[] = [];
  for (const tree of world.trees) {
    if (tree.riddleHost && tree.riddleId) ids.push(tree.riddleId);
  }
  for (const bush of world.bushes) {
    if (bush.riddleHost && bush.riddleId) ids.push(bush.riddleId);
  }
  for (const rock of world.rocks) {
    if (rock.riddleId) ids.push(rock.riddleId);
  }
  return ids;
}

function shuffleIds(ids: number[]): number[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** Санамсаргүй мод, бут, чулуу дээр оньсогын асуулт байрлуулна */
export function assignRiddlesToWorld(
  world: World,
  camp: Vector2,
  count: number,
): void {
  const treeIds = shuffleIds(world.trees.map((t) => t.id));
  const bushIds = shuffleIds(world.bushes.map((b) => b.id));

  const treeCount = Math.min(Math.ceil(count / 3), treeIds.length);
  const bushCount = Math.min(Math.ceil(count / 3), bushIds.length);
  const rockCount = Math.max(0, count - treeCount - bushCount);

  for (let i = 0; i < treeCount; i++) {
    const tree = world.trees.find((t) => t.id === treeIds[i])!;
    tree.riddleHost = true;
    tree.riddleSolved = false;
    tree.riddleId = null;
  }
  for (let i = 0; i < bushCount; i++) {
    const bush = world.bushes.find((b) => b.id === bushIds[i])!;
    bush.riddleHost = true;
    bush.riddleSolved = false;
    bush.riddleId = null;
  }

  world.rocks = [];
  for (let i = 0; i < rockCount; i++) {
    let pos: Vector2 = { x: camp.x, y: camp.y };
    let attempts = 0;
    do {
      pos = {
        x: 100 + Math.random() * (WORLD_W - 200),
        y: 100 + Math.random() * (WORLD_H - 200),
      };
      attempts++;
    } while (Math.hypot(pos.x - camp.x, pos.y - camp.y) < 280 && attempts < 50);

    world.rocks.push({
      id: 7000 + i,
      pos,
      radius: 16,
      riddleSolved: false,
      riddleId: null,
    });
  }
}

export interface NearestRiddleHost {
  ref: RiddleHostRef;
  kind: RiddleHostKind;
  pos: Vector2;
  radius: number;
  solved: boolean;
  riddleId: string | null;
}

function hostFromTree(tree: {
  id: number;
  pos: Vector2;
  radius: number;
  riddleSolved: boolean;
  riddleId: string | null;
}): NearestRiddleHost {
  return {
    ref: { kind: "tree", id: tree.id },
    kind: "tree",
    pos: tree.pos,
    radius: tree.radius,
    solved: tree.riddleSolved,
    riddleId: tree.riddleId,
  };
}

function hostFromBush(bush: {
  id: number;
  pos: Vector2;
  radius: number;
  riddleSolved: boolean;
  riddleId: string | null;
}): NearestRiddleHost {
  return {
    ref: { kind: "bush", id: bush.id },
    kind: "bush",
    pos: bush.pos,
    radius: bush.radius,
    solved: bush.riddleSolved,
    riddleId: bush.riddleId,
  };
}

function hostFromRock(rock: {
  id: number;
  pos: Vector2;
  radius: number;
  riddleSolved: boolean;
  riddleId: string | null;
}): NearestRiddleHost {
  return {
    ref: { kind: "rock", id: rock.id },
    kind: "rock",
    pos: rock.pos,
    radius: rock.radius,
    solved: rock.riddleSolved,
    riddleId: rock.riddleId,
  };
}

export function nearestRiddleHost(
  pos: Vector2,
  world: World,
  reach: number,
): NearestRiddleHost | null {
  let best: NearestRiddleHost | null = null;
  let bestD = Infinity;

  for (const tree of world.trees) {
    if (!tree.riddleHost) continue;
    const d = Math.hypot(tree.pos.x - pos.x, tree.pos.y - pos.y);
    if (d < bestD) {
      bestD = d;
      best = hostFromTree(tree);
    }
  }
  for (const bush of world.bushes) {
    if (!bush.riddleHost) continue;
    const d = Math.hypot(bush.pos.x - pos.x, bush.pos.y - pos.y);
    if (d < bestD) {
      bestD = d;
      best = hostFromBush(bush);
    }
  }
  for (const rock of world.rocks) {
    const d = Math.hypot(rock.pos.x - pos.x, rock.pos.y - pos.y);
    if (d < bestD) {
      bestD = d;
      best = hostFromRock(rock);
    }
  }

  if (!best || bestD > reach + best.radius) return null;
  return best;
}

export function getRiddleHost(
  world: World,
  ref: RiddleHostRef,
): NearestRiddleHost | null {
  switch (ref.kind) {
    case "tree": {
      const tree = world.trees.find((t) => t.id === ref.id && t.riddleHost);
      return tree ? hostFromTree(tree) : null;
    }
    case "bush": {
      const bush = world.bushes.find((b) => b.id === ref.id && b.riddleHost);
      return bush ? hostFromBush(bush) : null;
    }
    case "rock": {
      const rock = world.rocks.find((r) => r.id === ref.id);
      return rock ? hostFromRock(rock) : null;
    }
  }
}

function setHostRiddleId(world: World, ref: RiddleHostRef, riddleId: string): void {
  switch (ref.kind) {
    case "tree": {
      const tree = world.trees.find((t) => t.id === ref.id);
      if (tree) tree.riddleId = riddleId;
      break;
    }
    case "bush": {
      const bush = world.bushes.find((b) => b.id === ref.id);
      if (bush) bush.riddleId = riddleId;
      break;
    }
    case "rock": {
      const rock = world.rocks.find((r) => r.id === ref.id);
      if (rock) rock.riddleId = riddleId;
      break;
    }
  }
}

function markHostSolved(world: World, ref: RiddleHostRef): void {
  switch (ref.kind) {
    case "tree": {
      const tree = world.trees.find((t) => t.id === ref.id);
      if (tree) tree.riddleSolved = true;
      break;
    }
    case "bush": {
      const bush = world.bushes.find((b) => b.id === ref.id);
      if (bush) bush.riddleSolved = true;
      break;
    }
    case "rock": {
      const rock = world.rocks.find((r) => r.id === ref.id);
      if (rock) rock.riddleSolved = true;
      break;
    }
  }
}

export function openRiddleAtHost(state: GameState, host: NearestRiddleHost): void {
  if (host.solved) {
    setMessage(state, "Энэ газрын асуулт аль хэдийн хариулагдсан.", 2);
    return;
  }

  let riddle = host.riddleId ? findRiddleById(host.riddleId) : null;
  if (!riddle) {
    riddle = pickRiddleForSpot(state);
    setHostRiddleId(state.world, host.ref, riddle.id);
  }

  state.activeRiddleId = riddle.id;
  state.activeRiddleHost = host.ref;
  state.riddleFeedback = "idle";
  state.phase = "riddle";
  sfx("select");
}

export function applyRiddleReward(state: GameState, riddle: Riddle): void {
  const { reward } = riddle;
  const at = state.player.pos;
  state.score += reward.amount;
  spawnText(state, at, `+${reward.amount} оноо`, "#e8c56a");
}

export function rewardLabel(reward: RiddleReward): string {
  return `${reward.amount} оноо`;
}

export type RiddleFeedback = "idle" | "wrong" | "correct";

export interface RiddleUiState {
  open: true;
  question: string;
  options: string[];
  explanation: string;
  rewardLabel: string;
  feedback: RiddleFeedback;
  spotKind: RiddleHostKind;
}

export type RiddleUiSnapshot = RiddleUiState | { open: false };

/** Зөв → true, буруу → false, аль хэдийн шийдэгдсэн → null */
export function submitRiddleAnswer(
  state: GameState,
  optionIndex: number,
): boolean | null {
  if (state.phase !== "riddle" || !state.activeRiddleId) return null;
  if (state.riddleFeedback === "correct") return null;

  const riddle = findRiddleById(state.activeRiddleId);
  if (!riddle) return null;

  if (optionIndex !== riddle.correctAnswerIndex) {
    state.riddleFeedback = "wrong";
    sfx("hurt");
    return false;
  }

  state.riddleFeedback = "correct";
  applyRiddleReward(state, riddle);

  if (state.activeRiddleHost) {
    markHostSolved(state.world, state.activeRiddleHost);
  }

  sfx("buy");
  setMessage(state, `Зөв хариулт! ${rewardLabel(riddle.reward)} авсан.`, 3.5);
  return true;
}

export function closeRiddle(state: GameState): void {
  if (state.phase !== "riddle") return;
  state.phase = "playing";
  state.activeRiddleId = null;
  state.activeRiddleHost = null;
  state.riddleFeedback = "idle";
}

export function getRiddleUiSnapshot(state: GameState): RiddleUiSnapshot {
  if (state.phase !== "riddle" || !state.activeRiddleId) {
    return { open: false };
  }
  const riddle = findRiddleById(state.activeRiddleId);
  if (!riddle) return { open: false };

  const host = state.activeRiddleHost
    ? getRiddleHost(state.world, state.activeRiddleHost)
    : null;

  return {
    open: true,
    question: riddle.question,
    options: riddle.options,
    explanation: riddle.explanation,
    rewardLabel: rewardLabel(riddle.reward),
    feedback: state.riddleFeedback,
    spotKind: host?.kind ?? "rock",
  };
}

export function spotKindLabel(kind: RiddleHostKind): string {
  switch (kind) {
    case "bush":
      return "Жимсний бут";
    case "tree":
      return "Мод";
    default:
      return "Чулуу";
  }
}
