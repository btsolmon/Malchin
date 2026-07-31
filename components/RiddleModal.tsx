"use client";

import { useEffect } from "react";
import type { RiddleUiState } from "@/lib/game/riddles";
import { spotKindLabel } from "@/lib/game/riddles";

interface RiddleModalProps {
  ui: RiddleUiState;
  onAnswer: (index: number) => void;
  onClose: () => void;
}

export default function RiddleModal({ ui, onAnswer, onClose }: RiddleModalProps) {
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
  }, [ui.feedback, ui.options.length, onAnswer, onClose]);

  const letters = ["А", "Б", "В", "Г"];

  return (
    <div
      className="riddle-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="riddle-title"
    >
      <div className="riddle-panel">
        <div className="riddle-panel-inner">
          <p className="riddle-eyebrow">{spotKindLabel(ui.spotKind)} · өв соёл</p>
          <h2 id="riddle-title" className="riddle-title">
            Асуулт
          </h2>
          <p className="riddle-question">{ui.question}</p>

          {ui.feedback !== "correct" ? (
            <ul className="riddle-options">
              {ui.options.map((opt, i) => (
                <li key={opt}>
                  <button
                    type="button"
                    className="riddle-option"
                    onClick={() => onAnswer(i)}
                  >
                    <span className="riddle-letter">{letters[i] ?? i + 1}</span>
                    <span>{opt}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {ui.feedback === "wrong" ? (
            <p className="riddle-feedback riddle-feedback-wrong">
              Буруу байна — дахин оролдоорой.
            </p>
          ) : null}

          {ui.feedback === "correct" ? (
            <div className="riddle-success">
              <p className="riddle-feedback riddle-feedback-ok">Зөв!</p>
              <p className="riddle-explain">{ui.explanation}</p>
              <p className="riddle-reward">Шагнал: {ui.rewardLabel}</p>
              <button type="button" className="riddle-close" onClick={onClose}>
                Үргэлжлүүлэх
              </button>
            </div>
          ) : (
            <button type="button" className="riddle-dismiss" onClick={onClose}>
              Хаах (Esc)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
