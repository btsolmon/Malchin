// Хүн 6 — меню, дэлгүүр, HUD, minimap

import {
  COLORS,
  VIEW_H,
  VIEW_W,
  WIN_SHEEP,
  WORLD_H,
  WORLD_W,
  type Camera,
  type GameState,
  type GearId,
  type InputState,
  type Vector2,
  type WeatherKind,
} from "./types";
import {
  clamp,
  formatClock,
  isNight,
  pastureCenter,
  roundRectPath,
  setMessage,
  weatherLabel,
} from "./utils";
import { audio, setMusicVol, setSfxVol, sfx } from "./audio";

export interface UiButton {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export function overButton(b: UiButton, input: InputState): boolean {
  return (
    input.mouseX >= b.x &&
    input.mouseX <= b.x + b.w &&
    input.mouseY >= b.y &&
    input.mouseY <= b.y + b.h
  );
}

export const MAIN_MENU_LABELS = ["Тоглох", "Тохиргоо", "Удирдлага", "Багийнхан"];

export function mainMenuButtons(): UiButton[] {
  const w = 230;
  const h = 46;
  const gap = 13;
  const x = (VIEW_W - w) / 2;
  const y0 = 244;
  return MAIN_MENU_LABELS.map((label, i) => ({
    x,
    y: y0 + i * (h + gap),
    w,
    h,
    label,
  }));
}

export function pauseMenuButtons(): UiButton[] {
  const w = 250;
  const h = 48;
  const gap = 16;
  const x = (VIEW_W - w) / 2;
  const y0 = VIEW_H / 2 - 30;
  return ["Үргэлжлүүлэх", "Дахин эхлэх"].map((label, i) => ({
    x,
    y: y0 + i * (h + gap),
    w,
    h,
    label,
  }));
}

export function settingsLayout(): {
  rows: Array<{ label: string; bar: UiButton }>;
  back: UiButton;
} {
  const barW = 250;
  const barX = VIEW_W / 2 - 30;
  return {
    rows: [
      { label: "Ая (Music)", bar: { x: barX, y: 226, w: barW, h: 20, label: "" } },
      {
        label: "Дууны эффект (Sound)",
        bar: { x: barX, y: 288, w: barW, h: 20, label: "" },
      },
    ],
    back: { x: (VIEW_W - 170) / 2, y: 362, w: 170, h: 44, label: "Буцах" },
  };
}

export function updateSettingsMenu(state: GameState): void {
  const input = state.input;
  const lay = settingsLayout();
  const rowCount = 3; // ая, эффект, буцах

  if (input.menuUp) {
    state.menuIndex = (state.menuIndex + rowCount - 1) % rowCount;
    sfx("move");
  }
  if (input.menuDown) {
    state.menuIndex = (state.menuIndex + 1) % rowCount;
    sfx("move");
  }

  const getters = [(): number => audio.musicVol, (): number => audio.sfxVol];
  const setters = [setMusicVol, setSfxVol];
  if (state.menuIndex < 2) {
    if (input.menuLeft) {
      setters[state.menuIndex](getters[state.menuIndex]() - 0.1);
      sfx("move");
    }
    if (input.menuRight) {
      setters[state.menuIndex](getters[state.menuIndex]() + 0.1);
      sfx("move");
    }
  }

  if (input.mouseMoved) {
    lay.rows.forEach((row, i) => {
      if (overButton(row.bar, input)) state.menuIndex = i;
    });
    if (overButton(lay.back, input)) state.menuIndex = 2;
  }
  if (input.mouseClicked) {
    lay.rows.forEach((row, i) => {
      if (overButton(row.bar, input)) {
        const rel = clamp((input.mouseX - row.bar.x) / row.bar.w, 0, 1);
        setters[i](Math.round(rel * 10) / 10);
        sfx("move");
      }
    });
    if (overButton(lay.back, input)) {
      state.menuScreen = "main";
      state.menuIndex = 1;
      sfx("select");
      return;
    }
  }

  if (input.pause || (input.confirm && state.menuIndex === 2)) {
    state.menuScreen = "main";
    state.menuIndex = 1;
    sfx("select");
  }
}

export function updateMenu(state: GameState): void {
  const input = state.input;

  if (state.menuScreen === "main") {
    const btns = mainMenuButtons();
    if (input.menuUp) {
      state.menuIndex = (state.menuIndex + btns.length - 1) % btns.length;
      sfx("move");
    }
    if (input.menuDown) {
      state.menuIndex = (state.menuIndex + 1) % btns.length;
      sfx("move");
    }
    if (input.mouseMoved) {
      btns.forEach((b, i) => {
        if (overButton(b, input)) state.menuIndex = i;
      });
    }

    let activate = -1;
    if (input.confirm) activate = state.menuIndex;
    if (input.mouseClicked) {
      const i = btns.findIndex((b) => overButton(b, input));
      if (i >= 0) activate = i;
    }

    if (activate === 0) {
      state.phase = "playing";
      setMessage(state, "10 хоньтой эхэллээ. Сүргээ хамгаал!", 5);
      sfx("select");
    } else if (activate === 1) {
      state.menuScreen = "settings";
      state.menuIndex = 0;
      sfx("select");
    } else if (activate === 2) {
      state.menuScreen = "controls";
      sfx("select");
    } else if (activate === 3) {
      state.menuScreen = "credits";
      sfx("select");
    }
    return;
  }

  if (state.menuScreen === "settings") {
    updateSettingsMenu(state);
    return;
  }

  // Удирдлага / Багийнхан — дурын товч буцаана
  if (input.confirm || input.pause || input.mouseClicked) {
    state.menuIndex = state.menuScreen === "controls" ? 2 : 3;
    state.menuScreen = "main";
    sfx("select");
  }
}

// ---------------------------------------------------------------------------
// Гэр ба дэлгүүр
// ---------------------------------------------------------------------------

export const SHOP_ITEMS: Array<{
  id: GearId;
  icon: string;
  name: string;
  desc: string;
  price: number;
}> = [
  {
    id: "dog",
    icon: "🐕",
    name: "Нохой",
    desc: "Сүргийг чононоос өөрөө хамгаална",
    price: 300,
  },
  {
    id: "horse",
    icon: "🐎",
    name: "Морь",
    desc: "Унаж явахад хурд +50%",
    price: 500,
  },
  {
    id: "bow",
    icon: "🏹",
    name: "Нум сум",
    desc: "Холын зайнаас харвана",
    price: 400,
  },
  {
    id: "gun",
    icon: "🔫",
    name: "Буу",
    desc: "Хүчтэй бөгөөд хол тусна",
    price: 800,
  },
];

export function gerLayout(): {
  chest: UiButton;
  door: UiButton;
  bedL: UiButton;
  bedR: UiButton;
  altar: UiButton;
} {
  return {
    chest: { x: 615, y: 195, w: 150, h: 105, label: "" },
    door: { x: 400, y: 452, w: 160, h: 72, label: "" },
    bedL: { x: 55, y: 300, w: 190, h: 84, label: "" },
    bedR: { x: 715, y: 300, w: 190, h: 84, label: "" },
    altar: { x: 390, y: 182, w: 180, h: 82, label: "" },
  };
}

/** Гэр доторх малчны ойролцоо байгаа зүйлс */
export function gerProximity(state: GameState): {
  nearChest: boolean;
  nearBed: boolean;
  atDoor: boolean;
} {
  const p = state.gerPlayer;
  const lay = gerLayout();
  const nearRect = (r: UiButton, range: number): boolean => {
    // Тавилгын хамгийн ойр цэг хүртэлх зай
    const nx = clamp(p.x, r.x, r.x + r.w);
    const ny = clamp(p.y, r.y, r.y + r.h);
    return Math.hypot(p.x - nx, p.y - ny) < range;
  };
  return {
    nearChest: nearRect(lay.chest, 55),
    nearBed: nearRect(lay.bedL, 50) || nearRect(lay.bedR, 50),
    atDoor: p.y > 492 && Math.abs(p.x - 480) < 90,
  };
}

export function shopLayout(): { panel: UiButton; rows: UiButton[]; close: UiButton } {
  const w = 620;
  const h = 412;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  const rows: UiButton[] = SHOP_ITEMS.map((it, i) => ({
    x: x + 24,
    y: y + 76 + i * 66,
    w: w - 48,
    h: 58,
    label: it.name,
  }));
  return {
    panel: { x, y, w, h, label: "" },
    rows,
    close: { x: x + w / 2 - 70, y: y + h - 54, w: 140, h: 40, label: "Хаах (Esc)" },
  };
}

export function buyItem(state: GameState, idx: number): void {
  const item = SHOP_ITEMS[idx];
  if (!item) return;
  if (state.player.gear[item.id]) {
    setMessage(state, `${item.name} аль хэдийн бий.`, 2);
    sfx("move");
    return;
  }
  if (state.score < item.price) {
    setMessage(state, `Оноо хүрэхгүй — ${item.price} оноо хэрэгтэй.`, 2);
    sfx("move");
    return;
  }
  state.score -= item.price;
  state.player.gear[item.id] = true;
  sfx("buy");
  if (item.id === "dog") {
    const c = pastureCenter(state.world);
    state.world.dog = {
      pos: { x: c.x + 40, y: c.y + 30 },
      vel: { x: 0, y: 0 },
      face: 1,
      attackCooldown: 0,
      hp: 60,
      maxHp: 60,
      flash: 0,
    };
  }
  if (item.id === "horse") {
    state.player.horseHp = 80;
    state.player.horseMaxHp = 80;
  }
  setMessage(state, `${item.name} худалдаж авлаа!`, 3);
}

export function updateGer(state: GameState, dt: number): void {
  const input = state.input;

  if (state.shopOpen) {
    const lay = shopLayout();
    if (input.menuUp) {
      state.menuIndex =
        (state.menuIndex + SHOP_ITEMS.length - 1) % SHOP_ITEMS.length;
      sfx("move");
    }
    if (input.menuDown) {
      state.menuIndex = (state.menuIndex + 1) % SHOP_ITEMS.length;
      sfx("move");
    }
    if (input.mouseMoved) {
      lay.rows.forEach((r, i) => {
        if (overButton(r, input)) state.menuIndex = i;
      });
    }

    const direct = [
      input.skill1,
      input.skill2,
      input.skill3,
      input.skill4,
    ].findIndex(Boolean);
    if (direct >= 0) {
      buyItem(state, direct);
    } else if (input.confirm) {
      buyItem(state, state.menuIndex);
    }

    if (input.mouseClicked) {
      const i = lay.rows.findIndex((r) => overButton(r, input));
      if (i >= 0) {
        buyItem(state, i);
      } else if (
        overButton(lay.close, input) ||
        !overButton(lay.panel, input)
      ) {
        state.shopOpen = false;
        sfx("select");
      }
    }
    if (input.pause) {
      state.shopOpen = false;
      sfx("select");
    }
    return;
  }

  // Гэр дотор алхах
  const lay = gerLayout();
  const player = state.player;
  const dir = {
    x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    y: (input.down ? 1 : 0) - (input.up ? 1 : 0),
  };
  const len = Math.hypot(dir.x, dir.y);
  player.moving = len > 0;
  if (len > 0) {
    const nx = dir.x / len;
    const ny = dir.y / len;
    player.facing = { x: nx, y: ny };
    state.gerPlayer.x = clamp(state.gerPlayer.x + nx * 170 * dt, 100, 860);
    state.gerPlayer.y = clamp(state.gerPlayer.y + ny * 170 * dt, 330, 508);
  }

  const prox = gerProximity(state);

  // Авдар: ойртоод E, эсвэл авдар дээр дарах → дэлгүүр
  if (
    (input.interact && prox.nearChest) ||
    (input.mouseClicked && overButton(lay.chest, input))
  ) {
    state.shopOpen = true;
    state.menuIndex = 0;
    state.input.interact = false;
    sfx("select");
    return;
  }

  // Ор: ойртоод E → унтаж амь нөхнө
  if (input.interact && prox.nearBed) {
    state.input.interact = false;
    if (player.sleepCooldown > 0) {
      setMessage(state, "Сая унтсан — жаахан хүлээ.", 2);
      sfx("move");
    } else {
      player.vitals.health = Math.min(
        player.vitals.maxHealth,
        player.vitals.health + 50,
      );
      player.vitals.warmth = Math.min(100, player.vitals.warmth + 40);
      player.sleepCooldown = 60;
      sfx("levelup");
      setMessage(state, "Сайхан унтаж амарлаа. +50 амь", 3);
    }
    return;
  }

  // Хаалга руу алхах, Esc, эсвэл хаалган дээр дарах → гадагш гарна
  if (
    prox.atDoor ||
    input.pause ||
    (input.mouseClicked && overButton(lay.door, input))
  ) {
    state.phase = "playing";
    player.moving = false;
    sfx("select");
  }
}

export function updatePauseMenu(state: GameState): void {
  const input = state.input;
  const btns = pauseMenuButtons();

  if (input.menuUp || input.menuDown) {
    state.pauseIndex = 1 - state.pauseIndex;
    sfx("move");
  }
  if (input.mouseMoved) {
    btns.forEach((b, i) => {
      if (overButton(b, input)) state.pauseIndex = i;
    });
  }

  let activate = -1;
  if (input.confirm) activate = state.pauseIndex;
  if (input.mouseClicked) {
    const i = btns.findIndex((b) => overButton(b, input));
    if (i >= 0) activate = i;
  }
  if (input.pause) activate = 0;

  if (activate === 0) {
    state.phase = "playing";
    sfx("select");
  } else if (activate === 1) {
    state.requestRestart = true;
    sfx("select");
  }
}


export function drawBarFancy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  color: string,
  label: string,
): void {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();

  const fillW = w * clamp(ratio, 0, 1);
  if (fillW > h / 2) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, color);
    g.addColorStop(1, shade(color, -30));
    ctx.fillStyle = g;
    roundRectPath(ctx, x, y, fillW, h, h / 2);
    ctx.fill();
    // Гялбаа
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundRectPath(ctx, x + 2, y + 1.5, Math.max(2, fillW - 4), h * 0.35, h * 0.2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.stroke();

  ctx.fillStyle = COLORS.hudText;
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText(label, x + 1, y - 4);
}

