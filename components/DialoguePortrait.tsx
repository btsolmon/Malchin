"use client";

import { useEffect, useRef } from "react";
import {
  drawElder,
  drawParentNpc,
  drawPlayer,
} from "@/lib/game/render/entities";
import type { Camera, Elder, ParentNpc, Player } from "@/lib/game/types";

export type DialoguePortraitKind = "boy" | "elder" | "father" | "mother";

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
      fish: 0,
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
    staminaRegenMult: 1,
    hungerDrainMult: 1,
    gear: {
      dog: false,
      horse: false,
      bow: false,
      axe: false,
      basket: false,
      urga: false,
      fishingRod: false,
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
    tool: "melee",
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
    bowCharge: 0,
    bowChargeLock: false,
  };
}

function makeParentPortrait(role: "father" | "mother"): ParentNpc {
  return {
    role,
    pos: { x: 0, y: 0 },
    facing: { x: role === "father" ? -1 : 1, y: 0 },
    face: role === "father" ? -1 : 1,
    moving: false,
    task: "idle",
    taskTimer: 0,
    workPulse: 0,
    targetId: null,
    walkTarget: null,
    walkPhase: 0,
    insideGer: false,
    attackCooldown: 0,
    attackAnim: 0,
    hitFlash: 0,
  };
}

function makeElderPortrait(eyeMode: Elder["eyeMode"]): Elder {
  return {
    pos: { x: 0, y: 0 },
    gerPos: { x: 0, y: 0 },
    radius: 42,
    eyeMode,
    pose: "seated",
    // Хүү зүүн талаас баруун тийш хардаг тул өвгөн зүүн тийш (тоглогч руу) харна
    face: -1,
    walkPhase: 0,
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
    const cssW = canvas.clientWidth || 240;
    const cssH = canvas.clientHeight || 320;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const boy = makeBoyPortrait();
    const elder = makeElderPortrait(eyeMode);
    const parent =
      kind === "father" || kind === "mother"
        ? makeParentPortrait(kind)
        : null;

    // Дүрийн хэмжээ (pos төвөөс дээш/доош) — бүтэн багтаана
    // хүү: үс ~−24, гутал ~+14; өвгөн: толгой ~−25, хивс ~+20 (±28 өргөн)
    const above =
      kind === "boy" ? 25 : kind === "elder" ? 25 : 24;
    const below =
      kind === "boy" ? 16 : kind === "elder" ? 21 : 14;
    const halfW =
      kind === "boy" ? 16 : kind === "elder" ? 29 : 14;
    const padX = cssW * 0.06;
    const padY = cssH * 0.05;
    const scaleByW = (cssW - padX * 2) / (halfW * 2);
    const scaleByH = (cssH - padY * 2) / (above + below);
    const scale = Math.min(scaleByW, scaleByH);
    // Гутал/хивс доор бага зай үлдээж, толгой дээрээс тасрахгүй
    const groundY = (padY + above * scale) / cssH;

    let raf = 0;
    const t0 = performance.now();

    const frame = (now: number): void => {
      const time = (now - t0) / 1000;
      elder.eyeMode = eyeMode;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;

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
      } else if (kind === "elder") {
        drawElder(ctx, elder, CAM, time);
      } else if (parent) {
        drawParentNpc(ctx, parent, CAM, time);
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
