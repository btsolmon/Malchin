// Өвгөний соёлын асуулт — зөв=зоос, буруу=явуулах

import { sfx } from "./audio";
import { spawnText } from "./effects";
import {
  ELDER_CULTURE_QUESTIONS,
  findElderCultureQuestion,
  type ElderCultureQuestion,
} from "./elderQuizData";
import { setMessage } from "./utils";
import type { GameState } from "./types";

export type ElderQuizFeedback = "idle" | "correct" | "wrong";

export interface ElderQuizUiState {
  questionId: string;
  question: string;
  options: string[];
  correctIndex: number;
  feedback: ElderQuizFeedback;
  selectedIndex: number | null;
  rewardScore: number;
  rewardLabel: string;
  askedCount: number;
  totalCount: number;
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function isElderCultureQuizAvailable(state: GameState): boolean {
  return (
    state.story.milestone8Completed ||
    state.story.activeMainObjective === "growFlock"
  );
}

export function clearElderQuiz(state: GameState): void {
  state.elderQuizId = null;
  state.elderQuizOptions = [];
  state.elderQuizCorrectIndex = 0;
  state.elderQuizFeedback = "idle";
  state.elderQuizSelectedIndex = null;
  state.elderQuizRewardLabel = "";
}

function pickQuestion(state: GameState): ElderCultureQuestion {
  const asked = new Set(state.elderQuizAskedIds);
  const unused = ELDER_CULTURE_QUESTIONS.filter((q) => !asked.has(q.id));
  const pool = unused.length > 0 ? unused : ELDER_CULTURE_QUESTIONS;
  if (unused.length === 0) {
    state.elderQuizAskedIds = [];
  }
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function startElderCultureQuiz(state: GameState): void {
  const q = pickQuestion(state);
  const options = shuffleInPlace([q.correct, ...q.wrong]);
  const correctIndex = options.indexOf(q.correct);

  state.elderTab = "talk";
  state.elderDialogueId = null;
  state.elderDialogueLine = 0;
  state.elderShowingChoices = false;
  state.world.elder.eyeMode = "idle";

  state.elderQuizId = q.id;
  state.elderQuizOptions = options;
  state.elderQuizCorrectIndex = correctIndex;
  state.elderQuizFeedback = "idle";
  state.elderQuizSelectedIndex = null;
  state.elderQuizRewardLabel = "";
  sfx("select");
  setMessage(state, "Өвгөн: «Өв соёлоо мэддэг үү, хүү минь?»", 2.8);
}

export function advanceElderCultureQuiz(state: GameState): void {
  if (state.elderQuizFeedback !== "correct") return;
  startElderCultureQuiz(state);
}

export function submitElderCultureAnswer(
  state: GameState,
  optionIndex: number,
): void {
  if (state.phase !== "elder" || !state.elderQuizId) return;
  if (state.elderQuizFeedback === "correct") return;

  const q = findElderCultureQuestion(state.elderQuizId);
  if (!q) return;
  if (optionIndex < 0 || optionIndex >= state.elderQuizOptions.length) return;

  state.elderQuizSelectedIndex = optionIndex;

  if (optionIndex !== state.elderQuizCorrectIndex) {
    state.elderQuizFeedback = "wrong";
    if (!state.elderQuizAskedIds.includes(q.id)) {
      state.elderQuizAskedIds = [...state.elderQuizAskedIds, q.id];
    }
    sfx("select");
    setMessage(state, "Өвгөн: «Буруу байна. Сайн бэлд, дараа ир.»", 3.5);
    state.phase = "playing";
    state.elderTab = "trade";
    clearElderQuiz(state);
    state.elderDialogueId = null;
    state.elderDialogueLine = 0;
    state.elderShowingChoices = false;
    state.world.elder.eyeMode = "idle";
    return;
  }

  state.score += q.rewardScore;
  state.elderQuizFeedback = "correct";
  state.elderQuizRewardLabel = `+${q.rewardScore} зоос`;
  if (!state.elderQuizAskedIds.includes(q.id)) {
    state.elderQuizAskedIds = [...state.elderQuizAskedIds, q.id];
  }
  spawnText(state, state.player.pos, `+${q.rewardScore}`, "#ffd060");
  sfx("select");
  setMessage(state, `Өвгөн: «Зөв! +${q.rewardScore} зоос.»`, 2.8);
}

export function getElderQuizUi(state: GameState): ElderQuizUiState | null {
  if (!state.elderQuizId || state.elderQuizOptions.length === 0) return null;
  const q = findElderCultureQuestion(state.elderQuizId);
  if (!q) return null;
  return {
    questionId: q.id,
    question: q.question,
    options: state.elderQuizOptions,
    correctIndex: state.elderQuizCorrectIndex,
    feedback: state.elderQuizFeedback,
    selectedIndex: state.elderQuizSelectedIndex,
    rewardScore: q.rewardScore,
    rewardLabel: state.elderQuizRewardLabel,
    askedCount: state.elderQuizAskedIds.length,
    totalCount: ELDER_CULTURE_QUESTIONS.length,
  };
}
