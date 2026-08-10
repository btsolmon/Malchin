// Хүн 6 — өөрийн дээд амжилтууд (localStorage)
//
// Глобал leaderboard биш: сервер хэрэггүй, хуурамчлах сэдэл ч байхгүй.
// Тоглогч зөвхөн өнгөрсөн өөртэйгөө өрсөлдөнө.

import type { GameState } from "./types";

export const RECORDS_KEY = "malchin-records";

export interface Records {
  /** Хамгийн урт амьдарсан өдөр */
  bestDays: number;
  /** Нэг тоглолтод байсан хамгийн их малын тоо */
  bestLivestock: number;
  /** Цуглуулсан хамгийн их зоос */
  bestCoins: number;
  /** Эцэг эхээ аварч түүх дуусгасан эсэх — дахин эхлэхэд story алгасах боломж */
  storyCompleted: boolean;
}

const EMPTY: Records = {
  bestDays: 0,
  bestLivestock: 0,
  bestCoins: 0,
  storyCompleted: false,
};

let cache: Records | null = null;

export function loadRecords(): Records {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) {
      cache = { ...EMPTY };
      return cache;
    }
    const v = JSON.parse(raw) as Partial<Records>;
    cache = {
      bestDays: typeof v.bestDays === "number" ? v.bestDays : 0,
      bestLivestock: typeof v.bestLivestock === "number" ? v.bestLivestock : 0,
      bestCoins: typeof v.bestCoins === "number" ? v.bestCoins : 0,
      storyCompleted: v.storyCompleted === true,
    };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

function persist(records: Records): void {
  cache = records;
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // localStorage хаалттай орчинд алдаа хаяхгүй
  }
}

export function hasAnyRecord(): boolean {
  const r = loadRecords();
  return (
    r.bestDays > 0 ||
    r.bestLivestock > 0 ||
    r.bestCoins > 0 ||
    r.storyCompleted
  );
}

/** Түүх (аав ээжийг аврах) дууссаныг сануулна */
export function markStoryCompleted(): void {
  const current = loadRecords();
  if (current.storyCompleted) return;
  persist({ ...current, storyCompleted: true });
}

export function hasCompletedStory(): boolean {
  return loadRecords().storyCompleted;
}

/**
 * Амжилт тоологдох фазууд. Цэс, оршил дээр сууж байхад эхлэлийн төлөв
 * (1 өдөр, 3 мал) амжилт болж бүртгэгдэхээс сэргийлнэ.
 */
function countsTowardRecords(state: GameState): boolean {
  return (
    state.phase === "playing" ||
    state.phase === "spirit" ||
    state.phase === "ger" ||
    state.phase === "elder" ||
    state.phase === "paused" ||
    state.phase === "won" ||
    state.phase === "lost"
  );
}

/**
 * Одоогийн тоглолтын үзүүлэлтийг дээд амжилттай харьцуулж, дээгүүр
 * гарсан бол шинэчилнэ. Тоглох явцад давтан дуудахад аюулгүй.
 */
export function captureRecords(state: GameState): void {
  if (!countsTowardRecords(state)) return;

  const current = loadRecords();
  const next: Records = {
    bestDays: Math.max(current.bestDays, state.world.dayNumber),
    bestLivestock: Math.max(current.bestLivestock, state.world.flock.total),
    bestCoins: Math.max(current.bestCoins, state.score),
    storyCompleted:
      current.storyCompleted ||
      state.story.milestone8Completed === true ||
      state.parentsReturned === true,
  };
  if (
    next.bestDays !== current.bestDays ||
    next.bestLivestock !== current.bestLivestock ||
    next.bestCoins !== current.bestCoins ||
    next.storyCompleted !== current.storyCompleted
  ) {
    persist(next);
  }
}