/** Hex өнгийг гэрэлтүүлэх/бараанруулах */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

export function drawWeatherIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  weather: WeatherKind,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = COLORS.hudAccent;
  ctx.fillStyle = COLORS.hudAccent;
  ctx.lineWidth = 1.5;

  if (weather === "clear") {
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5);
      ctx.stroke();
    }
  } else if (weather === "wind") {
    for (const oy of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.moveTo(-8, oy);
      ctx.quadraticCurveTo(0, oy - 3, 8, oy);
      ctx.stroke();
    }
  } else if (weather === "storm") {
    ctx.beginPath();
    ctx.arc(-3, -2, 4, 0, Math.PI * 2);
    ctx.arc(3, -2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(-6, 9);
    ctx.moveTo(1, 4);
    ctx.lineTo(-1, 9);
    ctx.moveTo(6, 4);
    ctx.lineTo(4, 9);
    ctx.stroke();
  } else {
    // snow
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -7, Math.sin(a) * -7);
      ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  const mw = 150;
  const mh = 100;
  const mx = VIEW_W - mw - 14;
  const my = VIEW_H - mh - 14;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;

  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, mx - 4, my - 4, mw + 8, mh + 8, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.3)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, mx - 4, my - 4, mw + 8, mh + 8, 6);
  ctx.stroke();

  ctx.fillStyle = "rgba(70,110,60,0.5)";
  ctx.fillRect(mx, my, mw, mh);

  // Гэр
  ctx.fillStyle = "#e8c56a";
  ctx.fillRect(mx + (WORLD_W / 2) * sx - 2, my + (WORLD_H / 2) * sy - 2, 4, 4);

  // Хонь
  ctx.fillStyle = "#f0ebe3";
  for (const s of state.world.flock.visuals) {
    ctx.fillRect(mx + s.pos.x * sx - 1, my + s.pos.y * sy - 1, 2, 2);
  }
  // Чоно
  ctx.fillStyle = "#ff5050";
  for (const w of state.world.wolves) {
    ctx.fillRect(mx + w.pos.x * sx - 1.5, my + w.pos.y * sy - 1.5, 3, 3);
  }
  // Хулгайч
  ctx.fillStyle = "#c080ff";
  for (const t of state.world.thieves) {
    ctx.fillRect(mx + t.pos.x * sx - 1.5, my + t.pos.y * sy - 1.5, 3, 3);
  }
  // Тоглогч
  ctx.fillStyle = "#60c0ff";
  ctx.fillRect(
    mx + state.player.pos.x * sx - 2,
    my + state.player.pos.y * sy - 2,
    4,
    4,
  );

  // Камерын харах хүрээ
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.strokeRect(mx + cam.x * sx, my + cam.y * sy, VIEW_W * sx, VIEW_H * sy);
}

