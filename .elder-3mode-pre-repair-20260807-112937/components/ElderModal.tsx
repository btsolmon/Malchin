"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ElderUiState } from "@/lib/game/elder";
import GameIcon from "@/components/GameIcon";

interface ElderModalProps {
  ui: ElderUiState;
  onTab: (tab: "trade" | "talk") => void;
  onTrade: (itemId: string) => void;
  onStartDialogue: (id: string) => void;
  onQuizAnswer: (index: number) => void;
  onQuizNext: () => void;
  onClose: () => void;
}

const QUIZ_LETTERS = ["А", "Б", "В", "Г"];

export default function ElderModal({
  ui,
  onTab,
  onTrade,
  onStartDialogue,
  onQuizAnswer,
  onQuizNext,
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
          setFeedback(
            `${t.nameMn.replace(" зарах", "")} алга — олж ирээд зараарай.`,
          );
        } else {
          setFeedback(
            `Зоос хүрэхгүй — ${t.price} зоос хэрэгтэй. (Одоо: ${ui.score})`,
          );
        }
        return;
      }
      onTrade(t.id);
      setFeedback(
        t.action === "sell"
          ? `${t.nameMn}: +${t.price} зоос`
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

      if (ui.tab === "talk" && ui.talkIsQuiz && ui.cultureQuiz) {
        const quiz = ui.cultureQuiz;
        if (quiz.feedback === "correct") {
          if (e.code === "Enter" || e.code === "Space") {
            e.preventDefault();
            onQuizNext();
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
        if (idx != null && idx < quiz.options.length) {
          e.preventDefault();
          onQuizAnswer(idx);
        }
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
  }, [
    onClose,
    onQuizAnswer,
    onQuizNext,
    selectByKey,
    selected,
    tradeAt,
    ui.cultureQuiz,
    ui.tab,
    ui.talkIsQuiz,
    ui.trades.length,
  ]);

  const eyeClass =
    ui.eyeMode === "spirit"
      ? "elder-eyes-spirit"
      : ui.eyeMode === "rare"
        ? "elder-eyes-rare"
        : "";

  const quiz = ui.cultureQuiz;

  return (
    <div className="elder-backdrop" role="dialog" aria-modal="true">
      <div
        className={`elder-panel ${eyeClass}`}
        style={{
          width: "min(640px, 94%)",
          maxHeight: "min(560px, 94%)",
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
          <div
            className="elder-tabs"
            style={{ margin: "0 0 8px", justifyContent: "center" }}
          >
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
              {ui.talkIsQuiz ? "Асуулт" : "Яриа"}
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
                <span
                  style={{ fontSize: 14, fontWeight: 600, color: "#f2e8d5" }}
                >
                  Зоос: {ui.score}
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
                    <li
                      key={t.id}
                      style={{ margin: 0, padding: 0, flexShrink: 0 }}
                    >
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
                        <GameIcon id={t.icon} size={22} />
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
                  {ui.score <= 0
                    ? " · Эхлээд ноос г.м зарж зоос цуглуул"
                    : ""}
                </p>
              )}
            </>
          ) : ui.talkIsQuiz && quiz ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  gap: 12,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#e8c56a",
                    letterSpacing: "0.04em",
                  }}
                >
                  ӨВ СОЁЛ
                </h2>
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#f2e8d5" }}
                >
                  Зоос: {ui.score}
                </span>
              </div>

              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: "#f2e8d5",
                  fontWeight: 600,
                }}
              >
                {quiz.question}
              </p>

              {quiz.feedback !== "correct" ? (
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 11,
                    color: "#a89880",
                    textAlign: "center",
                  }}
                >
                  Зөв бол{" "}
                  <span style={{ color: "#e8c56a", fontWeight: 700 }}>
                    +{quiz.rewardScore} зоос
                  </span>
                  {" · "}
                  буруу бол явуулна
                </p>
              ) : null}

              {quiz.feedback === "correct" ? (
                <div
                  style={{
                    borderRadius: 10,
                    border: "1px solid rgba(232,197,106,0.45)",
                    background: "rgba(42,36,24,0.9)",
                    padding: "16px 14px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#e8c56a",
                    }}
                  >
                    Зөв!
                  </p>
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#ffd060",
                    }}
                  >
                    {quiz.rewardLabel}
                  </p>
                  <button
                    type="button"
                    onClick={onQuizNext}
                    style={{
                      marginTop: 14,
                      width: "100%",
                      maxWidth: 280,
                      borderRadius: 10,
                      border: "1px solid #e8c56a",
                      background: "#e8c56a",
                      color: "#1a1612",
                      fontWeight: 700,
                      fontSize: 14,
                      padding: "10px 16px",
                      cursor: "pointer",
                    }}
                  >
                    Дараагийн асуулт
                  </button>
                </div>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {quiz.options.map((opt, i) => (
                    <li key={`${quiz.questionId}-${i}`}>
                      <button
                        type="button"
                        onClick={() => onQuizAnswer(i)}
                        style={{
                          width: "100%",
                          minHeight: 56,
                          boxSizing: "border-box",
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(232,197,106,0.28)",
                          background: "rgba(12,10,8,0.65)",
                          color: "#f2e8d5",
                          font: "inherit",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: "1px solid rgba(232,197,106,0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#e8c56a",
                          }}
                        >
                          {QUIZ_LETTERS[i] ?? i + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            lineHeight: 1.35,
                            paddingTop: 4,
                          }}
                        >
                          {opt}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p
                style={{
                  margin: "10px 0 0",
                  textAlign: "center",
                  fontSize: 11,
                  color: "#a89880",
                }}
              >
                1–4 хариулах · {quiz.askedCount}/{quiz.totalCount} асуулт
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
                  <span>Зоос {ui.score}</span>
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
