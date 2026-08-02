"use client";

import { useEffect, useState } from "react";
import type { RiddleUiState } from "@/lib/game/riddles";
import { spotKindLabel } from "@/lib/game/riddles";

interface RiddleModalProps {
  ui: RiddleUiState;
  onAnswer: (index: number) => void;
  onClose: () => void;
}

const LETTERS = ["А", "Б", "В", "Г"];

function useTypewriter(text: string, cps = 48): string {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, Math.max(10, Math.floor(1000 / cps)));
    return () => window.clearInterval(id);
  }, [text, cps]);

  return shown;
}

function optionTone(
  index: number,
  feedback: RiddleUiState["feedback"],
  selectedIndex: number | null,
  correctIndex: number,
): string {
  if (feedback === "correct") {
    if (index === correctIndex) {
      return "quiz-correct-ring border-[#e8c56a] bg-[#2a4a32] text-[#f2e8d5] shadow-[0_0_24px_rgba(232,197,106,0.35)]";
    }
    return "border-white/10 bg-[#1a1612]/50 text-[#f2e8d5]/35";
  }
  if (feedback === "wrong" && selectedIndex === index) {
    return "quiz-opt-wrong border-[#e07070] bg-[#4a2020] text-[#ffd0d0] shadow-[0_0_20px_rgba(224,112,112,0.35)]";
  }
  return "border-[#6a5848] bg-[#2a221a]/90 text-[#f2e8d5] hover:-translate-y-1 hover:border-[#e8c56a]/70 hover:bg-[#3a3026] hover:shadow-[0_10px_28px_rgba(0,0,0,0.45)]";
}

