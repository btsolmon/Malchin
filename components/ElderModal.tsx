"use client";

import { useEffect } from "react";
import type { ElderChoiceId, ElderUiState } from "@/lib/game/elder";
import { SPIRIT_GATE_CHOICES, speakerLabel } from "@/lib/game/elder";

interface ElderModalProps {
  ui: ElderUiState;
  onTab: (tab: "trade" | "talk") => void;
  onTrade: (itemId: string) => void;
  onStartDialogue: (id: string) => void;
  onAdvanceDialogue: () => void;
  onChoose: (id: ElderChoiceId) => void;
  onClose: () => void;
}

export default function ElderModal({
  ui,
  onTab,
  onTrade,
  onStartDialogue,
  onAdvanceDialogue,
  onChoose,
  onClose,
}: ElderModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === "Escape" || e.code === "KeyP") {
        if (ui.activeDialogue?.showingChoices) return;
        e.preventDefault();
        onClose();
        return;
      }
      if (ui.activeDialogue && !ui.activeDialogue.showingChoices && (e.code === "Enter" || e.code === "Space")) {
        e.preventDefault();
        onAdvanceDialogue();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ui.activeDialogue, onAdvanceDialogue, onClose]);

  const eyeClass =
    ui.eyeMode === "spirit"
      ? "elder-eyes-spirit"
      : ui.eyeMode === "rare"
        ? "elder-eyes-rare"
        : "";

  return (
    <div className="elder-backdrop" role="dialog" aria-modal="true">
      <div className={`elder-panel ${eyeClass}`}>
        <div className="elder-panel-inner">
          <div className="elder-header">
            <div>
              <p className="elder-eyebrow">Задарсан гэрийн дэргэд</p>
              <h2 className="elder-title">Өвгөн</h2>
            </div>
            <div className="elder-stats">
              <span>Оноо {ui.score}</span>
              <span className="elder-spirit">Сүнс/амь {ui.spiritPoints}</span>
            </div>
          </div>

          <div className="elder-tabs">
            <button
              type="button"
              className={ui.tab === "trade" ? "active" : ""}
              onClick={() => onTab("trade")}
            >
              Арилжаа
            </button>
            <button
              type="button"
              className={ui.tab === "talk" ? "active" : ""}
              onClick={() => onTab("talk")}
            >
              Яриа
            </button>
          </div>

          {ui.tab === "trade" ? (
            <ul className="elder-trades">
              {ui.trades.map((t) => (
                <li key={t.id} className={t.rare ? "rare" : ""}>
                  <div className="elder-trade-info">
                    <strong>
                      {t.nameMn}
                      {t.rare ? " · ховор" : ""}
                    </strong>
                    <span>
                      Байгаа: {t.have} · +{t.price} оноо · +{t.spirit} сүнс(=амь)
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={t.have < 1}
                    onClick={() => onTrade(t.id)}
                  >
                    Зарах
                  </button>
                </li>
              ))}
            </ul>
          ) : ui.activeDialogue ? (
            <div className="elder-dialogue">
              <p className="elder-dialogue-title">{ui.activeDialogue.title}</p>
              <p className="elder-speaker">
                [{speakerLabel(ui.activeDialogue.beat.speaker)}]
              </p>
              {ui.activeDialogue.beat.stage ? (
                <p className="elder-stage">({ui.activeDialogue.beat.stage})</p>
              ) : null}
              <p className="elder-dialogue-line">{ui.activeDialogue.beat.text}</p>
              {ui.activeDialogue.showingChoices ? (
                <div className="elder-choices">
                  {SPIRIT_GATE_CHOICES.map((c, i) => (
                    <button
                      key={c.id}
                      type="button"
                      className="elder-next"
                      onClick={() => onChoose(c.id)}
                    >
                      {i === 0 ? "A" : "B"} — {c.label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  className="elder-next"
                  onClick={onAdvanceDialogue}
                >
                  {ui.activeDialogue.beatIndex < ui.activeDialogue.beatCount - 1
                    ? "Үргэлжлүүлэх"
                    : "Сонголт"}
                </button>
              )}
            </div>
          ) : (
            <ul className="elder-dialogue-list">
              {ui.dialogues.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => onStartDialogue(d.id)}>
                    {d.title}
                    {d.heard ? " ✓" : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!ui.activeDialogue?.showingChoices ? (
            <button type="button" className="elder-dismiss" onClick={onClose}>
              Хаах (Esc)
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
