import { VIEW_H, VIEW_W } from "../types";
import { clamp, roundRectPath } from "../utils";
import { tr } from "../lang";

/** Mini / main boss — EXP барын дээр, хар дэвсгэргүй цэвэр бар */
export function drawBossVitalsHud(
  ctx: CanvasRenderingContext2D,
  opts: {
    name: string;
    nameColor: string;
    hpRatio: number;
    postureRatio: number;
    hpFill: string;
    leftMeta?: string;
    rightMeta?: string;
    hpCaption?: string;
    postureCaption?: string;
    alpha?: number;
  },
): void {
  const width = Math.min(380, VIEW_W - 160);
  const x = (VIEW_W - width) / 2;
  // Hotbar ~ VIEW_H-70, EXP ~ VIEW_H-88 — бүхэлдээ дээр нь
  const hpY = VIEW_H - 132;
  const hpH = 11;
  const postY = hpY + hpH + 6;
  const postH = 5;
  const nameY = hpY - 18;
  const alpha = opts.alpha ?? 1;
  const displayName = tr(opts.name);

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.textAlign = "center";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 3.2;
  ctx.strokeText(displayName, VIEW_W / 2, nameY);
  ctx.fillStyle = opts.nameColor;
  ctx.fillText(displayName, VIEW_W / 2, nameY);

  if (opts.leftMeta || opts.rightMeta) {
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2.4;
    if (opts.leftMeta) {
      ctx.textAlign = "left";
      ctx.strokeText(opts.leftMeta, x, nameY);
      ctx.fillStyle = "#b8e4ff";
      ctx.fillText(opts.leftMeta, x, nameY);
    }
    if (opts.rightMeta) {
      ctx.textAlign = "right";
      ctx.strokeText(opts.rightMeta, x + width, nameY);
      ctx.fillStyle = "#ffd0c8";
      ctx.fillText(opts.rightMeta, x + width, nameY);
    }
  }

  const drawSlimBar = (
    by: number,
    bh: number,
    ratio: number,
    fill: string,
    track: string,
    sheen: string,
  ): void => {
    const r = clamp(ratio, 0, 1);
    ctx.fillStyle = track;
    ctx.beginPath();
    roundRectPath(ctx, x, by, width, bh, bh / 2);
    ctx.fill();
    const fw = Math.max(0, Math.floor(width * r));
    if (fw > 0) {
      ctx.save();
      ctx.beginPath();
      roundRectPath(ctx, x, by, width, bh, bh / 2);
      ctx.clip();
      ctx.fillStyle = fill;
      ctx.fillRect(x, by, fw, bh);
      ctx.fillStyle = sheen;
      ctx.fillRect(x, by, fw, Math.max(1, Math.floor(bh * 0.4)));
      ctx.restore();
    }
  };

  drawSlimBar(
    hpY,
    hpH,
    opts.hpRatio,
    opts.hpFill,
    "rgba(90,28,34,0.42)",
    "rgba(255,255,255,0.22)",
  );
  drawSlimBar(
    postY,
    postH,
    opts.postureRatio,
    "#e8c45a",
    "rgba(90,70,28,0.38)",
    "rgba(255,255,255,0.28)",
  );

  ctx.textAlign = "left";
  ctx.font = "600 9px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 2.2;
  const hpCap = tr(opts.hpCaption ?? "Амь");
  const postCap = tr(opts.postureCaption ?? "Тэнцвэр");
  ctx.strokeText(hpCap, x + width + 8, hpY + hpH - 1);
  ctx.fillStyle = "#f2d4d4";
  ctx.fillText(hpCap, x + width + 8, hpY + hpH - 1);
  ctx.strokeText(postCap, x + width + 8, postY + postH);
  ctx.fillStyle = "#ffe9a8";
  ctx.fillText(postCap, x + width + 8, postY + postH);

  ctx.restore();
}
