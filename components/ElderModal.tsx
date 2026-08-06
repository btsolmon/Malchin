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
  const [feedback, setFeedback] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const skipScrollRef = useRef(false);

  useEffect(() => {
    setSelected((i) => Math.min(i, Math.max(0, ui.trades.length - 1)));
  }, [ui.trades.length]);

  useEffect(() => {
    setFeedback(null);
  }, [ui.tab]);

  const tradeAt = useCallback(
    (index: number) => {
      const t = ui.trades[index];
      if (!t) return;
      if (t.owned) {
        setFeedback(`${t.nameMn} аль хэдийн бий.`);
        return;
      }
      if (!t.canTrade) {
        if (t.action === "sell") {
          setFeedback(`${t.nameMn.replace(" зарах", "")} алга — олж ирээд зараарай.`);
        } else {
          setFeedback(`Оноо хүрэхгүй — ${t.price} оноо хэрэгтэй. (Одоо: ${ui.score})`);
        }
        return;
      }
      onTrade(t.id);
      setFeedback(
        t.action === "sell"
          ? `${t.nameMn}: +${t.price} оноо`
          : `${t.nameMn} авлаа! (−${t.price})`,
      );
    },
    [onTrade, ui.score, ui.trades],
  );

  const selectByKey = useCallback((next: number) => {
    skipScrollRef.current = false;
    setSelected(next);
  }, []);

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
      <div
        className={`elder-panel ${eyeClass}`}
        style={{
          width: "min(640px, 94%)",
          maxHeight: "min(520px, 92%)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: "2px solid #e8c56a",
          borderRadius: 14,
          background: "rgba(26, 17, 10, 0.97)",
        }}
      >
        <div
          style={{
            padding: "14px 20px 16px",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div className="elder-tabs" style={{ margin: "0 0 8px", justifyContent: "center" }}>
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
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  gap: 12,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#e8c56a",
                    letterSpacing: "0.04em",
                  }}
                >
                  АРИЛЖАА
                </h2>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#f2e8d5" }}>
                  Оноо: {ui.score}
                </span>
              </div>

              <ul
                ref={listRef}
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: "0 2px 0 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  overflowX: "hidden",
                  overflowY: "auto",
                  height: 264,
                  minHeight: 264,
                  maxHeight: 264,
                  flexShrink: 0,
                }}
              >
                {ui.trades.map((t, i) => {
                  const afford = t.canTrade || t.owned;
                  const isSelected = selected === i;
                  return (
                    <li key={t.id} style={{ margin: 0, padding: 0, flexShrink: 0 }}>
                      <button
                        type="button"
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
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          display: "grid",
                          gridTemplateColumns: "36px 1fr auto",
                          gap: 10,
                          alignItems: "center",
                          textAlign: "left",
                          padding: isSelected ? "7px 11px" : "8px 12px",
                          height: 48,
                          borderRadius: 8,
                          border: isSelected
                            ? "2px solid #e8c56a"
                            : "1px solid rgba(232, 197, 106, 0.22)",
                          background: t.owned
                            ? "rgba(70, 95, 55, 0.35)"
                            : isSelected
                              ? "rgba(232, 197, 106, 0.14)"
                              : "rgba(12, 10, 8, 0.6)",
                          color: "#f2e8d5",
                          font: "inherit",
                          cursor: t.owned ? "default" : "pointer",
                        }}
                      >
                        <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>
                          {t.icon}
                        </span>
                        <span
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            minWidth: 0,
                            overflow: "hidden",
                          }}
                        >
                          <strong
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: isSelected ? "#e8c56a" : "#f2e8d5",
                            }}
                          >
                            {t.nameMn}
                          </strong>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#a89880",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {t.desc}
                          </span>
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            justifySelf: "end",
                            color: t.owned
                              ? "#a0d890"
                              : afford
                                ? "#ffd060"
                                : "#e07070",
                          }}
                        >
                          {t.detail}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {feedback ? (
                <p
                  style={{
                    margin: "8px 0 0",
                    textAlign: "center",
                    fontSize: 12,
                    color: "#ffe9a8",
                    flexShrink: 0,
                  }}
                >
                  {feedback}
                </p>
              ) : (
                <p
                  style={{
                    margin: "10px 0 8px",
                    textAlign: "center",
                    fontSize: 11,
                    color: "#a89880",
                    flexShrink: 0,
                  }}
                >
                  ↑↓ гүйлгэх · Enter авах/зарах · {ui.trades.length} бараа
                  {ui.score <= 0 ? " · Эхлээд ноос г.м зарж оноо цуглуул" : ""}
                </p>
              )}
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

          <button
            type="button"
            className="elder-dismiss"
            onClick={onClose}
            style={{ alignSelf: "center", minWidth: 140, marginTop: 8 }}
          >
            Хаах (P)
          </button>
        </div>
      </div>
    </div>
  );
}
