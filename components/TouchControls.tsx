"use client";

import { useEffect, useRef, useState } from "react";
import type {
  HerderGameHandle,
  TouchHoldAction,
  TouchPulseAction,
} from "@/lib/game/engine";
import { toggleImmersiveDisplay } from "@/lib/game/display";

type Props = {
  gameRef: React.RefObject<HerderGameHandle | null>;
  /** Өвгөний цонх нээлттэй үед нууна */
  hidden?: boolean;
};

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
}

function isPortrait(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: portrait)").matches;
}

/**
 * Утасны браузерын виртуал удирдлага.
 * Зүүн: joystick + H/G/N/B · Баруун: тулаан · Дээд зүүн: цэс / бүтэн дэлгэц
 */
export default function TouchControls({ gameRef, hidden }: Props) {
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);

  useEffect(() => {
    setShow(isTouchDevice());
    const syncOrient = () => setPortrait(isPortrait());
    syncOrient();
    window.addEventListener("orientationchange", syncOrient);
    window.addEventListener("resize", syncOrient);
    return () => {
      window.removeEventListener("orientationchange", syncOrient);
      window.removeEventListener("resize", syncOrient);
    };
  }, []);

  useEffect(() => {
    if (!show || hidden) return;
    let raf = 0;
    const tick = () => {
      const phase = gameRef.current?.getPhase();
      setActive(
        phase === "playing" ||
          phase === "spirit" ||
          phase === "ger" ||
          phase === "intro" ||
          phase === "paused",
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, hidden, gameRef]);

  if (!show || hidden) return null;

  if (portrait) {
    return (
      <div className="touch-rotate-hint" role="status">
        <div className="touch-rotate-card">
          <div className="touch-rotate-icon" aria-hidden>
            ↻
          </div>
          <p className="touch-rotate-title">Утсаа хэвтүүлээрэй</p>
          <p className="touch-rotate-sub">Rotate your phone · landscape</p>
        </div>
      </div>
    );
  }

  if (!active) return null;

  const setMove = (x: number, y: number) => {
    gameRef.current?.setTouchMove(x, y);
  };

  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    pointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveStick(e);
  };

  const moveStick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    const el = stickRef.current;
    const knob = knobRef.current;
    if (!el || !knob) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const max = r.width * 0.38;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    setMove(dx / max, dy / max);
  };

  const onStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    if (knobRef.current) knobRef.current.style.transform = "translate(0, 0)";
    setMove(0, 0);
  };

  const hold =
    (action: TouchHoldAction) => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      gameRef.current?.setTouchHold(action, true);
      const release = () => {
        gameRef.current?.setTouchHold(action, false);
        window.removeEventListener("pointerup", release);
        window.removeEventListener("pointercancel", release);
      };
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
    };

  const pulse =
    (action: TouchPulseAction) => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      gameRef.current?.pulseTouch(action);
    };

  const onFullscreen = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void toggleImmersiveDisplay();
  };

  return (
    <div className="touch-controls" aria-hidden>
      {/* Дээд зүүн — цэс/pause ба fullscreen (баруун action-тай давхцахгүй) */}
      <div className="touch-top-left">
        <button
          type="button"
          className="touch-btn touch-btn-pause"
          onPointerDown={pulse("pause")}
          aria-label="Menu"
        >
          Menu
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-fullscreen"
          onPointerDown={onFullscreen}
          aria-label="Fullscreen"
        >
          Full
        </button>
      </div>

      <div
        ref={stickRef}
        className="touch-stick"
        onPointerDown={onStickDown}
        onPointerMove={moveStick}
        onPointerUp={onStickUp}
        onPointerCancel={onStickUp}
      >
        <div ref={knobRef} className="touch-stick-knob" />
      </div>

      {/* Зүүн дунд — H / G / N / B */}
      <div className="touch-utility">
        <button
          type="button"
          className="touch-btn touch-btn-horse"
          onPointerDown={pulse("horseMount")}
        >
          H
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-pack"
          onPointerDown={pulse("migrate")}
        >
          G
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-herd"
          onPointerDown={hold("herd")}
        >
          N
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-fence"
          onPointerDown={pulse("buildFence")}
        >
          B
        </button>
      </div>

      <div className="touch-actions">
        <button
          type="button"
          className="touch-btn touch-btn-parry"
          onPointerDown={pulse("parry")}
        >
          Parry
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-dodge"
          onPointerDown={pulse("dodge")}
        >
          Dodge
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-attack"
          onPointerDown={hold("attack")}
        >
          Hit
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-interact"
          onPointerDown={pulse("interact")}
        >
          Interact
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-bow"
          onPointerDown={hold("shoot")}
        >
          Bow
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-eat"
          onPointerDown={pulse("eat")}
        >
          Eat
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-fire"
          onPointerDown={pulse("lightFire")}
        >
          Fire
        </button>
      </div>
    </div>
  );
}
