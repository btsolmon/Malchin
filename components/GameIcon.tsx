"use client";

import { useEffect, useState } from "react";
import { gameIconDataUrl, type GameIconId } from "@/lib/game/icons";

interface GameIconProps {
  id: GameIconId;
  size?: number;
  className?: string;
  alt?: string;
}

export default function GameIcon({
  id,
  size = 22,
  className,
  alt = "",
}: GameIconProps) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    setSrc(gameIconDataUrl(id, size * 2));
  }, [id, size]);

  if (!src) {
    return (
      <span
        className={className}
        style={{
          display: "inline-block",
          width: size,
          height: size,
          flexShrink: 0,
        }}
        aria-hidden={!alt}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      className={className}
      style={{ display: "block", flexShrink: 0, imageRendering: "auto" }}
      draggable={false}
    />
  );
}
