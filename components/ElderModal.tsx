"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ElderUiState } from "@/lib/game/elder";
import GameIcon from "@/components/GameIcon";

interface ElderModalProps {
  ui: ElderUiState;
  onTab: (tab: "trade" | "talk") => void;
  onLevelUp: () => void;
  onTrade: (itemId: string) => void;
  onStartDialogue: (id: string) => void;
  onQuizAnswer: (index: number) => void;
  onQuizNext: () => void;
  onClose: () => void;
}

const QUIZ_LETTERS = ["А", "Б", "В", "Г"];

type ElderScreen = "home" | "level" | "trade" | "talk";
const HOME_COUNT = 3;

export default function ElderModal({
  ui,
  onTab,
  onLevelUp,
  onTrade,
  onStartDialogue,
  onQuizAnswer,
  onQuizNext,
  onClose,
}: ElderModalProps) {
  const [screen, setScreen] = useState<ElderScreen>("home");
  const [homeSelected, setHomeSelected] = useState(0);
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
  }, [screen]);

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
    if (screen !== "trade") return;
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
  }, [screen, selected]);

  const openScreen = useCallback(
    (next: ElderScreen) => {
      setFeedback(null);
      setScreen(next);
      if (next === "trade") onTab("trade");
      if (next === "talk") onTab("talk");
    },
    [onTab],
  );

  const activateHomeChoice = useCallback(
    (index: number) => {
      if (index === 0) openScreen("level");
      else if (index === 1) openScreen("trade");
      else openScreen("talk");
    },
    [openScreen],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        if (screen === "home") onClose();
        else setScreen("home");
        return;
      }

      if (screen !== "home" && (e.code === "Backspace" || e.code === "ArrowLeft")) {
        e.preventDefault();
        setScreen("home");
        return;
      }

      if (screen === "home") {
        if (e.code === "ArrowUp" || e.code === "KeyW") {
          e.preventDefault();
          setHomeSelected((i) => (i + HOME_COUNT - 1) % HOME_COUNT);
          return;
        }
        if (e.code === "ArrowDown" || e.code === "KeyS") {
          e.preventDefault();
          setHomeSelected((i) => (i + 1) % HOME_COUNT);
          return;
        }
        const direct: Record<string, number> = {
          Digit1: 0, Numpad1: 0,
          Digit2: 1, Numpad2: 1,
          Digit3: 2, Numpad3: 2,
        };
        const directIndex = direct[e.code];
        if (directIndex != null) {
          e.preventDefault();
          setHomeSelected(directIndex);
          activateHomeChoice(directIndex);
          return;
        }
        if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") {
          e.preventDefault();
          activateHomeChoice(homeSelected);
        }
        return;
      }

      if (screen === "level") {
        if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") {
          e.preventDefault();
          if (ui.canLevelUp) onLevelUp();
          else setFeedback(`Түвшин ахихад ${ui.xpNext} XP хэрэгтэй. Одоо ${ui.xp} XP байна.`);
        }
        return;
      }

      if (screen === "talk" && ui.talkIsQuiz && ui.cultureQuiz) {
        const quiz = ui.cultureQuiz;
        if (quiz.feedback === "correct") {
          if (e.code === "Enter" || e.code === "Space") {
            e.preventDefault();
            onQuizNext();
          }
          return;
        }
        const map: Record<string, number> = {
          Digit1: 0, Numpad1: 0,
          Digit2: 1, Numpad2: 1,
          Digit3: 2, Numpad3: 2,
          Digit4: 3, Numpad4: 3,
        };
        const idx = map[e.code];
        if (idx != null && idx < quiz.options.length) {
          e.preventDefault();
          onQuizAnswer(idx);
        }
        return;
      }

      if (screen !== "trade") return;
      const n = ui.trades.length;
      if (n <= 0) return;

      if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        selectByKey((selected + n - 1) % n);
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        selectByKey((selected + 1) % n);
      } else if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") {
        e.preventDefault();
        tradeAt(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activateHomeChoice,
    homeSelected,
    onClose,
    onLevelUp,
    onQuizAnswer,
    onQuizNext,
    screen,
    selectByKey,
    selected,
    tradeAt,
    ui.canLevelUp,
    ui.cultureQuiz,
    ui.talkIsQuiz,
    ui.trades.length,
    ui.xp,
    ui.xpNext,
  ]);

  const eyeClass =
    ui.eyeMode === "spirit"
      ? "elder-eyes-spirit"
      : ui.eyeMode === "rare"
        ? "elder-eyes-rare"
        : "";

  const quiz = ui.cultureQuiz;

  return (
    <div
      className="elder-backdrop"
      role="dialog"
      aria-modal="true"
      style={{
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "28px 24px",
        background: "rgba(0, 0, 0, 0.12)",
      }}
    >
      <div
        className={`elder-panel ${eyeClass}`}
        style={{
          width: "min(430px, calc(100% - 12px))",
          maxHeight: "min(610px, calc(100vh - 56px))",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: "1px solid rgba(196, 167, 104, 0.62)",
          borderRadius: 2,
          background: "linear-gradient(180deg, rgba(18,18,17,0.965) 0%, rgba(10,10,10,0.945) 100%)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.025)",
          backdropFilter: "blur(1.5px)",
        }}
      >
        <div
          style={{
            padding: "0",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {screen !== "home" ? (
            <div
              style={{
                marginBottom: 0,
                minHeight: 42,
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                borderBottom: "1px solid rgba(196,167,104,0.23)",
                background: "linear-gradient(90deg, rgba(57,50,38,0.48), rgba(15,15,15,0.15))",
              }}
            >
              <button
                type="button"
                onClick={() => setScreen("home")}
                style={{
                  border: 0,
                  borderRadius: 0,
                  background: "transparent",
                  color: "#d8c8aa",
                  padding: "7px 2px",
                  cursor: "pointer",
                }}
              >
                ← Буцах
              </button>
              <span style={{ color: "#8f806b", fontSize: 11, letterSpacing: "0.12em" }}>
                P / Esc — үндсэн цэс
              </span>
            </div>
          ) : null}

          {screen === "home" ? (
            <>
              <div
                style={{
                  padding: "13px 16px 12px",
                  borderBottom: "1px solid rgba(196,167,104,0.26)",
                  background: "linear-gradient(90deg, rgba(63,54,39,0.48), rgba(18,18,17,0.05))",
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "#c7ad72", fontWeight: 700 }}>
                  ӨВГӨН
                </div>
                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#e8e0d2",
                    fontSize: 14,
                    lineHeight: 1.4,
                  }}
                >
                  Сайн уу, хүү минь. Юу хэрэгтэй вэ?
                </p>
              </div>

              <div style={{ display: "grid", gap: 0, padding: "8px 0" }}>
                {[
                  {
                    title: "ТҮВШИН АХИХ",
                    desc: `Түвшин ${ui.level} · XP ${ui.xp}/${ui.xpNext}`,
                    detail: ui.canLevelUp ? "Ахих боломжтой" : `${Math.max(0, ui.xpNext - ui.xp)} XP дутуу`,
                  },
                  {
                    title: "ХУДАЛДАА",
                    desc: "Хэрэгсэл авах, олзоо зарах",
                    detail: `${ui.score} зоос`,
                  },
                  {
                    title: ui.talkIsQuiz ? "АСУУЛТ" : "АСУУЛТ · ЯРИА",
                    desc: ui.talkIsQuiz ? "Өв соёлын асуултад хариулах" : "Өвгөнөөс зам мөр, учир явдлыг асуух",
                    detail: ui.talkIsQuiz ? "Өв соёл" : "Ярилцах",
                  },
                ].map((item, i) => {
                  const active = homeSelected === i;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onMouseEnter={() => setHomeSelected(i)}
                      onClick={() => {
                        setHomeSelected(i);
                        activateHomeChoice(i);
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "24px 1fr auto",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        minHeight: 44,
                        padding: "6px 15px",
                        borderRadius: 0,
                        border: 0,
                        borderTop: "1px solid rgba(255,255,255,0.025)",
                        borderBottom: "1px solid rgba(196,167,104,0.08)",
                        background: active
                          ? "linear-gradient(90deg, rgba(181,82,34,0.92) 0%, rgba(129,57,27,0.55) 58%, rgba(19,19,18,0.08) 100%)"
                          : "transparent",
                        color: "#f3eadc",
                        textAlign: "left",
                        cursor: "pointer",
                        boxShadow: active ? "inset 3px 0 0 #e4bd69" : "none",
                      }}
                    >
                      <span style={{ color: active ? "#ffe0a0" : "#756854", fontSize: 11, fontWeight: 800 }}>
                        {i + 1}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: 13, letterSpacing: "0.035em", color: active ? "#fff1d0" : "#ddd6ca" }}>
                          {item.title}
                        </strong>
                        <span style={{ display: "block", marginTop: 1, color: active ? "#e7c9a1" : "#847c70", fontSize: 10 }}>
                          {item.desc}
                        </span>
                      </span>
                      <span style={{ color: active ? "#f6d7a5" : i === 0 && ui.canLevelUp ? "#d8b968" : "#8f8678", fontSize: 10, whiteSpace: "nowrap" }}>
                        {item.detail}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 2,
                  padding: "8px 14px",
                  borderTop: "1px solid rgba(196,167,104,0.18)",
                  background: "rgba(0,0,0,0.28)",
                  color: "#81796d",
                  fontSize: 10,
                }}
              >
                ↑↓ / W S сонгох · E / Enter нээх · P / Esc гарах
              </div>
            </>
          ) : screen === "level" ? (
            <>
              <div
                style={{
                  padding: "11px 14px",
                  borderBottom: "1px solid rgba(196,167,104,0.22)",
                  background: "linear-gradient(90deg, rgba(57,50,38,0.42), transparent)",
                }}
              >
                <div style={{ fontSize: 13, letterSpacing: "0.08em", color: "#d6c299", fontWeight: 700 }}>ТҮВШИН АХИХ</div>
              </div>

              <div style={{ margin: "10px 14px 8px", border: "1px solid rgba(196,167,104,0.20)", borderRadius: 0, padding: 0, background: "rgba(0,0,0,0.18)" }}>
                {[
                  ["Түвшин", ui.level],
                  ["Одоогийн XP", ui.xp],
                  ["Шаардлагатай XP", ui.xpNext],
                  ["Дутуу XP", Math.max(0, ui.xpNext - ui.xp)],
                ].map(([label, value], i) => (
                  <div
                    key={String(label)}
                    style={{
                      minHeight: 34,
                      padding: "0 11px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: i === 3 ? 0 : "1px solid rgba(196,167,104,0.10)",
                      color: "#b9b0a2",
                      fontSize: 12,
                    }}
                  >
                    <span>{label}</span>
                    <strong style={{ color: i === 2 ? "#d5b866" : "#e3ddd3", fontWeight: 600 }}>{value}</strong>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (ui.canLevelUp) onLevelUp();
                  else setFeedback(`Түвшин ахихад ${ui.xpNext} XP хэрэгтэй. Одоо ${ui.xp} XP байна.`);
                }}
                style={{
                  width: "calc(100% - 28px)",
                  margin: "2px 14px 0",
                  borderRadius: 0,
                  border: ui.canLevelUp ? "1px solid rgba(211,174,91,0.72)" : "1px solid rgba(196,167,104,0.18)",
                  background: ui.canLevelUp
                    ? "linear-gradient(90deg, rgba(181,82,34,0.88), rgba(91,43,24,0.52))"
                    : "rgba(0,0,0,0.20)",
                  color: ui.canLevelUp ? "#f7e4bd" : "#69645d",
                  padding: "10px 12px",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                }}
              >
                {ui.canLevelUp ? "ТҮВШИН АХИХ" : `${Math.max(0, ui.xpNext - ui.xp)} XP ДУТУУ`}
              </button>

              <p style={{ margin: "9px 14px 0", textAlign: "left", color: "#81796d", fontSize: 10 }}>
                Түвшин ахисны дараа 3 ур чадвараас нэгийг сонгоно.
              </p>
              {feedback ? (
                <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 12, color: "#ffe9a8" }}>{feedback}</p>
              ) : null}
            </>
          ) : screen === "trade" ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 0,
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(196,167,104,0.22)",
                  background: "linear-gradient(90deg, rgba(57,50,38,0.42), transparent)",
                  gap: 12,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 16,
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
                  padding: "8px 0 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  overflowX: "hidden",
                  overflowY: "auto",
                  height: 292,
                  minHeight: 220,
                  maxHeight: 292,
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
                          padding: "6px 14px",
                          height: 44,
                          borderRadius: 0,
                          border: 0,
                          borderBottom: "1px solid rgba(196,167,104,0.09)",
                          background: t.owned
                            ? "rgba(55,72,47,0.22)"
                            : isSelected
                              ? "linear-gradient(90deg, rgba(181,82,34,0.90), rgba(92,43,24,0.42), transparent)"
                              : "transparent",
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
                              color: isSelected ? "#fff0cf" : "#d8d1c6",
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
                    padding: "0 14px",
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 0,
                  }}
                >
                  {quiz.options.map((opt, i) => (
                    <li key={`${quiz.questionId}-${i}`}>
                      <button
                        type="button"
                        onClick={() => onQuizAnswer(i)}
                        style={{
                          width: "100%",
                          minHeight: 42,
                          boxSizing: "border-box",
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          textAlign: "left",
                          padding: "7px 8px",
                          borderRadius: 0,
                          border: 0,
                          borderBottom: "1px solid rgba(196,167,104,0.10)",
                          background: "transparent",
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
            onClick={screen === "home" ? onClose : () => setScreen("home")}
            style={{
              alignSelf: "stretch",
              minWidth: 0,
              marginTop: 6,
              borderRadius: 0,
              borderLeft: 0,
              borderRight: 0,
              borderBottom: 0,
              padding: "8px 12px",
              fontSize: 10,
              opacity: 0.78,
            }}
          >
            {screen === "home" ? "Явах (P)" : "← Үндсэн цэс"}
          </button>
        </div>
      </div>
    </div>
  );
}