export function drawThreatArrows(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  const threats: Array<{ pos: Vector2; color: string }> = [];
  for (const w of state.world.wolves)
    threats.push({ pos: w.pos, color: "#ff5050" });
  for (const t of state.world.thieves)
    threats.push({ pos: t.pos, color: "#c080ff" });

  for (const th of threats) {
    const sx = th.pos.x - cam.x;
    const sy = th.pos.y - cam.y;
    if (sx > -10 && sx < VIEW_W + 10 && sy > -10 && sy < VIEW_H + 10) continue;

    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;
    const dx = sx - cx;
    const dy = sy - cy;
    const ang = Math.atan2(dy, dx);
    // Ирмэг дээрх байрлал
    const margin = 26;
    const tx = clamp(cx + Math.cos(ang) * 1000, margin, VIEW_W - margin);
    const ty = clamp(cy + Math.sin(ang) * 1000, margin, VIEW_H - margin);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(ang);
    ctx.fillStyle = th.color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

export function drawUiButton(
  ctx: CanvasRenderingContext2D,
  b: UiButton,
  selected: boolean,
): void {
  ctx.fillStyle = selected ? "rgba(232,197,106,0.18)" : "rgba(12,10,8,0.72)";
  roundRectPath(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.strokeStyle = selected ? "#e8c56a" : "rgba(232,197,106,0.28)";
  ctx.lineWidth = selected ? 2 : 1;
  roundRectPath(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.stroke();

  ctx.fillStyle = selected ? "#e8c56a" : COLORS.hudText;
  ctx.font = "600 17px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6);
  ctx.textAlign = "left";
}

export function drawMenuTitle(ctx: CanvasRenderingContext2D, title: string): void {
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.fillText(title, VIEW_W / 2, 150);
  ctx.textAlign = "left";
}

export function drawBackHint(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText("Esc / Enter — буцах", VIEW_W / 2, y);
  ctx.textAlign = "left";
}

export function drawMenuMain(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  t: number,
): void {
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText("МОНГОЛ ТАЛ · SURVIVAL", VIEW_W / 2, 106);
  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 58px system-ui, sans-serif";
  ctx.fillText("МАЛЧИН", VIEW_W / 2, 166);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillText("10 хоньтой эхэлж 1000 хонь цуглуул", VIEW_W / 2, 200);
  ctx.textAlign = "left";

  const btns = mainMenuButtons();
  btns.forEach((b, i) => drawUiButton(ctx, b, i === state.menuIndex));

  ctx.textAlign = "center";
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(
    "↑↓ — сонгох · Enter — баталгаажуулах · эсвэл хулганаар дар",
    VIEW_W / 2,
    516,
  );
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

export function drawMenuSettings(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  drawMenuTitle(ctx, "ТОХИРГОО");

  const lay = settingsLayout();
  const vols = [audio.musicVol, audio.sfxVol];

  lay.rows.forEach((row, i) => {
    const sel = state.menuIndex === i;
    const cy = row.bar.y + row.bar.h / 2;

    ctx.textAlign = "right";
    ctx.fillStyle = sel ? "#e8c56a" : COLORS.hudText;
    ctx.font = sel
      ? "600 15px system-ui, sans-serif"
      : "15px system-ui, sans-serif";
    ctx.fillText(row.label, row.bar.x - 22, cy + 5);
    ctx.textAlign = "left";

    // Дууны түвшний зурвас
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRectPath(ctx, row.bar.x, row.bar.y, row.bar.w, row.bar.h, 9);
    ctx.fill();
    if (vols[i] > 0.01) {
      ctx.fillStyle = sel ? "#e8c56a" : "#a08850";
      roundRectPath(ctx, row.bar.x, row.bar.y, row.bar.w * vols[i], row.bar.h, 9);
      ctx.fill();
    }
    ctx.strokeStyle = sel ? "#e8c56a" : "rgba(232,197,106,0.3)";
    ctx.lineWidth = sel ? 2 : 1;
    roundRectPath(ctx, row.bar.x, row.bar.y, row.bar.w, row.bar.h, 9);
    ctx.stroke();

    ctx.fillStyle = COLORS.hudText;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(
      `${Math.round(vols[i] * 100)}%`,
      row.bar.x + row.bar.w + 16,
      cy + 5,
    );
  });

  drawUiButton(ctx, lay.back, state.menuIndex === 2);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(
    "← → — түвшин өөрчлөх · зурвас дээр хулганаар дарж болно",
    VIEW_W / 2,
    460,
  );
  ctx.textAlign = "left";
}

export function drawMenuControls(ctx: CanvasRenderingContext2D): void {
  drawMenuTitle(ctx, "УДИРДЛАГА");

  const lines: Array<[string, string]> = [
    ["WASD", "хөдлөх"],
    ["Space / J", "чоно, хулгайчтай тулалдах"],
    ["E", "мод огтлох · жимс түүх · гэрт орох"],
    ["Q", "жимс идэх"],
    ["F", "гал түлэх (шөнө)"],
    ["1 / 2 / 3", "ур чадвар сонгох"],
    ["Esc", "түр зогсоох"],
    ["R", "дахин эхлэх"],
  ];
  const boxW = 400;
  const boxH = lines.length * 24 + 26;
  const bx = (VIEW_W - boxW) / 2;
  const by = 180;
  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, bx, by, boxW, boxH, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.25)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, bx, by, boxW, boxH, 10);
  ctx.stroke();

  lines.forEach(([key, desc], i) => {
    const ly = by + 30 + i * 24;
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.hudAccent;
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(key, bx + 140, ly);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(desc, bx + 158, ly);
  });

  drawBackHint(ctx, by + boxH + 36);
}

export function drawMenuCredits(ctx: CanvasRenderingContext2D): void {
  drawMenuTitle(ctx, "БАГИЙНХАН");

  const lines: Array<[string, string]> = [
    ["Тоглоомын цөм", "———"],
    ["Дайсан ба AI", "———"],
    ["Survival механик", "———"],
    ["График", "———"],
    ["UI/UX ба дуу", "———"],
  ];

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillText("Малчин — багийн төсөл", VIEW_W / 2, 192);
  ctx.textAlign = "left";

  lines.forEach(([role, name], i) => {
    const ly = 236 + i * 30;
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.hudAccent;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(role, VIEW_W / 2 - 14, ly);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(name, VIEW_W / 2 + 14, ly);
  });

  drawBackHint(ctx, 420);
}

/** Меню — үндсэн, тохиргоо, удирдлага, багийнхан дэлгэцүүд */
export function drawMenu(ctx: CanvasRenderingContext2D, state: GameState): void {
  const t = performance.now() / 1000;

  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "rgba(10,8,6,0.85)");
  g.addColorStop(1, "rgba(10,8,6,0.62)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (state.menuScreen === "main") drawMenuMain(ctx, state, t);
  else if (state.menuScreen === "settings") drawMenuSettings(ctx, state);
  else if (state.menuScreen === "controls") drawMenuControls(ctx);
  else drawMenuCredits(ctx);
}

export function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { player, world } = state;
  const pad = 14;

  // Эхлэх меню — HUD-ын оронд зөвхөн меню харуулна
  if (state.phase === "menu") {
    drawMenu(ctx, state);
    return;
  }

  // Зүүн дээд самбар
  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, pad, pad, 296, 218, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.3)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, pad, pad, 296, 218, 10);
  ctx.stroke();

  drawBarFancy(
    ctx,
    pad + 14,
    pad + 26,
    266,
    12,
    player.vitals.health / player.vitals.maxHealth,
    "#d64545",
    `Амьдрал ${Math.ceil(player.vitals.health)}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 58,
    266,
    12,
    player.vitals.hunger / player.vitals.maxHunger,
    "#c4a035",
    `Өлсгөлөн ${Math.ceil(player.vitals.hunger)}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 90,
    266,
    12,
    player.vitals.warmth / player.vitals.maxWarmth,
    "#ff9f5a",
    `Дулаан ${Math.ceil(player.vitals.warmth)}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 122,
    266,
    12,
    world.flock.total / WIN_SHEEP,
    "#d4c4a0",
    `Хонь ${world.flock.total} / ${WIN_SHEEP}`,
  );
  drawBarFancy(
    ctx,
    pad + 14,
    pad + 154,
    266,
    12,
    clamp(state.xp / state.xpNext, 0, 1),
    "#9060d0",
    `Түвшин ${state.level} · XP ${Math.floor(state.xp)} / ${state.xpNext}`,
  );

  // Нөөц
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillStyle = "#c49a6c";
  ctx.fillText(`🪵 ${player.inventory.wood}`, pad + 14, pad + 198);
  ctx.fillStyle = "#e890b0";
  ctx.fillText(`🍒 ${player.inventory.berries}`, pad + 80, pad + 198);
  ctx.fillStyle = COLORS.hudAccent;
  ctx.fillText(`Өдөр ${world.dayNumber}`, pad + 150, pad + 198);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.fillText(`Оноо ${state.score}`, pad + 218, pad + 198);

  // Баруун дээд: цаг агаар
  const panelW = 196;
  const rx = VIEW_W - panelW - pad;
  ctx.fillStyle = "rgba(12,10,8,0.72)";
  roundRectPath(ctx, rx, pad, panelW, 58, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,197,106,0.3)";
  roundRectPath(ctx, rx, pad, panelW, 58, 10);
  ctx.stroke();

  drawWeatherIcon(ctx, rx + 22, pad + 29, world.weather);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(weatherLabel(world.weather, world.season), rx + 40, pad + 24);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(
    `Цаг ${formatClock(world.timeOfDay)} ${isNight(world) ? "🌙" : "☀️"}`,
    rx + 40,
    pad + 44,
  );

  // Аюулын мэдээлэл
  if (world.wolves.length > 0 || world.thieves.length > 0) {
    const parts: string[] = [];
    if (world.wolves.length) parts.push(`Чоно ${world.wolves.length}`);
    if (world.thieves.length) {
      const stolen = world.thieves.reduce((s, t) => s + t.stolen, 0);
      parts.push(`Хулгайч (−${stolen} хонь)`);
    }
    const text = parts.join("  ·  ");
    ctx.font = "600 13px system-ui, sans-serif";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(120,20,20,0.8)";
    roundRectPath(ctx, VIEW_W / 2 - tw / 2 - 14, pad, tw + 28, 30, 15);
    ctx.fill();
    ctx.fillStyle = "#ffc0c0";
    ctx.fillText(text, VIEW_W / 2 - tw / 2, pad + 20);
  }

  // Эзэмшсэн эд зүйлс — зүүн доод булан
  const gearIcons = SHOP_ITEMS.filter((it) => player.gear[it.id])
    .map((it) => it.icon)
    .join(" ");
  if (gearIcons) {
    ctx.font = "15px system-ui, sans-serif";
    const gw = ctx.measureText(gearIcons).width;
    ctx.fillStyle = "rgba(12,10,8,0.72)";
    roundRectPath(ctx, 14, VIEW_H - 46, gw + 26, 32, 16);
    ctx.fill();
    ctx.fillText(gearIcons, 27, VIEW_H - 24);
  }

  // Мессеж
  if (state.messageTimer > 0 && state.message && state.phase === "playing") {
    const alpha = clamp(state.messageTimer / 0.4, 0, 1);
    ctx.font = "14px system-ui, sans-serif";
    const tw = ctx.measureText(state.message).width;
    const mx = (VIEW_W - tw) / 2 - 14;
    const my = VIEW_H - 46;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(12,10,8,0.78)";
    roundRectPath(ctx, mx, my, tw + 28, 30, 15);
    ctx.fill();
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText(state.message, mx + 14, my + 20);
    ctx.globalAlpha = 1;
  }

  // Пауз дэлгэц — Resume / Restart товчлуурууд
  if (state.phase === "paused") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8c56a";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillText("ТҮР ЗОГССОН", VIEW_W / 2, VIEW_H / 2 - 70);
    ctx.textAlign = "left";

    const btns = pauseMenuButtons();
    btns.forEach((b, i) => drawUiButton(ctx, b, state.pauseIndex === i));

    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(
      "↑↓ / Enter · хулгана · Esc — үргэлжлүүлэх",
      VIEW_W / 2,
      VIEW_H / 2 + 118,
    );
    ctx.textAlign = "left";
  }

  // Түвшин ахих — ур чадвар сонгох дэлгэц
  if (state.phase === "levelup") {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#c0a0ff";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.fillText(`ТҮВШИН ${state.level}!`, VIEW_W / 2, 120);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText("Ур чадвараа сонго — 1, 2, 3 товч дар", VIEW_W / 2, 152);

    const cardW = 240;
    const cardH = 130;
    const gap = 24;
    const x0 = (VIEW_W - (cardW * 3 + gap * 2)) / 2;
    const y0 = 195;

    state.skillChoices.forEach((skill, i) => {
      const cx = x0 + i * (cardW + gap);
      ctx.fillStyle = "rgba(25,20,35,0.92)";
      roundRectPath(ctx, cx, y0, cardW, cardH, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(192,160,255,0.5)";
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, cx, y0, cardW, cardH, 12);
      ctx.stroke();

      ctx.fillStyle = "#9060d0";
      ctx.beginPath();
      ctx.arc(cx + cardW / 2, y0 + 32, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.fillText(String(i + 1), cx + cardW / 2, y0 + 37);

      ctx.fillStyle = COLORS.hudAccent;
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText(skill.name, cx + cardW / 2, y0 + 76);
      ctx.fillStyle = COLORS.hudMuted;
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(skill.desc, cx + cardW / 2, y0 + 100);
    });
    ctx.textAlign = "left";
  }

  // Төгсгөлийн дэлгэц
  if (state.phase === "won" || state.phase === "lost") {
    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = "center";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillStyle = state.phase === "won" ? "#e8c56a" : "#ff6b6b";
    ctx.fillText(
      state.phase === "won" ? "ЯЛАЛТ!" : "ЯЛАГДЛАА",
      VIEW_W / 2,
      VIEW_H / 2 - 30,
    );

    ctx.fillStyle = COLORS.hudText;
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(
      state.phase === "won"
        ? `${WIN_SHEEP} хоньтой сүрэг бүрдүүллээ!`
        : state.message,
      VIEW_W / 2,
      VIEW_H / 2 + 8,
    );
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(
      `Түвшин: ${state.level} · Өдөр: ${state.world.dayNumber} · Хонь: ${state.world.flock.total} · Оноо: ${state.score}`,
      VIEW_W / 2,
      VIEW_H / 2 + 36,
    );
    ctx.fillStyle = COLORS.hudAccent;
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillText("R — дахин эхлэх", VIEW_W / 2, VIEW_H / 2 + 70);
    ctx.textAlign = "left";
  }
}

// ---------------------------------------------------------------------------
// Гэрийн дотор
// ---------------------------------------------------------------------------

/** Монгол гэрийн дотор — тооно, унь, хана, зуух, авдар, ор */

export function drawShop(ctx: CanvasRenderingContext2D, state: GameState): void {
  const lay = shopLayout();
  const { panel, rows, close } = lay;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = "rgba(26,17,10,0.97)";
  roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.fill();
  ctx.strokeStyle = "#e8c56a";
  ctx.lineWidth = 2;
  roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#e8c56a";
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.fillText("ДЭЛГҮҮР", VIEW_W / 2, panel.y + 40);
  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText(`Оноо: ${state.score}`, panel.x + panel.w - 26, panel.y + 40);
  ctx.textAlign = "left";

  rows.forEach((r, i) => {
    const item = SHOP_ITEMS[i];
    const owned = state.player.gear[item.id];
    const selected = state.menuIndex === i;
    const afford = state.score >= item.price;

    ctx.fillStyle = owned
      ? "rgba(70,95,55,0.35)"
      : selected
        ? "rgba(232,197,106,0.14)"
        : "rgba(12,10,8,0.6)";
    roundRectPath(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = selected ? "#e8c56a" : "rgba(232,197,106,0.22)";
    ctx.lineWidth = selected ? 2 : 1;
    roundRectPath(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.stroke();

    // Icon
    ctx.font = "26px system-ui, sans-serif";
    ctx.fillText(item.icon, r.x + 14, r.y + 38);

    // Нэр ба тайлбар
    ctx.fillStyle = selected ? "#e8c56a" : COLORS.hudText;
    ctx.font = "600 16px system-ui, sans-serif";
    ctx.fillText(`${i + 1}. ${item.name}`, r.x + 56, r.y + 24);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(item.desc, r.x + 56, r.y + 44);

    // Үнэ / эзэмшсэн
    ctx.textAlign = "right";
    if (owned) {
      ctx.fillStyle = "#a0d890";
      ctx.font = "600 14px system-ui, sans-serif";
      ctx.fillText("Эзэмшсэн ✓", r.x + r.w - 16, r.y + 34);
    } else {
      ctx.fillStyle = afford ? "#ffd060" : "#e07070";
      ctx.font = "600 15px system-ui, sans-serif";
      ctx.fillText(`${item.price} оноо`, r.x + r.w - 16, r.y + 34);
    }
    ctx.textAlign = "left";
  });

  drawUiButton(ctx, close, false);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(
    "↑↓ + Enter · 1-4 товч · эсвэл хулганаар дар",
    VIEW_W / 2,
    panel.y + panel.h + 24,
  );
  ctx.textAlign = "left";
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
