// Тоглоомын уур амьсгалд тохирсон зураасан дүрсүүд — эможи орлох

export type GameIconId =
  | "dog"
  | "horse"
  | "horseRide"
  | "bow"
  | "axe"
  | "urga"
  | "fishingRod"
  | "sheep"
  | "goat"
  | "cattle"
  | "horseHerd"
  | "camel"
  | "wool"
  | "cashmere"
  | "milk"
  | "felt"
  | "aaruul"
  | "fish"
  | "wood"
  | "stone"
  | "berry"
  | "hay"
  | "arrow"
  | "punch"
  | "dodge"
  | "shield"
  | "hand"
  | "fire"
  | "log"
  | "empty";

const GOLD = "#e8c56a";
const CREAM = "#f2e8d5";
const BROWN = "#6a4828";
const DARK = "#2a1c12";
const RED = "#c8483a";
const SKY = "#7ec8ff";

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function strokeRound(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  color: string,
  width: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  path();
  ctx.stroke();
}

/** Төвдөө size×size дүрс зурна (x,y = төв) */
export function drawGameIcon(
  ctx: CanvasRenderingContext2D,
  id: GameIconId,
  x: number,
  y: number,
  size: number,
): void {
  const s = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  switch (id) {
    case "dog": {
      ellipse(ctx, 0, 2, 7, 5, "#8a6a48");
      ellipse(ctx, 6, -2, 4.2, 3.6, "#9a7854");
      ellipse(ctx, 4, -5.5, 2.2, 2.8, "#6a4a28");
      ellipse(ctx, 8, -5.5, 2.2, 2.8, "#6a4a28");
      ellipse(ctx, 7.5, -1.5, 1.1, 0.9, DARK);
      ellipse(ctx, 9.2, 0.2, 1.4, 1, "#4a3020");
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-6, 1);
          ctx.quadraticCurveTo(-10, 4, -8, 8);
        },
        "#6a4a28",
        1.6,
      );
      break;
    }
    case "horse":
    case "horseHerd": {
      ellipse(ctx, -1, 2, 8, 5, "#5a3a20");
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(5, 0);
          ctx.lineTo(9, -6);
          ctx.lineTo(11, -4);
        },
        "#5a3a20",
        3.2,
      );
      ellipse(ctx, 10.5, -5.5, 3.2, 2.2, "#5a3a20");
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(5, -2);
          ctx.lineTo(9, -7);
        },
        DARK,
        2,
      );
      ellipse(ctx, 11.2, -6, 0.7, 0.7, DARK);
      break;
    }
    case "horseRide": {
      ellipse(ctx, -1, 3, 8, 4.5, "#5a3a20");
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(5, 1);
          ctx.lineTo(9, -5);
          ctx.lineTo(11, -3);
        },
        "#5a3a20",
        3,
      );
      ellipse(ctx, 10.5, -4.5, 3, 2, "#5a3a20");
      // Унаач
      ellipse(ctx, 0, -2, 2.8, 3.2, "#3a5a88");
      ellipse(ctx, 0, -6, 2.2, 2.2, "#e0b890");
      break;
    }
    case "bow": {
      strokeRound(
        ctx,
        () => {
          ctx.arc(-2, 0, 9, -1.1, 1.1);
        },
        BROWN,
        2.4,
      );
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-2, -8.5);
          ctx.lineTo(-2, 8.5);
        },
        CREAM,
        1.2,
      );
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-2, 0);
          ctx.lineTo(8, 0);
        },
        "#8a7050",
        1.4,
      );
      break;
    }
    case "axe": {
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-6, 8);
          ctx.lineTo(4, -6);
        },
        BROWN,
        2.6,
      );
      ctx.fillStyle = "#a8a8b0";
      ctx.beginPath();
      ctx.moveTo(2, -8);
      ctx.lineTo(10, -4);
      ctx.lineTo(8, 0);
      ctx.lineTo(1, -4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "urga": {
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-8, 8);
          ctx.quadraticCurveTo(-2, -2, 6, -8);
        },
        BROWN,
        2.2,
      );
      strokeRound(
        ctx,
        () => {
          ctx.arc(7, -8, 4, -0.4, Math.PI * 1.4);
        },
        GOLD,
        1.6,
      );
      break;
    }
    case "fishingRod": {
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-8, 8);
          ctx.lineTo(6, -8);
        },
        BROWN,
        2,
      );
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(6, -8);
          ctx.quadraticCurveTo(10, -4, 8, 4);
        },
        SKY,
        1.2,
      );
      ellipse(ctx, 8, 5.5, 1.4, 1.4, "#3a78b0");
      break;
    }
    case "sheep": {
      ellipse(ctx, 0, 1, 8, 6, "#ebe4d6");
      ellipse(ctx, -4, -3, 3.5, 3, "#f5f0e6");
      ellipse(ctx, 3, -4, 3.2, 3, "#f5f0e6");
      ellipse(ctx, 7, 0, 3.5, 3, "#c9bfae");
      ellipse(ctx, 8, -0.5, 0.7, 0.7, DARK);
      break;
    }
    case "goat": {
      ellipse(ctx, 0, 2, 7, 5, "#d4c8b0");
      ellipse(ctx, 6, -3, 3.2, 2.8, "#c8bca2");
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(5, -5);
          ctx.quadraticCurveTo(4, -10, 2, -9);
          ctx.moveTo(7, -5);
          ctx.quadraticCurveTo(8, -10, 10, -9);
        },
        "#9a8c72",
        1.5,
      );
      ellipse(ctx, 7, -3.5, 0.6, 0.6, DARK);
      break;
    }
    case "cattle": {
      ellipse(ctx, 0, 2, 8.5, 5.5, "#7a4e28");
      ellipse(ctx, -3, 0, 3, 2.2, "#e8dcc8");
      ellipse(ctx, 7, 0, 4, 3.5, "#6a4628");
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(5, -3);
          ctx.quadraticCurveTo(3, -8, 5, -10);
          ctx.moveTo(9, -3);
          ctx.quadraticCurveTo(11, -8, 9, -10);
        },
        "#e0d4bc",
        1.6,
      );
      ellipse(ctx, 6, -1, 0.7, 0.7, DARK);
      ellipse(ctx, 8.5, -1, 0.7, 0.7, DARK);
      break;
    }
    case "camel": {
      ellipse(ctx, -2, 3, 7, 4.5, "#c49a60");
      ellipse(ctx, -4, -2, 4, 3.5, "#b88850");
      ellipse(ctx, 2, -1, 3.5, 3, "#b88850");
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(5, 1);
          ctx.lineTo(9, -5);
          ctx.lineTo(10, -3);
        },
        "#c49a60",
        2.8,
      );
      ellipse(ctx, 10, -4.5, 2.6, 2, "#c49a60");
      ellipse(ctx, 10.8, -5, 0.6, 0.6, DARK);
      break;
    }
    case "wool": {
      ellipse(ctx, 0, 0, 7, 7, "#ebe4d6");
      ellipse(ctx, -3, -2, 3.5, 3.5, "#f5f0e6");
      ellipse(ctx, 3, -3, 3.2, 3.2, CREAM);
      ellipse(ctx, 2, 3, 3, 3, "#ddd4c4");
      break;
    }
    case "cashmere": {
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-8, 6);
          ctx.quadraticCurveTo(-2, -8, 4, 4);
          ctx.quadraticCurveTo(7, 8, 9, 2);
        },
        "#d8c8b0",
        2.4,
      );
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-6, 4);
          ctx.quadraticCurveTo(0, -4, 5, 2);
        },
        CREAM,
        1.4,
      );
      break;
    }
    case "milk": {
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.moveTo(-5, -6);
      ctx.lineTo(5, -6);
      ctx.lineTo(6, 7);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = BROWN;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ellipse(ctx, 0, -7, 4, 1.6, GOLD);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(-3, -2, 2, 5);
      break;
    }
    case "felt": {
      ctx.fillStyle = "#c8b898";
      ctx.beginPath();
      ctx.moveTo(-8, -5);
      ctx.lineTo(8, -5);
      ctx.lineTo(7, 7);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fill();
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-5, -2);
          ctx.lineTo(5, -2);
          ctx.moveTo(-4, 2);
          ctx.lineTo(4, 2);
        },
        GOLD,
        1.2,
      );
      break;
    }
    case "aaruul": {
      ellipse(ctx, -3, 1, 5, 4, "#f0e0b0");
      ellipse(ctx, 4, 0, 4.5, 3.5, "#e8d498");
      ellipse(ctx, 0, -3, 3.5, 2.8, "#f5e8c0");
      ctx.strokeStyle = "#c8a860";
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case "fish": {
      ellipse(ctx, 0, 0, 8, 3.5, "#3a78b0");
      ctx.fillStyle = "#2a5a90";
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(-11, -4);
      ctx.lineTo(-11, 4);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, 5, -0.8, 1, 1, DARK);
      ellipse(ctx, 5.4, -1.1, 0.35, 0.35, CREAM);
      break;
    }
    case "wood":
    case "log": {
      ellipse(ctx, 0, 0, 8, 5, BROWN);
      ellipse(ctx, -5, 0, 3.2, 4.2, "#8a6038");
      ctx.strokeStyle = "#4a3020";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-5, 0, 2, 0, Math.PI * 2);
      ctx.stroke();
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-1, -3);
          ctx.lineTo(6, -2);
          ctx.moveTo(0, 2);
          ctx.lineTo(6, 1);
        },
        "#4a3020",
        1,
      );
      break;
    }
    case "stone": {
      ctx.fillStyle = "#8a8478";
      ctx.beginPath();
      ctx.moveTo(-7, 2);
      ctx.lineTo(-4, -6);
      ctx.lineTo(5, -5);
      ctx.lineTo(8, 1);
      ctx.lineTo(2, 6);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6a655c";
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(3, -2);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "berry": {
      for (const [ox, oy] of [
        [-3, 1],
        [3, 0],
        [0, -3],
        [1, 3],
      ] as const) {
        ellipse(ctx, ox, oy, 3.2, 3.2, RED);
        ellipse(ctx, ox - 0.8, oy - 0.8, 0.9, 0.9, "rgba(255,255,255,0.45)");
      }
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(0, -6);
          ctx.lineTo(0, -9);
        },
        "#3a6a32",
        1.4,
      );
      break;
    }
    case "hay": {
      for (let i = -3; i <= 3; i++) {
        strokeRound(
          ctx,
          () => {
            ctx.moveTo(i * 2.2, 7);
            ctx.quadraticCurveTo(i * 1.5, 0, i * 2.5 + 1, -8);
          },
          i % 2 === 0 ? "#c8e070" : "#a8c050",
          1.6,
        );
      }
      break;
    }
    case "arrow": {
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-8, 3);
          ctx.lineTo(7, -4);
        },
        "#8a7050",
        1.6,
      );
      ctx.fillStyle = "#c8c0b0";
      ctx.beginPath();
      ctx.moveTo(7, -4);
      ctx.lineTo(4, -7);
      ctx.lineTo(10, -6);
      ctx.closePath();
      ctx.fill();
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-8, 3);
          ctx.lineTo(-10, 0);
          ctx.moveTo(-8, 3);
          ctx.lineTo(-10, 5);
        },
        CREAM,
        1.2,
      );
      break;
    }
    case "punch": {
      ellipse(ctx, 1, 2, 5.5, 4.5, "#e0b890");
      ellipse(ctx, -4, 0, 3, 3.5, "#e0b890");
      ellipse(ctx, -2, -4, 2.2, 2.8, "#e0b890");
      ellipse(ctx, 2, -4.5, 2.2, 2.8, "#e0b890");
      ellipse(ctx, 5.5, -2, 2, 2.5, "#e0b890");
      break;
    }
    case "dodge": {
      strokeRound(
        ctx,
        () => {
          ctx.moveTo(-8, 2);
          ctx.quadraticCurveTo(-2, -4, 4, 1);
          ctx.moveTo(-6, 5);
          ctx.quadraticCurveTo(0, -1, 6, 4);
          ctx.moveTo(-4, -2);
          ctx.quadraticCurveTo(2, -6, 8, -1);
        },
        SKY,
        1.8,
      );
      break;
    }
    case "shield": {
      ctx.fillStyle = "#5a4830";
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(8, -5);
      ctx.lineTo(7, 4);
      ctx.quadraticCurveTo(0, 10, -7, 4);
      ctx.lineTo(-8, -5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ellipse(ctx, 0, 0, 2, 2, GOLD);
      break;
    }
    case "hand": {
      ellipse(ctx, 0, 2, 5, 6, "#e0b890");
      for (const ox of [-4, -1.5, 1.5, 4]) {
        ellipse(ctx, ox, -5, 1.6, 3.2, "#e0b890");
      }
      break;
    }
    case "fire": {
      ctx.fillStyle = "#e07030";
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.quadraticCurveTo(-8, 2, -4, -4);
      ctx.quadraticCurveTo(-2, 0, 0, -8);
      ctx.quadraticCurveTo(2, 0, 4, -4);
      ctx.quadraticCurveTo(8, 2, 0, 8);
      ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.quadraticCurveTo(-4, 2, -1, -2);
      ctx.quadraticCurveTo(0, 1, 1, -3);
      ctx.quadraticCurveTo(4, 2, 0, 6);
      ctx.fill();
      break;
    }
    case "empty": {
      ctx.fillStyle = "rgba(232,197,106,0.35)";
      ctx.font = "bold 14px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("—", 0, 1);
      break;
    }
    default:
      break;
  }

  ctx.restore();
}

/** React / HTML canvas дээр icon зурах өгөгдөл URL */
const iconDataUrlCache = new Map<string, string>();

export function gameIconDataUrl(id: GameIconId, size = 32): string {
  const key = `${id}:${size}`;
  const cached = iconDataUrlCache.get(key);
  if (cached) return cached;

  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  drawGameIcon(ctx, id, size / 2, size / 2, size * 0.88);
  const url = canvas.toDataURL("image/png");
  iconDataUrlCache.set(key, url);
  return url;
}