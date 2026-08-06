"use client";

import { useEffect, useRef } from "react";
import { drawElder, drawPlayer } from "@/lib/game/render/entities";
import type { Camera, Elder, Player } from "@/lib/game/types";

export type DialoguePortraitKind = "boy" | "elder";

interface DialoguePortraitProps {
  kind: DialoguePortraitKind;
  /** Өвгөний нүд — сүнсний яриа үед glow */
  eyeMode?: Elder["eyeMode"];
  className?: string;
}

const CAM: Camera = { x: 0, y: 0 };

function makeBoyPortrait(): Player {
  return {
    attackVariant: 2,
    pos: { x: 0, y: 0 },
    speed: 0,
    radius: 14,
    vitals: {
      health: 100,
      maxHealth: 100,
      warmth: 100,
      maxWarmth: 100,
      hunger: 100,
      maxHunger: 100,
    },
    inventory: {
      wood: 0,
      berries: 0,
      hay: 0,
      wool: 0,
      cashmere: 0,
      milk: 0,
      felt: 0,
      aaruul: 0,
      stone: 0,
      arrows: 0,
    },
    chopCooldown: 0,
    attackCooldown: 0,
    eatCooldown: 0,
    attackAnim: 0,
    attackMelee: false,
    invuln: 0,
    damageMult: 1,
    reachMult: 1,
    cooldownMult: 1,
    warmthResist: 1,
    gear: {
      dog: false,
      horse: false,
      bow: false,
      axe: false,
      urga: false,
    },
    horseHp: 0,
    horseMaxHp: 0,
    riding: false,
    sleepCooldown: 0,
    moving: false,
    // Зүүн талаас Өвгөн рүү (баруун тийш) харсан
    facing: { x: 1, y: 0 },
    stamina: 100,
    maxStamina: 100,
    staminaRegenDelay: 0,
    combatPhase: "idle",
    combatTimer: 0,
    attackHitDone: false,
    parryArmed: false,
    weapon: "staff",
    hasSkySword: false,
    meleePhase: "idle",
    meleeTimer: 0,
    meleeHitDone: false,
    attackFacing: { x: 1, y: 0 },
    dodgePhase: "idle",
    dodgeTimer: 0,
    dodgeDirection: { x: 1, y: 0 },
    parryPhase: "idle",
    parryTimer: 0,
  };
}

function makeElderPortrait(eyeMode: Elder["eyeMode"]): Elder {
  return {
    pos: { x: 0, y: 0 },
    gerPos: { x: 0, y: 0 },
    radius: 42,
    eyeMode,
  };
}

/** Тоглоомын canvas дүрийг томруулж dialogue portrait болгон зурна */
export default function DialoguePortrait({
  kind,
  eyeMode = "idle",
  className = "",
}: DialoguePortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth || 208;
    const cssH = canvas.clientHeight || 288;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const boy = makeBoyPortrait();
    const elder = makeElderPortrait(eyeMode);
    const scale = kind === "boy" ? 6.2 : 5.2;
    const groundY = kind === "boy" ? 0.78 : 0.82;

    let raf = 0;
    const t0 = performance.now();

    const frame = (now: number): void => {
      const time = (now - t0) / 1000;
      elder.eyeMode = eyeMode;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;

      // Дэлгэцийн төвд, хөлийг доод талд байрлуулж томруулна
      ctx.setTransform(
        scale * dpr,
        0,
        0,
        scale * dpr,
        (cssW / 2) * dpr,
        cssH * groundY * dpr,
      );

      if (kind === "boy") {
        drawPlayer(ctx, boy, CAM, time, false);
      } else {
        drawElder(ctx, elder, CAM, time);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [kind, eyeMode]);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      aria-hidden
    />
  );
}
