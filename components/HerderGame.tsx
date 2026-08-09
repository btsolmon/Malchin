"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mountHerderGame, type HerderGameHandle } from "@/lib/game";
import type { ElderChoiceId, ElderUiSnapshot, ElderUiState } from "@/lib/game/elder";
import ElderDialogueModal from "@/components/ElderDialogueModal";
import ElderModal from "@/components/ElderModal";

export default function HerderGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<HerderGameHandle | null>(null);
  const [elderUi, setElderUi] = useState<ElderUiState | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = mountHerderGame(canvas, {
      onElderUi: (snap: ElderUiSnapshot) => {
        setElderUi(snap.open ? snap : null);
      },
    });
    handleRef.current = game;
    return () => {
      game.destroy();
      handleRef.current = null;
    };
  }, []);

  const onElderTab = useCallback((tab: "trade" | "talk") => {
    handleRef.current?.setElderTab(tab);
  }, []);

  const onElderLevelUp = useCallback(() => {
    handleRef.current?.levelUpWithElder();
  }, []);

  const onElderTrade = useCallback((itemId: string) => {
    handleRef.current?.tradeWithElder(itemId);
  }, []);

  const onStartDialogue = useCallback((id: string) => {
    handleRef.current?.startElderDialogue(id);
  }, []);

  const onQuizAnswer = useCallback((index: number) => {
    handleRef.current?.submitElderQuizAnswer(index);
  }, []);

  const onQuizNext = useCallback(() => {
    handleRef.current?.advanceElderQuiz();
  }, []);

  const onAdvanceDialogue = useCallback(() => {
    handleRef.current?.advanceElderDialogue();
  }, []);

  const onRetreatDialogue = useCallback(() => {
    handleRef.current?.retreatElderDialogue();
  }, []);

  const onChoose = useCallback((id: ElderChoiceId) => {
    handleRef.current?.chooseElderOption(id);
  }, []);

  const onElderClose = useCallback(() => {
    handleRef.current?.closeElderModal();
  }, []);

  return (
    <div className="herder-stage-wrap">
      <canvas
        ref={canvasRef}
        className="herder-stage"
        aria-label="Малчин survival тоглоом"
      />
      {elderUi?.activeDialogue ? (
        <ElderDialogueModal
          beat={elderUi.activeDialogue.beat}
          beatIndex={elderUi.activeDialogue.beatIndex}
          beatCount={elderUi.activeDialogue.beatCount}
          showingChoices={elderUi.activeDialogue.showingChoices}
          onAdvance={onAdvanceDialogue}
          onRetreat={onRetreatDialogue}
          onChoose={onChoose}
          onClose={onElderClose}
        />
      ) : elderUi ? (
        <ElderModal
          ui={elderUi}
          onTab={onElderTab}
          onLevelUp={onElderLevelUp}
          onTrade={onElderTrade}
          onStartDialogue={onStartDialogue}
          onQuizAnswer={onQuizAnswer}
          onQuizNext={onQuizNext}
          onClose={onElderClose}
        />
      ) : null}
    </div>
  );
}
