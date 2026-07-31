"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mountHerderGame, type HerderGameHandle } from "@/lib/game";
import type { ElderChoiceId, ElderUiSnapshot, ElderUiState } from "@/lib/game/elder";
import type { RiddleUiSnapshot, RiddleUiState } from "@/lib/game/riddles";
import ElderModal from "@/components/ElderModal";
import RiddleModal from "@/components/RiddleModal";

export default function HerderGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<HerderGameHandle | null>(null);
  const [riddleUi, setRiddleUi] = useState<RiddleUiState | null>(null);
  const [elderUi, setElderUi] = useState<ElderUiState | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = mountHerderGame(canvas, {
      onRiddleUi: (snap: RiddleUiSnapshot) => {
        setRiddleUi(snap.open ? snap : null);
      },
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

  const onRiddleAnswer = useCallback((index: number) => {
    handleRef.current?.submitRiddleAnswer(index);
  }, []);

  const onRiddleClose = useCallback(() => {
    handleRef.current?.closeRiddleModal();
  }, []);

  const onElderTab = useCallback((tab: "trade" | "talk") => {
    handleRef.current?.setElderTab(tab);
  }, []);

  const onElderTrade = useCallback((itemId: string) => {
    handleRef.current?.tradeWithElder(itemId);
  }, []);

  const onStartDialogue = useCallback((id: string) => {
    handleRef.current?.startElderDialogue(id);
  }, []);

  const onAdvanceDialogue = useCallback(() => {
    handleRef.current?.advanceElderDialogue();
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
        width={960}
        height={540}
        className="herder-stage"
        aria-label="Малчин survival тоглоом"
      />
      {elderUi ? (
        <ElderModal
          ui={elderUi}
          onTab={onElderTab}
          onTrade={onElderTrade}
          onStartDialogue={onStartDialogue}
          onAdvanceDialogue={onAdvanceDialogue}
          onChoose={onChoose}
          onClose={onElderClose}
        />
      ) : null}
      {riddleUi ? (
        <RiddleModal
          ui={riddleUi}
          onAnswer={onRiddleAnswer}
          onClose={onRiddleClose}
        />
      ) : null}
    </div>
  );
}
