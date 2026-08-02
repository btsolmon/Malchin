"use client";

import { useEffect } from "react";
import type { ElderUiState } from "@/lib/game/elder";

interface ElderModalProps {
  ui: ElderUiState;
  onTab: (tab: "trade" | "talk") => void;
  onTrade: (itemId: string) => void;
  onStartDialogue: (id: string) => void;
  onClose: () => void;
}

export default function ElderModal({
  ui,
  onTab,
  onTrade,
  onStartDialogue,
  onClose,
}: ElderModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
                      Байгаа: {t.have} · +{t.price} оноо
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

          <button type="button" className="elder-dismiss" onClick={onClose}>
            Хаах (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
