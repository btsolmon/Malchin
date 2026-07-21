"use client";

import { useEffect, useRef } from "react";
import { mountHerderGame } from "@/lib/herder-game";

export default function HerderGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = mountHerderGame(canvas);
    return () => game.destroy();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={540}
      className="herder-stage"
      aria-label="Малчин survival тоглоом"
    />
  );
}
