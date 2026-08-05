"use client";

import { useEffect } from "react";
import type { DialogueBeat, ElderChoiceId } from "@/lib/game/elder";
import { speakerLabel } from "@/lib/game/elder";
import DialoguePortrait from "@/components/DialoguePortrait";

interface ElderDialogueModalProps {
  beat: DialogueBeat;
  beatIndex: number;
  beatCount: number;
  showingChoices: boolean;
  onAdvance: () => void;
  onRetreat: () => void;
  onChoose: (id: ElderChoiceId) => void;
  onClose: () => void;
}

function SpiritGateCta({ onEnter }: { onEnter: () => void }) {
  return (
    <button
      type="button"
      onClick={onEnter}
      className="spirit-gate-cta group relative mx-auto flex w-full max-w-md flex-col items-center overflow-hidden rounded-xl border-2 border-[#7ec8ff]/70 bg-linear-to-b from-[#16304a] via-[#1c3a58] to-[#0e1c2e] px-6 py-5 text-center transition-transform hover:scale-[1.02] active:scale-[0.99]"
    >
      <span
        aria-hidden
        className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-[#9ad4ff]/50 bg-[#7ec8ff]/15 text-[#b8e4ff]"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2.5c-2.8 4-6.5 6-6.5 10.2a6.5 6.5 0 0013 0C18.5 8.5 14.8 6.5 12 2.5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="13.2" r="2.2" fill="currentColor" />
        </svg>
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7ec8ff]">
        Гол шийдвэр
      </span>
      <span className="mt-1.5 text-lg font-bold leading-tight text-white md:text-xl">
        Сүнсний ертөнц рүү орох
      </span>
      <span className="mt-2 max-w-sm text-xs leading-relaxed text-[#a8c8e0] md:text-sm">
        Өвгөн хаалгыг нээнэ. Аав ээжийгээ хайх аян эндээс эхэлнэ.
      </span>
      <span className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#7ec8ff]/20 px-4 py-1.5 text-sm font-semibold text-[#e8f6ff] ring-1 ring-[#7ec8ff]/40 transition-colors group-hover:bg-[#7ec8ff]/30">
        Хаалга нээх
        <span aria-hidden>→</span>
      </span>
    </button>
  );
}

export default function ElderDialogueModal({
  beat,
  beatIndex,
  beatCount,
  showingChoices,
  onAdvance,
  onRetreat,
  onChoose,
  onClose,
}: ElderDialogueModalProps) {
  const isBoySpeaking = beat.speaker === "boy";
  const speakerName = speakerLabel(beat.speaker);
  const otherPortraitKind =
    beat.listener ??
    (beat.speaker === "father" || beat.speaker === "mother"
      ? beat.speaker
      : "elder");
  const canRetreat = showingChoices || beatIndex > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === "Escape" || e.code === "KeyP") {
        if (showingChoices) return;
        e.preventDefault();
        onClose();
        return;
      }
      if (
        canRetreat &&
        (e.code === "ArrowLeft" || e.code === "Backspace")
      ) {
        e.preventDefault();
        onRetreat();
        return;
      }
      if (
        !showingChoices &&
        (e.code === "Enter" || e.code === "Space" || e.code === "ArrowRight")
      ) {
        e.preventDefault();
        onAdvance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showingChoices, canRetreat, onAdvance, onRetreat, onClose]);

  return (
    <div
      className="absolute inset-0 z-50 select-none bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${speakerName} — яриа`}
    >
      {/* Portraits — fixed band; dialogue өндөр өөрчлөгдөхөд хөдлөхгүй */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[40%] flex items-end justify-between px-4 pb-2 md:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-end justify-between">
          <div
            className={`transform transition-all duration-300 ${
              isBoySpeaking
                ? "z-10 scale-105 opacity-100"
                : "opacity-60 grayscale-30"
            }`}
          >
            <div className="relative h-48 w-36 md:h-64 md:w-48">
              <DialoguePortrait kind="boy" />
            </div>
          </div>

          <div
            className={`transform transition-all duration-300 ${
              !isBoySpeaking
                ? "z-10 scale-105 opacity-100"
                : "opacity-60 grayscale-30"
            }`}
          >
            <div className="relative h-48 w-36 md:h-64 md:w-48">
              <DialoguePortrait kind={otherPortraitKind} eyeMode="idle" />
            </div>
          </div>
        </div>
      </div>

      {/* Сүнсний хаалга — дэлгэцийн төвд тод focus */}
      {showingChoices ? (
        <div className="absolute inset-x-0 bottom-[38%] z-30 flex justify-center px-4">
          <SpiritGateCta onEnter={() => onChoose("enter_spirit")} />
        </div>
      ) : null}

      {/* Dialogue panel — fixed height band */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex h-[38%] flex-col justify-end p-3 md:p-5">
        <div className="relative mx-auto w-full max-w-3xl">
          <div className="absolute -top-7 left-4 rounded-t-md bg-[#3f3a36] px-4 py-1 text-sm font-semibold tracking-wide text-white shadow-md">
            {speakerName}
          </div>

          <div className="relative flex h-[min(200px,100%)] min-h-40 flex-col rounded-b-lg rounded-tr-lg border border-stone-300 bg-[#f5f2eb] p-4 text-stone-800 shadow-2xl md:h-48 md:p-6">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {beat.stage ? (
                <p className="mb-2 text-xs italic text-stone-500 md:text-sm">
                  ({beat.stage})
                </p>
              ) : null}
              <p className="text-base leading-relaxed md:text-lg">{beat.text}</p>
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-between gap-3">
              <button
                type="button"
                onClick={onRetreat}
                disabled={!canRetreat}
                aria-label="Өмнөх яриа"
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200/80 hover:text-stone-900 disabled:cursor-default disabled:opacity-30"
              >
                <span aria-hidden>←</span>
                Буцах
              </button>

              {showingChoices ? (
                <button
                  type="button"
                  onClick={() => onChoose("prepare")}
                  className="rounded border border-stone-400/60 bg-[#ebe6da] px-3 py-1.5 text-sm text-stone-700 transition-colors hover:border-stone-500 hover:bg-[#e0dbcf]"
                >
                  Бэлтгэл хангах
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onAdvance}
                  aria-label={
                    beatIndex < beatCount - 1 ? "Үргэлжлүүлэх" : "Сонголт"
                  }
                  className="flex cursor-pointer items-center justify-center bg-[#e05638] p-2 text-lg font-bold text-white shadow transition-colors hover:bg-[#c8462b] active:scale-95"
                >
                  •••
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
