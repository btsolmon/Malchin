"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  HerderGameHandle,
  TouchHoldAction,
  TouchPulseAction,
} from "@/lib/game/engine";
import {
  mobileFullscreenHintMn,
  syncVisualViewportVars,
  toggleImmersiveDisplay,
} from "@/lib/game/display";
import { gameIconUrl, type GameIconId } from "@/lib/game/icons";

type Props = {
  gameRef: React.RefObject<HerderGameHandle | null>;
  /** Өвгөний цонх нээлттэй үед нууна */
  hidden?: boolean;
};

function TouchGlyph({
  icon,
  size = 28,
  letter,
}: {
  icon?: GameIconId;
  size?: number;
  letter?: string;
}) {
  if (icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="touch-glyph"
        src={gameIconUrl(icon)}
        alt=""
        width={size}
        height={size}
        draggable={false}
      />
    );
  }
  return <span className="touch-glyph-letter">{letter}</span>;
}

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
  const [fsHint, setFsHint] = useState<string | null>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const gameRefStable = useRef(gameRef);
  gameRefStable.current = gameRef;

  const clearMove = useCallback(() => {
    pointerId.current = null;
    if (knobRef.current) knobRef.current.style.transform = "translate(0, 0)";
    gameRefStable.current.current?.setTouchMove(0, 0);
  }, []);

  const clearHolds = useCallback(() => {
    const g = gameRefStable.current.current;
    if (!g) return;
    g.setTouchHold("attack", false);
    g.setTouchHold("shoot", false);
    g.setTouchHold("herd", false);
  }, []);

  const clearAllTouch = useCallback(() => {
    clearMove();
    clearHolds();
  }, [clearMove, clearHolds]);

  useEffect(() => {
    setShow(isTouchDevice());
    const syncOrient = () => {
      setPortrait(isPortrait());
      syncVisualViewportVars();
      // Эргүүлэх үед pointer алдагдаж хөдөлгөөн гацдаг
      clearAllTouch();
    };
    syncOrient();
    window.addEventListener("orientationchange", syncOrient);
    window.addEventListener("resize", syncOrient);
    window.visualViewport?.addEventListener("resize", syncVisualViewportVars);
    window.visualViewport?.addEventListener("scroll", syncVisualViewportVars);
    const onBlur = () => clearAllTouch();
    const onVis = () => {
      if (document.visibilityState === "hidden") clearAllTouch();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("orientationchange", syncOrient);
      window.removeEventListener("resize", syncOrient);
      window.visualViewport?.removeEventListener(
        "resize",
        syncVisualViewportVars,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        syncVisualViewportVars,
      );
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      clearAllTouch();
    };
  }, [clearAllTouch]);

  useEffect(() => {
    if (!show || hidden) {
      clearAllTouch();
      return;
    }
    let raf = 0;
    const tick = () => {
      const phase = gameRef.current?.getPhase();
      const next =
        phase === "playing" ||
        phase === "spirit" ||
        phase === "ger" ||
        phase === "intro" ||
        phase === "paused";
      setActive((prev) => {
        if (prev && !next) clearAllTouch();
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearAllTouch();
    };
  }, [show, hidden, gameRef, clearAllTouch]);

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

  const releaseStick = () => {
    clearMove();
  };

  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Өмнөх гацсан pointer байвал цэвэрлэ
    if (pointerId.current !== null && pointerId.current !== e.pointerId) {
      clearMove();
    }
    pointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    moveStick(e);

    // Capture алдагдсан ч window дээр суллана — гацахгүй
    const onWinUp = (ev: PointerEvent) => {
      if (pointerId.current !== ev.pointerId) return;
      releaseStick();
      window.removeEventListener("pointerup", onWinUp);
      window.removeEventListener("pointercancel", onWinUp);
    };
    window.addEventListener("pointerup", onWinUp);
    window.addEventListener("pointercancel", onWinUp);
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
    releaseStick();
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

  const onFullscreen = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearAllTouch();
    void toggleImmersiveDisplay().then((result) => {
      window.dispatchEvent(new Event("resize"));
      if (result === "hint") {
        setFsHint(mobileFullscreenHintMn());
        window.setTimeout(() => setFsHint(null), 7000);
      } else {
        setFsHint(null);
      }
    });
  };

  return (
    <div className="touch-controls" aria-hidden>
      {fsHint ? <div className="touch-fs-hint">{fsHint}</div> : null}
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
          className="touch-btn touch-btn-inventory"
          onPointerDown={pulse("inventory")}
          aria-label="Inventory"
        >
          Inv
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
        onLostPointerCapture={releaseStick}
      >
        <div ref={knobRef} className="touch-stick-knob" />
      </div>

      {/* Зүүн дунд — H / G / N / B */}
      <div className="touch-utility">
        <button
          type="button"
          className="touch-btn touch-btn-horse"
          onPointerDown={pulse("horseMount")}
          aria-label="Horse"
        >
          <TouchGlyph icon="horse" size={26} letter="E" />
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-pack"
          onPointerDown={pulse("migrate")}
          aria-label="Pack"
        >
          <TouchGlyph icon="camel" size={26} letter="G" />
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-herd"
          onPointerDown={hold("herd")}
          aria-label="Herd"
        >
          <TouchGlyph icon="sheep" size={26} letter="N" />
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-fence"
          onPointerDown={pulse("buildFence")}
          aria-label="Fence"
        >
          <TouchGlyph icon="fence" size={24} letter="B" />
        </button>
      </div>

      <div className="touch-actions">
        <button
          type="button"
          className="touch-btn touch-btn-parry"
          onPointerDown={pulse("parry")}
          aria-label="Parry"
        >
          <TouchGlyph icon="shield" size={28} />
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-dodge"
          onPointerDown={pulse("dodge")}
          aria-label="Dodge"
        >
          <TouchGlyph icon="dodge" size={28} />
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-attack"
          onPointerDown={hold("attack")}
          aria-label="Attack"
        >
          <TouchGlyph icon="punch" size={36} />
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-interact"
          onPointerDown={pulse("interact")}
          aria-label="Interact"
        >
          <TouchGlyph icon="hand" size={28} />
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-bow"
          onPointerDown={hold("shoot")}
          aria-label="Bow"
        >
          <TouchGlyph icon="bow" size={26} />
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-eat"
          onPointerDown={pulse("eat")}
          aria-label="Eat"
        >
          <TouchGlyph icon="berry" size={26} />
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-fire"
          onPointerDown={pulse("lightFire")}
          aria-label="Fire"
        >
          <TouchGlyph icon="fire" size={26} />
        </button>
      </div>
    </div>
  );
}