export default function RiddleModal({
  ui,
  onAnswer,
  onClose,
}: RiddleModalProps) {
  const typedQuestion = useTypewriter(ui.question, 52);
  const typingDone = typedQuestion.length >= ui.question.length;
  const showOptions = typingDone && ui.feedback !== "correct";

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        onClose();
        return;
      }
      if (ui.feedback === "correct") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          onClose();
        }
        return;
      }
      if (!typingDone) return;
      const map: Record<string, number> = {
        Digit1: 0,
        Numpad1: 0,
        Digit2: 1,
        Numpad2: 1,
        Digit3: 2,
        Numpad3: 2,
        Digit4: 3,
        Numpad4: 3,
      };
      const idx = map[e.code];
      if (idx != null && idx < ui.options.length) {
        e.preventDefault();
        onAnswer(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ui.feedback, ui.options.length, typingDone, onAnswer, onClose]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-3 md:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-title"
    >
      {/* Atmospheric backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(42,32,18,0.35)_0%,rgba(0,0,0,0.78)_70%)] backdrop-blur-[6px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 11px, #e8c56a 11px, #e8c56a 12px), repeating-linear-gradient(90deg, transparent, transparent 11px, #e8c56a 11px, #e8c56a 12px)",
          maskImage:
            "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />

      <div className="quiz-shell relative z-10 flex w-full max-w-2xl flex-col gap-4">
        {/* Brand title */}
        <header className="flex flex-col items-center gap-2 text-center">
          <p
            id="quiz-title"
            className="quiz-title text-3xl font-black uppercase tracking-[0.28em] text-[#e8c56a] drop-shadow-[0_2px_12px_rgba(232,197,106,0.35)] md:text-4xl"
          >
            Асуулт
          </p>
          <span className="rounded-full border border-[#e8c56a]/35 bg-[#1a1612]/80 px-3 py-1 text-[11px] font-medium tracking-wide text-[#d8c898]">
            {spotKindLabel(ui.spotKind)} · өв соёл
          </span>
        </header>

        {/* Question panel */}
        <div className="relative overflow-hidden rounded-2xl border border-[#e8c56a]/25 bg-[#14110e]/92 px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)] md:px-8 md:py-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[#e8c56a]/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -right-6 h-36 w-36 rounded-full bg-[#3a5a40]/25 blur-3xl"
          />

          <p className="relative min-h-[4.5rem] text-center text-lg font-semibold leading-relaxed text-[#f2e8d5] md:min-h-[5rem] md:text-2xl">
            {typedQuestion}
            {!typingDone ? (
              <span
                aria-hidden
                className="ml-1 inline-block h-[0.95em] w-[3px] animate-pulse bg-[#e8c56a] align-[-0.12em]"
              />
            ) : null}
          </p>

          {/* Reward tease while answering */}
          {ui.feedback !== "correct" ? (
            <p className="relative mt-4 text-center text-xs tracking-wide text-[#a89880]">
              Зөв хариулбал{" "}
              <span className="font-bold text-[#e8c56a]">
                +{ui.rewardAmount} оноо
              </span>
              {" · "}
              буруу бол{" "}
              <span className="font-bold text-[#e07070]">
                −{ui.rewardAmount + 10}
              </span>
            </p>
          ) : null}
        </div>

        {/* 2×2 answer grid */}
        {showOptions ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ui.options.map((opt, i) => (
              <li key={`${ui.question}-${i}`} className="quiz-opt">
                <button
                  type="button"
                  disabled={!typingDone}
                  onClick={() => onAnswer(i)}
                  className={`group flex h-full min-h-[4.5rem] w-full items-start gap-3 rounded-xl border-2 px-3.5 py-3.5 text-left transition-all duration-200 active:scale-[0.98] md:px-4 ${optionTone(
                    i,
                    ui.feedback,
                    ui.selectedIndex,
                    ui.correctIndex,
                  )}`}
                >
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e8c56a]/40 bg-[#e8c56a]/10 text-sm font-black text-[#e8c56a] transition-colors group-hover:bg-[#e8c56a]/20"
                  >
                    {LETTERS[i] ?? i + 1}
                  </span>
                  <span className="pt-1 text-sm leading-snug md:text-[15px]">
                    {opt}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Wrong toast */}
        {ui.feedback === "wrong" ? (
          <div className="rounded-xl border border-[#e07070]/45 bg-[#3a1818]/90 px-4 py-3 text-center shadow-lg">
            <p className="text-sm font-bold text-[#ffb0a8]">
              Буруу
              {ui.lastDelta < 0 ? ` · ${ui.lastDelta} оноо` : ""}
            </p>
            <p className="mt-0.5 text-xs text-[#d8a0a0]">
              Өөр хариулт сонгоорой
            </p>
          </div>
        ) : null}

        {/* Success panel */}
        {ui.feedback === "correct" ? (
          <div className="quiz-reward overflow-hidden rounded-2xl border border-[#e8c56a]/40 bg-linear-to-b from-[#2a2418] to-[#14110e] px-5 py-5 shadow-[0_0_40px_rgba(232,197,106,0.2)] md:px-7">
            <p className="text-center text-lg font-black tracking-wide text-[#e8c56a]">
              Зөв!
            </p>
            <p className="mt-3 text-center text-sm leading-relaxed text-[#d8c898] md:text-base">
              {ui.explanation}
            </p>

            <div className="mt-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 rounded-full border border-[#e8c56a]/50 bg-[#e8c56a]/10 px-5 py-2.5">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8c56a] text-lg font-black text-[#1a1612] shadow-[0_0_20px_rgba(232,197,106,0.55)]"
                >
                  ✦
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#a89880]">
                    Шагнал
                  </p>
                  <p className="text-xl font-black text-[#e8c56a]">
                    +{ui.rewardAmount} оноо
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-1 w-full max-w-xs rounded-xl border border-[#e8c56a] bg-[#e8c56a] px-5 py-3 text-sm font-bold text-[#1a1612] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Үргэлжлүүлэх
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="mx-auto text-xs tracking-wide text-[#a89880]/80 transition-colors hover:text-[#e8c56a]"
          >
            Хаах · Esc
          </button>
        )}
      </div>
    </div>
  );
}
