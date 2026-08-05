import { COLORS, GameState, Player, VIEW_H, VIEW_W } from "../types";
import {
  drawChest,
  drawCraft,
  gerLayout,
  gerProximity,
  overButton,
  SHOP_ITEMS,
} from "../ui";
import { roundRectPath } from "../utils";
import { drawHerderHairBack, drawHerderHairFront } from "./entities";
import {
  drawPlayerWithSprites,
  type PlayerSpriteSet,
} from "./playerSprites";

export function drawSleepingHerder(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  scale: number,
): void {
  const bed = state.gerSleepBed === "L" ? gerLayout().bedL : gerLayout().bedR;
  const cx = bed.x + bed.w / 2;
  // Орны дээд хэсэг рүү ойртуулж хэвтүүлнэ
  const cy = bed.y + bed.h * 0.38;
  // Зүүн ор — толгой баруун тийш, баруун ор — зүүн тийш (дэрнээс хол)
  const headLeft = state.gerSleepBed === "R";
  const breath = Math.sin(time * 2.2) * 1.2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  // Босоо дүрийг хэвтүүлэх
  ctx.rotate(headLeft ? Math.PI / 2 : -Math.PI / 2);

  // Хөл
  ctx.strokeStyle = "#2a2a30";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-3.5, 3);
  ctx.lineTo(-3.5, 11);
  ctx.moveTo(3.5, 3);
  ctx.lineTo(3.5, 11);
  ctx.stroke();

  // Дээл
  const deel = ctx.createLinearGradient(-8, -10, 8, 6);
  deel.addColorStop(0, "#3a62a0");
  deel.addColorStop(1, "#24457a");
  ctx.fillStyle = deel;
  ctx.beginPath();
  ctx.ellipse(0, -1 + breath * 0.15, 9.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e8c56a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(1, -10);
  ctx.quadraticCurveTo(7, -5, 5, 1);
  ctx.stroke();
  ctx.strokeStyle = "#d88a2a";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-9, 1);
  ctx.lineTo(9, 1);
  ctx.stroke();

  // Толгой — ард үс → бүрэн тойрог → нүүр → духны өрөв
  const hy = -14 + breath * 0.1;
  drawHerderHairBack(ctx, 0, hy, 1, time);
  ctx.fillStyle = "#e0b890";
  ctx.beginPath();
  ctx.arc(0, hy, 6, 0, Math.PI * 2);
  ctx.fill();

  // Нүд аниастай (унтаж байна)
  ctx.strokeStyle = "#2a2018";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-3.2, hy - 0.5);
  ctx.quadraticCurveTo(-2, hy + 0.8, -0.6, hy - 0.5);
  ctx.moveTo(0.6, hy - 0.5);
  ctx.quadraticCurveTo(2, hy + 0.8, 3.2, hy - 0.5);
  ctx.stroke();

  // Духны өрөв — толгойн дээр
  drawHerderHairFront(ctx, 0, hy, 1);

  ctx.restore();

  // Zzz — толгойн тал руу хөвнө
  for (let i = 0; i < 3; i++) {
    const phase = (time * 0.7 + i * 0.85) % 1;
    const zx = cx + (headLeft ? -28 : 28) + Math.sin(time + i) * 4;
    const zy = cy - 22 - phase * 42;
    ctx.globalAlpha = (1 - phase) * 0.9;
    ctx.fillStyle = "#d8e8ff";
    ctx.font = `${11 + i * 3}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("z", zx, zy);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

export function drawGerInterior(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  playerSprites?: PlayerSpriteSet,
): void {
  const cx = VIEW_W / 2;
  const wallTop = 150;
  const wallBot = 330;

  // Дэвсгэр
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, "#241108");
  bg.addColorStop(1, "#150a05");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Шал
  const floor = ctx.createRadialGradient(cx, 410, 60, cx, 410, 470);
  floor.addColorStop(0, "#8a6038");
  floor.addColorStop(0.7, "#6a4526");
  floor.addColorStop(1, "#3a2412");
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.ellipse(cx, 415, 480, 180, 0, 0, Math.PI * 2);
  ctx.fill();

  // Шалны банзны зураас
  ctx.strokeStyle = "rgba(40,24,10,0.35)";
  ctx.lineWidth = 1.5;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 44, wallBot - 40);
    ctx.lineTo(cx + i * 82, VIEW_H);
    ctx.stroke();
  }

  // Гол хивс — дугуй хээтэй
  ctx.fillStyle = "#8a2828";
  ctx.beginPath();
  ctx.ellipse(cx, 420, 190, 66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8a040";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, 420, 172, 57, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(216,160,64,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, 420, 130, 42, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Хана — эсгий ба модон сүлжээ
  ctx.fillStyle = "#c0a070";
  ctx.fillRect(20, wallTop, VIEW_W - 40, wallBot - wallTop);
  // Сүлжээ хана (хана мод)
  ctx.strokeStyle = "rgba(150,80,36,0.65)";
  ctx.lineWidth = 3;
  for (let x = -20; x < VIEW_W + 40; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, wallTop);
    ctx.lineTo(x + 70, wallBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 70, wallTop);
    ctx.lineTo(x, wallBot);
    ctx.stroke();
  }
  // Ханын ирмэгийн сүүдэр
  const wsh = ctx.createLinearGradient(0, 0, VIEW_W, 0);
  wsh.addColorStop(0, "rgba(18,9,4,0.6)");
  wsh.addColorStop(0.5, "rgba(18,9,4,0)");
  wsh.addColorStop(1, "rgba(18,9,4,0.6)");
  ctx.fillStyle = wsh;
  ctx.fillRect(20, wallTop, VIEW_W - 40, wallBot - wallTop);

  // Дээвэр хэсэг
  ctx.fillStyle = "#1c0f07";
  ctx.fillRect(0, 0, VIEW_W, wallTop);

  // Унь — тооноос хана руу
  const ty = 62;
  ctx.strokeStyle = "#c06828";
  ctx.lineWidth = 5;
  for (let i = 0; i <= 16; i++) {
    const wx = 30 + (i / 16) * (VIEW_W - 60);
    ctx.beginPath();
    ctx.moveTo(cx, ty);
    ctx.lineTo(wx, wallTop + 3);
    ctx.stroke();
  }

  // Тооно — тэнгэр харагдана
  ctx.fillStyle = "#3a6a90";
  ctx.beginPath();
  ctx.ellipse(cx, ty, 54, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d87830";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(cx, ty, 54, 30, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 50, ty);
  ctx.lineTo(cx + 50, ty);
  ctx.moveTo(cx, ty - 27);
  ctx.lineTo(cx, ty + 27);
  ctx.stroke();

  // ===== Хоймор — бурхан тахилтай ширээ =====
  {
    const alt = gerLayout().altar;
    const ax = alt.x;
    const aw = alt.w;
    const tableTop = alt.y + 34;

    // Ширээ
    ctx.fillStyle = "#7a2020";
    roundRectPath(ctx, ax, tableTop, aw, 34, 4);
    ctx.fill();
    ctx.strokeStyle = "#d8a040";
    ctx.lineWidth = 2;
    roundRectPath(ctx, ax, tableTop, aw, 34, 4);
    ctx.stroke();
    ctx.strokeStyle = "rgba(216,160,64,0.5)";
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, ax + 8, tableTop + 6, aw - 16, 22, 3);
    ctx.stroke();
    // Хөл
    ctx.fillStyle = "#5a1818";
    ctx.fillRect(ax + 10, tableTop + 34, 12, 14);
    ctx.fillRect(ax + aw - 22, tableTop + 34, 12, 14);

    // Бурхан — алтан шүтээн, гэрэлт цагирагтай
    const bx2 = ax + aw / 2;
    ctx.strokeStyle = "rgba(255,216,112,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx2, alt.y + 8, 14, 0, Math.PI * 2);
    ctx.stroke();
    const gold = ctx.createLinearGradient(bx2, alt.y - 6, bx2, tableTop);
    gold.addColorStop(0, "#ffd870");
    gold.addColorStop(1, "#c89020");
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(bx2 - 11, tableTop);
    ctx.quadraticCurveTo(bx2 - 9, alt.y + 12, bx2 - 5, alt.y + 8);
    ctx.lineTo(bx2 + 5, alt.y + 8);
    ctx.quadraticCurveTo(bx2 + 9, alt.y + 12, bx2 + 11, tableTop);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx2, alt.y + 4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Зул — хоёр талд, дөл нь анивчина
    for (const sx of [-1, 1] as const) {
      const zx = bx2 + sx * 48;
      ctx.fillStyle = "#c8b090";
      roundRectPath(ctx, zx - 4, tableTop - 8, 8, 8, 2);
      ctx.fill();
      const f = 0.7 + 0.3 * Math.sin(time * 11 + sx * 2);
      ctx.fillStyle = `rgba(255,190,70,${0.6 * f + 0.4})`;
      ctx.beginPath();
      ctx.ellipse(zx, tableTop - 13, 2.2, 3 * f + 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Тахилын мөнгөн аяганууд
    ctx.fillStyle = "#d8d8e0";
    for (let i = 0; i < 5; i++) {
      const ox = bx2 - 28 + i * 14;
      ctx.beginPath();
      ctx.ellipse(ox, tableTop - 2.5, 4, 2.5, 0, 0, Math.PI);
      ctx.fill();
    }

    // Хадаг
    ctx.strokeStyle = "#4a8ad8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax + 6, tableTop + 4);
    ctx.quadraticCurveTo(bx2, tableTop + 16, ax + aw - 6, tableTop + 4);
    ctx.stroke();
  }

  // Зуухны яндан
  ctx.fillStyle = "#3a3a42";
  ctx.fillRect(cx - 7, ty + 20, 14, 246);

  // Зуух
  const flick = 0.75 + 0.25 * Math.sin(time * 9) + 0.08 * Math.sin(time * 23);
  const glow = ctx.createRadialGradient(cx, 348, 8, cx, 348, 120);
  glow.addColorStop(0, `rgba(255,150,50,${0.3 * flick})`);
  glow.addColorStop(1, "rgba(255,150,50,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 130, 240, 260, 220);

  const stove = ctx.createLinearGradient(cx, 316, cx, 366);
  stove.addColorStop(0, "#585862");
  stove.addColorStop(1, "#34343c");
  ctx.fillStyle = stove;
  roundRectPath(ctx, cx - 34, 316, 68, 50, 6);
  ctx.fill();
  // Галын цонх
  ctx.fillStyle = `rgba(255,${Math.round(120 + 40 * flick)},30,${0.85 + 0.15 * flick})`;
  roundRectPath(ctx, cx - 17, 334, 34, 22, 4);
  ctx.fill();
  // Хөл
  ctx.fillStyle = "#26262c";
  ctx.fillRect(cx - 30, 366, 8, 9);
  ctx.fillRect(cx + 22, 366, 8, 9);

  // Шүүгээний оронд — хурдан морины зураг (ханын хүрээтэй)
  {
    const fx = 175;
    const fy = 175;
    const fw = 150;
    const fh = 100;
    // Модон хүрээ
    ctx.fillStyle = "#5a3418";
    roundRectPath(ctx, fx - 6, fy - 6, fw + 12, fh + 12, 4);
    ctx.fill();
    ctx.strokeStyle = "#d8a040";
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, fx - 6, fy - 6, fw + 12, fh + 12, 4);
    ctx.stroke();

    ctx.save();
    roundRectPath(ctx, fx, fy, fw, fh, 2);
    ctx.clip();

    // Тэнгэр
    const sky = ctx.createLinearGradient(fx, fy, fx, fy + fh * 0.55);
    sky.addColorStop(0, "#7aa8c8");
    sky.addColorStop(0.55, "#b8c8a8");
    sky.addColorStop(1, "#c8b888");
    ctx.fillStyle = sky;
    ctx.fillRect(fx, fy, fw, fh);

    // Нар
    const sunX = fx + 28;
    const sunY = fy + 22;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 18);
    sunGlow.addColorStop(0, "rgba(255,220,120,0.85)");
    sunGlow.addColorStop(0.45, "rgba(255,190,80,0.35)");
    sunGlow.addColorStop(1, "rgba(255,180,60,0)");
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8b848";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Хол уулс
    ctx.fillStyle = "#6a7a88";
    ctx.beginPath();
    ctx.moveTo(fx, fy + 58);
    ctx.lineTo(fx + 22, fy + 34);
    ctx.lineTo(fx + 48, fy + 52);
    ctx.lineTo(fx + 72, fy + 28);
    ctx.lineTo(fx + 98, fy + 48);
    ctx.lineTo(fx + 120, fy + 30);
    ctx.lineTo(fx + fw, fy + 50);
    ctx.lineTo(fx + fw, fy + 68);
    ctx.lineTo(fx, fy + 68);
    ctx.closePath();
    ctx.fill();
    // Ойрын уулс
    ctx.fillStyle = "#5a6a58";
    ctx.beginPath();
    ctx.moveTo(fx, fy + 66);
    ctx.lineTo(fx + 30, fy + 46);
    ctx.lineTo(fx + 58, fy + 62);
    ctx.lineTo(fx + 88, fy + 42);
    ctx.lineTo(fx + 118, fy + 60);
    ctx.lineTo(fx + fw, fy + 48);
    ctx.lineTo(fx + fw, fy + 74);
    ctx.lineTo(fx, fy + 74);
    ctx.closePath();
    ctx.fill();
    // Цасан орой
    ctx.fillStyle = "rgba(230,236,240,0.55)";
    ctx.beginPath();
    ctx.moveTo(fx + 72, fy + 28);
    ctx.lineTo(fx + 66, fy + 36);
    ctx.lineTo(fx + 78, fy + 36);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx + 120, fy + 30);
    ctx.lineTo(fx + 114, fy + 38);
    ctx.lineTo(fx + 126, fy + 38);
    ctx.closePath();
    ctx.fill();

    // Эрэг / тал
    ctx.fillStyle = "#7a8a48";
    ctx.fillRect(fx, fy + 70, fw, 12);

    // Нуур / ус
    const water = ctx.createLinearGradient(fx, fy + 78, fx, fy + fh);
    water.addColorStop(0, "#5a8aa8");
    water.addColorStop(0.5, "#4a7a98");
    water.addColorStop(1, "#3a6888");
    ctx.fillStyle = water;
    ctx.fillRect(fx, fy + 78, fw, fh - 78);
    // Усны долгион
    ctx.strokeStyle = "rgba(200,230,240,0.28)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const wy = fy + 84 + i * 5;
      ctx.beginPath();
      ctx.moveTo(fx + 4, wy);
      ctx.quadraticCurveTo(fx + 40, wy - 2, fx + 75, wy);
      ctx.quadraticCurveTo(fx + 110, wy + 2, fx + fw - 4, wy);
      ctx.stroke();
    }

    // Морь — тоглоомын drawHorse силуэттэй адил, зургийн өнгөөр
    const hx = fx + 82;
    const hy = fy + 66;
    const flip = 1;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(1.15, 1.15);

    // Сүүдэр (зургийн)
    ctx.fillStyle = "rgba(30,20,10,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Хөл
    ctx.strokeStyle = "#3a2a18";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-12, 2);
    ctx.lineTo(-12, 13);
    ctx.moveTo(-6, 3);
    ctx.lineTo(-6, 13);
    ctx.moveTo(6, 3);
    ctx.lineTo(6, 13);
    ctx.moveTo(12, 2);
    ctx.lineTo(12, 13);
    ctx.stroke();

    // Сүүл
    ctx.strokeStyle = "#241808";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-16 * flip, -2);
    ctx.quadraticCurveTo(-22 * flip, 4, -20 * flip, 12);
    ctx.stroke();

    // Бие
    const body = ctx.createLinearGradient(0, -10, 0, 6);
    body.addColorStop(0, "#6b4a26");
    body.addColorStop(1, "#4a3016");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -2, 17, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Хүзүү ба толгой
    ctx.fillStyle = "#5d3f1f";
    ctx.beginPath();
    ctx.moveTo(10 * flip, -6);
    ctx.lineTo(20 * flip, -16);
    ctx.lineTo(24 * flip, -12);
    ctx.lineTo(15 * flip, -2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(23 * flip, -15, 6, 3.6, flip * -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Дэл
    ctx.strokeStyle = "#241808";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(11 * flip, -7);
    ctx.lineTo(20 * flip, -17);
    ctx.stroke();

    // Нүд
    ctx.fillStyle = "#1a1208";
    ctx.beginPath();
    ctx.arc(24 * flip, -16, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Ханын зургийн бага зэрэг бүдэгрүүлэх
    ctx.fillStyle = "rgba(90,60,30,0.08)";
    ctx.fillRect(fx, fy, fw, fh);

    ctx.restore();

    // Жижиг шошго
    ctx.fillStyle = "rgba(20,12,6,0.55)";
    roundRectPath(ctx, fx + 8, fy + fh - 18, 72, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#ffe9a8";
    ctx.font = "600 9px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Хурдан морь", fx + 14, fy + fh - 9);
  }

  // ===== АВДАР — тахилын ширээтэй нэг түвшин, орны хойно =====
  const lay = gerLayout();
  const ch = lay.chest;
  const hover = overButton(ch, state.input) && !state.shopOpen;
  const pulse = 1 + 0.02 * Math.sin(time * 5);

  ctx.save();
  ctx.translate(ch.x + ch.w / 2, ch.y + ch.h / 2);
  ctx.scale(hover ? pulse : 1, hover ? pulse : 1);
  ctx.translate(-(ch.x + ch.w / 2), -(ch.y + ch.h / 2));

  // Их бие
  const chest = ctx.createLinearGradient(ch.x, ch.y, ch.x, ch.y + ch.h);
  chest.addColorStop(0, "#e07828");
  chest.addColorStop(1, "#a04810");
  ctx.fillStyle = chest;
  roundRectPath(ctx, ch.x, ch.y, ch.w, ch.h - 12, 6);
  ctx.fill();
  // Алтан хүрээ
  ctx.strokeStyle = hover ? "#ffe080" : "#e8c060";
  ctx.lineWidth = hover ? 3 : 2;
  roundRectPath(ctx, ch.x, ch.y, ch.w, ch.h - 12, 6);
  ctx.stroke();
  ctx.strokeStyle = "#e8c060";
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, ch.x + 10, ch.y + 10, ch.w - 20, ch.h - 32, 4);
  ctx.stroke();
  // Өлзий хээ — гол дээр
  ctx.strokeStyle = "#ffd870";
  ctx.lineWidth = 2;
  const mx = ch.x + ch.w / 2;
  const my = ch.y + (ch.h - 12) / 2;
  ctx.beginPath();
  ctx.arc(mx - 16, my, 9, 0.5, Math.PI * 1.8);
  ctx.arc(mx + 16, my, 9, Math.PI - 0.5, Math.PI * 2.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(mx, my, 5, 0, Math.PI * 2);
  ctx.stroke();
  // Хөл
  ctx.fillStyle = "#6a3410";
  ctx.fillRect(ch.x + 8, ch.y + ch.h - 12, 16, 12);
  ctx.fillRect(ch.x + ch.w - 24, ch.y + ch.h - 12, 16, 12);

  ctx.restore();

  // Авдрын шошго
  ctx.textAlign = "center";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 3;
  ctx.strokeText("Авдар", ch.x + ch.w / 2, ch.y - 12);
  ctx.fillStyle = "#ffe9a8";
  ctx.fillText("Авдар", ch.x + ch.w / 2, ch.y - 12);

  // Ор — зүүн ба баруун (авдрын урд зурагдана)
  for (const side of [-1, 1] as const) {
    const bx = cx + side * 330 - 95;
    const by = 300;
    ctx.fillStyle = "#7a4c22";
    roundRectPath(ctx, bx, by, 190, 84, 8);
    ctx.fill();
    ctx.fillStyle = "#a03030";
    roundRectPath(ctx, bx + 8, by + 8, 174, 52, 6);
    ctx.fill();
    ctx.strokeStyle = "#e0b050";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 14, by + 34);
    ctx.lineTo(bx + 176, by + 34);
    ctx.stroke();
    // Дэр
    ctx.fillStyle = "#e8d8b8";
    roundRectPath(ctx, bx + (side < 0 ? 12 : 132), by + 12, 46, 24, 5);
    ctx.fill();
  }

  // Хаалга (гарах)
  const door = lay.door;
  ctx.fillStyle = "#8a2828";
  roundRectPath(ctx, door.x, door.y, door.w, door.h, 8);
  ctx.fill();
  ctx.strokeStyle =
    overButton(door, state.input) && !state.shopOpen ? "#ffe080" : "#d8a040";
  ctx.lineWidth = 2;
  roundRectPath(ctx, door.x, door.y, door.w, door.h, 8);
  ctx.stroke();
  ctx.fillStyle = "#ffe9a8";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText("Гарах — P", door.x + door.w / 2, door.y + door.h / 2 + 5);
  ctx.textAlign = "left";

  // ===== Малчин гэр дотор алхаж явна (тавилгатай харьцуулахад томруулсан) =====
  const gerScale = 2.85;
  if (state.gerSleepTimer > 0 && state.gerSleepBed) {
    drawSleepingHerder(ctx, state, time, gerScale);
  } else {
    const walker: Player = {
      ...state.player,
      pos: state.gerPlayer,
      riding: false,
      invuln: 0,
      attackAnim: 0,
    };
    ctx.save();
    ctx.translate(state.gerPlayer.x, state.gerPlayer.y);
    ctx.scale(gerScale, gerScale);
    ctx.translate(-state.gerPlayer.x, -state.gerPlayer.y);
    drawPlayerWithSprites(
      ctx,
      walker,
      { x: 0, y: 0 },
      time,
      playerSprites,
      0,
    );
    ctx.restore();
  }

  // Ойролцоох зүйлсийн заавар
  if (!state.shopOpen && !state.craftOpen && state.gerSleepTimer <= 0) {
    const prox = gerProximity(state);
    let hint = "";
    if (prox.nearChest) hint = "E — Авдар";
    else if (prox.nearAltar) hint = "E — Урлал";
    else if (prox.nearBed)
      hint = state.player.sleepCooldown > 0 ? "Сая унтсан…" : "E — Унтах";
    if (hint) {
      const hintY = state.gerPlayer.y - 28 * gerScale;
      ctx.textAlign = "center";
      ctx.font = "600 13px system-ui, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.lineWidth = 3;
      ctx.strokeText(hint, state.gerPlayer.x, hintY);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText(hint, state.gerPlayer.x, hintY);
      ctx.textAlign = "left";
    }
  }

  // Унтах анимэйшний прогресс
  if (state.gerSleepTimer > 0) {
    const progress = 1 - state.gerSleepTimer / 5;
    const bw = 220;
    const bx = (VIEW_W - bw) / 2;
    const by = VIEW_H - 52;
    ctx.fillStyle = "rgba(12,10,8,0.8)";
    roundRectPath(ctx, bx - 10, by - 28, bw + 20, 48, 10);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe9a8";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText("Унтаж байна… Zzz", VIEW_W / 2, by - 8);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, bx, by + 2, bw, 10, 5);
    ctx.fill();
    ctx.fillStyle = "#7ab8e8";
    roundRectPath(ctx, bx, by + 2, bw * progress, 10, 5);
    ctx.fill();
    ctx.textAlign = "left";
  }

  // Дулаан гэрлийн vignette
  const warm = ctx.createRadialGradient(cx, 340, 100, cx, 340, 560);
  warm.addColorStop(0, "rgba(255,170,80,0.08)");
  warm.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Оноо ба эзэмшил
  ctx.fillStyle = "rgba(12,10,8,0.75)";
  roundRectPath(ctx, 14, 14, 210, 36, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.hudAccent;
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText(`Оноо: ${state.score}`, 28, 37);
  const ownedIcons = SHOP_ITEMS.filter(
    (it): it is Extract<typeof it, { type: "gear" }> =>
      it.type === "gear" && state.player.gear[it.id],
  )
    .map((it) => it.icon)
    .join(" ");
  if (ownedIcons) {
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(ownedIcons, 130, 37);
  }

  // Удирдлагын заавар
  if (!state.shopOpen && state.gerSleepTimer <= 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(242,232,213,0.55)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(
      "WASD — алхах · E — харьцах · Хаалга руу алхаж гарна",
      VIEW_W / 2,
      VIEW_H - 8,
    );
    ctx.textAlign = "left";
  }

  if (state.shopOpen) drawChest(ctx, state);
  if (state.craftOpen) drawCraft(ctx, state);
}

/** Авдар — хадгалсан сүү / ааруул / эсгий / ноос */

export function makeVignette(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = VIEW_W;
  c.height = VIEW_H;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.45,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.95,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(10,10,20,0.4)");
  g.fillStyle = grad;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  return c;
}
