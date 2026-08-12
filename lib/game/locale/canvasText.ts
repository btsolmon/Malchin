// Canvas дээрх текстийг нэг цэгээс орчуулах.
//
// Тоглоомын бичвэр (сануулга, зорилгын самбар, товч тайлбар, панелууд) мянга
// гаруй мөр бөгөөд арав гаруй файлд тархсан. Дуудалт бүрд tr() бичихийн оронд
// контекстийн текстийн гурван функцийг нэг удаа бүрхээд орчуулга дамжуулна:
//
//   fillText / strokeText — зурагдах бичвэр
//   measureText           — хүрээ, дэвсгэр, тэгшлэлт зөв гарахын тулд
//                           орчуулсан бичвэрийн өргөнийг хэмжинэ
//
// Орчуулга байхгүй мөр өөрөө хариу болж буцдаг тул (lang.tr) монгол хэл дээр
// юу ч өөрчлөгдөхгүй. Тоо шигтгэсэн мөрүүд (`Түлээ: 2 / 3`) толинд байхгүй тул
// тэдгээрийг код дотор нь хэсэгчлэн орчуулна.

import { tr } from "../lang";

const PATCHED = new WeakSet<CanvasRenderingContext2D>();

export function localizeCanvasText(ctx: CanvasRenderingContext2D): void {
  if (PATCHED.has(ctx)) return;
  PATCHED.add(ctx);

  const fillText = ctx.fillText.bind(ctx);
  const strokeText = ctx.strokeText.bind(ctx);
  const measureText = ctx.measureText.bind(ctx);

  ctx.fillText = (text: string, x: number, y: number, maxWidth?: number) => {
    if (maxWidth === undefined) fillText(tr(String(text)), x, y);
    else fillText(tr(String(text)), x, y, maxWidth);
  };

  ctx.strokeText = (text: string, x: number, y: number, maxWidth?: number) => {
    if (maxWidth === undefined) strokeText(tr(String(text)), x, y);
    else strokeText(tr(String(text)), x, y, maxWidth);
  };

  ctx.measureText = (text: string) => measureText(tr(String(text)));
}
