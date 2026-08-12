"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DialogueBeat, ElderChoiceId } from "@/lib/game/elder";
import { speakerLabel } from "@/lib/game/elder";
import { tr, trFormat } from "@/lib/game/i18n";
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

const TYPE_SPEED_MS = 24;

function SpiritGateChoices({ onChoose }: { onChoose: (id: ElderChoiceId) => void }) {
  return (
    <div className="grid w-full gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChoose("enter_spirit")}
        className="group rounded-lg border border-sky-300/50 bg-sky-950/75 px-4 py-3 text-left shadow-lg backdrop-blur transition hover:border-sky-200 hover:bg-sky-900/80"
      >
        <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300">
          Гол шийдвэр
        </span>
        <span className="mt-1 block font-semibold text-white">{tr("Доод тив рүү одох")}</span>
        <span className="mt-1 block text-xs leading-relaxed text-sky-100/70">
          Өвгөн хаалгыг нээнэ. Аав ээжийгээ хайх зам үргэлжилнэ.
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChoose("prepare")}
        className="rounded-lg border border-stone-500/60 bg-black/55 px-4 py-3 text-left shadow-lg backdrop-blur transition hover:border-stone-300 hover:bg-black/70"
      >
        <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">
          Буцах
        </span>
        <span className="mt-1 block font-semibold text-stone-100">{tr("Бэлтгэл хангах")}</span>
        <span className="mt-1 block text-xs leading-relaxed text-stone-400">
          Одоохондоо замд гарахгүй, хэрэгтэй зүйлсээ бэлдэнэ.
        </span>
      </button>
    </div>
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
  const speakerName = speakerLabel(beat.speaker);
  const dialogueLabel = trFormat("{name} — яриа", { name: tr(speakerName) });
  const isBoySpeaking = beat.speaker === "boy";
  const otherPortraitKind =
    beat.listener ??
    (beat.speaker === "father" || beat.speaker === "mother" ? beat.speaker : "elder");
  const fullText = beat.text ?? "";
  const [visibleChars, setVisibleChars] = useState(0);
  const canRetreat = showingChoices || beatIndex > 0;
  const textFinished = visibleChars >= fullText.length;
  const visibleText = useMemo(() => fullText.slice(0, visibleChars), [fullText, visibleChars]);

  useEffect(() => {
    setVisibleChars(0);
  }, [beatIndex, fullText]);

  useEffect(() => {
    if (showingChoices || textFinished || fullText.length === 0) return;
    const timer = window.setInterval(() => {
      setVisibleChars((count) => Math.min(fullText.length, count + 1));
    }, TYPE_SPEED_MS);
    return () => window.clearInterval(timer);
  }, [fullText, showingChoices, textFinished]);

  const advanceOrReveal = useCallback(() => {
    if (showingChoices) return;
    if (!textFinished) {
      setVisibleChars(fullText.length);
      return;
    }
    onAdvance();
  }, [fullText.length, onAdvance, showingChoices, textFinished]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.code === "Escape" || event.code === "KeyP") {
        if (showingChoices) return;
        event.preventDefault();
        onClose();
        return;
      }

      if (canRetreat && (event.code === "ArrowLeft" || event.code === "Backspace")) {
        event.preventDefault();
        onRetreat();
        return;
      }

      if (
        !showingChoices &&
        (event.code === "Enter" ||
          event.code === "Space" ||
          event.code === "ArrowRight" ||
          event.code === "KeyE" ||
          event.code === "KeyJ")
      ) {
        event.preventDefault();
        advanceOrReveal();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advanceOrReveal, canRetreat, onClose, onRetreat, showingChoices]);

  return (
    <div
      className="absolute inset-0 z-50 select-none overflow-hidden bg-black/35"
      role="dialog"
      aria-modal="true"
      aria-label={dialogueLabel}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/5 via-transparent to-black/80" />

      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[31%] flex items-end px-3 md:px-7">
        <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4">
          <div
            className={`origin-bottom transition-all duration-300 ${
              isBoySpeaking ? "z-10 scale-105 opacity-100" : "scale-95 opacity-45 grayscale"
            }`}
          >
            <div className="relative h-52 w-36 sm:h-64 sm:w-44 md:h-80 md:w-56">
              <DialoguePortrait kind="boy" />
            </div>
          </div>

          <div
            className={`origin-bottom transition-all duration-300 ${
              !isBoySpeaking ? "z-10 scale-105 opacity-100" : "scale-95 opacity-45 grayscale"
            }`}
          >
            <div
              className={
                otherPortraitKind === "elder"
                  ? "relative h-52 w-52 sm:h-64 sm:w-64 md:h-80 md:w-80"
                  : otherPortraitKind === "father" ||
                      otherPortraitKind === "mother"
                    ? // Хүүгээс өндөр frame — бүтэн бие + насанд хүрсэн харьцаа
                      "relative h-64 w-44 sm:h-80 sm:w-52 md:h-[22rem] md:w-72"
                    : "relative h-52 w-40 sm:h-64 sm:w-48 md:h-80 md:w-64"
              }
            >
              <DialoguePortrait kind={otherPortraitKind} eyeMode="idle" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3 md:px-6 md:pb-6">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-2 flex items-end justify-between gap-3 px-1">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/80">
                {beatIndex + 1} / {beatCount}
              </div>
              <div className="mt-0.5 text-lg font-semibold tracking-wide text-white drop-shadow md:text-xl">
                {speakerName}
              </div>
            </div>
            {!showingChoices ? (
              <div className="hidden text-[11px] text-white/45 sm:block">{tr("E / Space / J — үргэлжлүүлэх")}</div>
            ) : null}
          </div>

          <div
            className="relative overflow-hidden rounded-xl border border-white/15 bg-[#0b0b0b]/88 shadow-2xl backdrop-blur-md"
            onClick={showingChoices ? undefined : advanceOrReveal}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-300/60 to-transparent" />
            <div className="p-4 md:p-6">
              {beat.stage ? (
                <p className="mb-2 text-xs italic leading-relaxed text-stone-400 md:text-sm">({beat.stage})</p>
              ) : null}

              {showingChoices ? (
                <SpiritGateChoices onChoose={onChoose} />
              ) : (
                <div className="min-h-24 md:min-h-28">
                  <p className="whitespace-pre-wrap text-base leading-7 text-stone-100 md:text-lg md:leading-8">
                    {visibleText}
                    {!textFinished ? <span className="ml-0.5 animate-pulse text-amber-300">▌</span> : null}
                  </p>
                </div>
              )}

              <div className="mt-3 flex min-h-8 items-center justify-between border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRetreat();
                  }}
                  disabled={!canRetreat}
                  className="rounded px-2 py-1 text-xs font-medium text-white/45 transition hover:bg-white/5 hover:text-white disabled:cursor-default disabled:opacity-0"
                >
                  ← Өмнөх
                </button>

                {!showingChoices && textFinished ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAdvance();
                    }}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm font-semibold text-amber-200 transition hover:bg-white/5"
                  >
                    {beatIndex < beatCount - 1 ? tr("Үргэлжлүүлэх") : tr("Дуусгах")}
                    <span className="animate-bounce text-xs" aria-hidden>▼</span>
                  </button>
                ) : !showingChoices ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setVisibleChars(fullText.length);
                    }}
                    className="rounded px-2 py-1 text-xs text-white/45 transition hover:bg-white/5 hover:text-white"
                  >
                    Текстийг бүтнээр харуулах
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
