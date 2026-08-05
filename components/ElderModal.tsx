"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const skipScrollRef = useRef(false);

  useEffect(() => {
    setSelected((i) => Math.min(i, Math.max(0, ui.trades.length - 1)));
  }, [ui.trades.length]);

  const tradeAt = useCallback(
    (index: number) => {
      const t = ui.trades[index];
      if (!t || t.owned) return;
      onTrade(t.id);
    },
    [onTrade, ui.trades],
  );

  const selectByKey = useCallback(
    (next: number) => {
      skipScrollRef.current = false;
      setSelected(next);
    },
    [],
  );

  // Зөвхөн гарны ↑↓-д жагсаалтын дотор гүйлгэнэ (хулгана/wheel-тэй зөрчилдөхгүй)
  useEffect(() => {
    if (ui.tab !== "trade") return;
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    const list = listRef.current;
    const row = rowRefs.current[selected];
    if (!list || !row) return;

    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.top < listRect.top) {
      list.scrollTop -= listRect.top - rowRect.top;
    } else if (rowRect.bottom > listRect.bottom) {
      list.scrollTop += rowRect.bottom - listRect.bottom;
    }
  }, [selected, ui.tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        onClose();
        return;
      }
      if (ui.tab !== "trade") return;
      const n = ui.trades.length;
      if (n <= 0) return;

      if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        selectByKey((selected + n - 1) % n);
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        selectByKey((selected + 1) % n);
      } else if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        tradeAt(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, selectByKey, selected, tradeAt, ui.tab, ui.trades.length]);

  const eyeClass =
    ui.eyeMode === "spirit"
      ? "elder-eyes-spirit"
      : ui.eyeMode === "rare"
        ? "elder-eyes-rare"
        : "";

  return (
    <div className="elder-backdrop" role="dialog" aria-modal="true">
      <div className={`elder-panel elder-shop-panel ${eyeClass}`}>
        <div className="elder-panel-inner elder-shop-inner">
          <div className="elder-tabs elder-shop-tabs">
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
            <>
              <div className="elder-shop-header">
                <h2 className="elder-shop-title">АРИЛЖАА</h2>
                <span className="elder-shop-score">Оноо: {ui.score}</span>
              </div>

              <ul className="elder-shop-rows" ref={listRef}>
                {ui.trades.map((t, i) => {
                  const afford = t.canTrade || t.owned;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`elder-shop-row${selected === i ? " selected" : ""}${t.owned ? " owned" : ""}${t.rare ? " rare" : ""}`}
                        ref={(el) => {
                          rowRefs.current[i] = el;
                        }}
                        onMouseEnter={() => {
                          skipScrollRef.current = true;
                          setSelected(i);
                        }}
                        onClick={() => {
                          skipScrollRef.current = true;
                          setSelected(i);
                          tradeAt(i);
                        }}
                      >
                        <span className="elder-shop-icon" aria-hidden>
                          {t.icon}
                        </span>
                        <span className="elder-shop-text">
                          <strong>{t.nameMn}</strong>
                          <em>{t.desc}</em>
                        </span>
                        <span
                          className={`elder-shop-price${t.owned ? " ok" : afford ? " price" : " bad"}`}
                        >
                          {t.detail}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="elder-shop-hint">
                ↑↓ гүйлгэх · Enter авах/зарах · {ui.trades.length} бараа
              </p>
            </>
          ) : (
            <>
              <div className="elder-header">
                <div>
                  <p className="elder-eyebrow">Задарсан гэрийн дэргэд</p>
                  <h2 className="elder-title">Өвгөн</h2>
                </div>
                <div className="elder-stats">
                  <span>Оноо {ui.score}</span>
                </div>
              </div>
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
            </>
          )}

          <button type="button" className="elder-dismiss elder-shop-close" onClick={onClose}>
            Хаах (P)
          </button>
        </div>
      </div>
    </div>
  );
}
