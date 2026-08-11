// Хүн 6 — хэлний тохиргоо (mn / en)
//
// 1-р шат: меню, тохиргоо, удирдлага, HUD, панелууд.
// Түүх ба өвгөний асуултууд монголоороо үлдэнэ — 2-р шатад орно.

import { EN_TEXT } from "./locale";

export type Lang = "mn" | "en";

export const LANG_KEY = "malchin-lang";

const MN = {
  "menu.eyebrow": "АМЬД ҮЛД",
  "menu.title": "Нүүдэлчин",
  "menu.subtitle": "Хязгаар үгүй тал",
  "menu.play": "Тоглох",
  "menu.continue": "Үргэлжлүүлэх",
  "menu.newGame": "Шинээр тоглох",
  "menu.skipStory": "Түүх алгасаад эхлэх",
  "menu.watchStory": "Түүх эхнээс нь эхлэх",
  "menu.storyChoiceTitle": "Бүүүүүр эхнээс нь эхлэх үү?",
  "menu.storyChoiceHint":
    "Та өмнө нь аав ээжийг аварсан · cutscene-ээс өмнө сонго",
  "menu.settings": "Тохиргоо",
  "menu.controls": "Удирдлага",
  "menu.credits": "Багийнхан",

  "pause.title": "ТҮР ЗОГССОН",
  "pause.resume": "Үргэлжлүүлэх",
  "pause.mainMenu": "Үндсэн цэс",
  "pause.hint": "↑↓ / Enter · хулгана · P — үргэлжлүүлэх",

  "settings.title": "ТОХИРГОО",
  "settings.music": "Ая",
  "settings.sfx": "Дууны эффект",
  "settings.language": "Хэл",
  "settings.back": "Буцах",
  "settings.hint": "← → — сонголт өөрчлөх · хулганаар дарж болно",

  "controls.title": "УДИРДЛАГА",
  "controls.walk": "Алхах",
  "controls.attack": "Цохих / сэлмээр цавчих (тамир)",
  "controls.bow": "Нум харвах (сум хэрэгтэй)",
  "controls.dodge": "Бултах — invuln цонх",
  "controls.parry": "Сөрөх (parry) — дайралт няцаах",
  "controls.weapon": "Нударга / Хөх тэнгэрийн сэлэм",
  "controls.interact": "Мод / чулуу / жимс / өвс / тэвш / мал",
  "controls.eat": "Жимс / загас / ааруул идэх",
  "controls.fire": "Хүссэн газартаа гал түлэх (түлээ)",
  "controls.fence": "Хашаа барих / шинэчлэх",
  "controls.herd": "Нохойгоор мал туух (барина)",
  "controls.packGer": "Гэр моринд ачих / буулгах",
  "controls.horse": "Морь унах / буух (гэрийн дэргэд уяна)",
  "controls.inventory": "Авдар / нөөц нээх",

  "credits.title": "БАГИЙНХАН",
  "credits.core": "Тоглоомын цөм",
  "credits.survival": "Амьд үлдэх систем",
  "credits.enemyAi": "Дайсан ба AI",
  "credits.combat": "Тулааны систем",
  "credits.art": "График дизайн ба визуал стиль",
  "credits.uiSound": "UI/UX ба дуу",

  "records.title": "ДЭЭД АМЖИЛТ",
  "records.days": "Амьдарсан өдөр",
  "records.livestock": "Хамгийн их мал",
  "records.coins": "Хамгийн их зоос",
  "records.none": "Амжилт бүртгэгдээгүй",

  "hud.trough": "Тэвш",
  "hud.gate": "Хаалга",
  "hud.level": "ТҮВШИН",
  "hud.levelHint": "← → гүйлгээд Enter · эсвэл хулганаар сонго",
  "hud.day": "Өдөр",
  "hud.coins": "Зоос",
  "hud.livestock": "Мал",
  "hud.wool": "Ноос",
  "hud.cashmere": "Ноол",
  "hud.milk": "Сүү",
  "hud.inventory": "АВДАР",
  "hud.inventoryHint": "Tab — хаах",
  "inv.wood": "Мод",
  "inv.stone": "Чулуу",
  "inv.arrows": "Сум",
  "inv.berries": "Жимс",
  "inv.fish": "Загас",
  "inv.hay": "Өвс",
  "inv.wool": "Ноос",
  "inv.cashmere": "Ноолуур",
  "inv.milk": "Сүү",
  "inv.felt": "Эсгий",
  "inv.aaruul": "Ааруул",
  "inv.spiritWater": "Сүнсний ус",

  "item.milk.name": "Сүү",
  "item.milk.desc": "Цагаан идээ · хадгалсан",
  "item.aaruul.name": "Ааруул",
  "item.aaruul.desc": "Боловсруулсан сүү",
  "item.felt.name": "Эсгий",
  "item.felt.desc": "Ноосоор урласан",
  "item.wool.name": "Ноос",
  "item.wool.desc": "Хонь / тэмээний ноос",
  "item.cashmere.name": "Ноолуур",
  "item.cashmere.desc": "Ямааны ноолуур",

  "end.win": "ЯЛАЛТ!",
  "end.lose": "ЯЛАГДЛАА",
  "end.winSubtitle": "Төмөр шулмас дарагдаж, гэр бүл эргэн нэгдэв.",
  "end.winHerd": "ЯЛАЛТ!",
  "end.winHerdSubtitle": "Сүргээ 1000 толгойд хүргэлээ!",
  "end.hint": "Enter / P — үндсэн цэс · сүрэг өсгөх тоглоом хадгалагдана",
  "end.loseHint": "Enter / P — үндсэн цэс",
  "end.loseHintSkip":
    "Enter / P — цэс · E — түүх алгасаад аав ээжтэй амьдралаас эхлэх",

  "chest.title": "АВДАР",
  "chest.empty": "Алга",
  "craft.title": "УРЛАЛ",
  "craft.make": "Хийх",
  "craft.short": "Хүрэлцэхгүй",

  "craft.arrows.name": "Сум",
  "craft.arrows.desc": "1 мод + 1 чулуу → 2 сум",
  "craft.felt.name": "Эсгий",
  "craft.felt.desc": "3 ноос → 1 эсгий",
  "craft.aaruul.name": "Ааруул",
  "craft.aaruul.desc": "2 сүү → 1 ааруул",
  "craft.cashmereFelt.name": "Ноолууран эсгий",
  "craft.cashmereFelt.desc": "2 ноолуур → 2 эсгий",

  "common.backHint": "P / Enter — буцах",
} as const;

export type StringKey = keyof typeof MN;

const EN: Record<StringKey, string> = {
  "menu.eyebrow": "SURVIVE",
  "menu.title": "Nomad",
  "menu.subtitle": "The boundless steppe",
  "menu.play": "Play",
  "menu.continue": "Continue",
  "menu.newGame": "New game",
  "menu.skipStory": "Skip story & start",
  "menu.watchStory": "Watch story & start",
  "menu.storyChoiceTitle": "Watch the story?",
  "menu.storyChoiceHint":
    "You've saved your parents before · choose before the cutscene",
  "menu.settings": "Settings",
  "menu.controls": "Controls",
  "menu.credits": "Team",

  "pause.title": "PAUSED",
  "pause.resume": "Resume",
  "pause.mainMenu": "Main menu",
  "pause.hint": "↑↓ / Enter · mouse · P — resume",

  "settings.title": "SETTINGS",
  "settings.music": "Music",
  "settings.sfx": "Sound effects",
  "settings.language": "Language",
  "settings.back": "Back",
  "settings.hint": "← → — change value · or click",

  "controls.title": "CONTROLS",
  "controls.walk": "Move",
  "controls.attack": "Punch / sword slash (stamina)",
  "controls.bow": "Shoot bow (needs arrows)",
  "controls.dodge": "Dodge — invulnerability window",
  "controls.parry": "Parry — deflect an attack",
  "controls.weapon": "Fists / Sky-Blue Sword",
  "controls.interact": "Tree / stone / berries / grass / trough / livestock",
  "controls.eat": "Eat berries / fish / aaruul",
  "controls.fire": "Light a fire anywhere (firewood)",
  "controls.fence": "Build / upgrade fence",
  "controls.herd": "Herd with dog (hold)",
  "controls.packGer": "Load / unload ger onto horse",
  "controls.horse": "Mount / dismount horse (hitch by the ger)",
  "controls.inventory": "Open inventory / supplies",

  "credits.title": "TEAM",
  "credits.core": "Core mechanics",
  "credits.survival": "Survival systems",
  "credits.enemyAi": "Enemies & AI",
  "credits.combat": "Combat systems",
  "credits.art": "Art & visual style",
  "credits.uiSound": "UI/UX & sound",

  "records.title": "BEST RECORDS",
  "records.days": "Days survived",
  "records.livestock": "Most livestock",
  "records.coins": "Most coins",
  "records.none": "No records yet",

  "hud.trough": "Trough",
  "hud.gate": "Gate",
  "hud.level": "LEVEL",
  "hud.levelHint": "← → to browse, Enter to pick · or use the mouse",
  "hud.day": "Day",
  "hud.coins": "Coins",
  "hud.livestock": "Livestock",
  "hud.wool": "Wool",
  "hud.cashmere": "Cash",
  "hud.milk": "Milk",
  "hud.inventory": "INVENTORY",
  "hud.inventoryHint": "Tab — close",
  "inv.wood": "Wood",
  "inv.stone": "Stone",
  "inv.arrows": "Arrows",
  "inv.berries": "Berries",
  "inv.fish": "Fish",
  "inv.hay": "Hay",
  "inv.wool": "Wool",
  "inv.cashmere": "Cashmere",
  "inv.milk": "Milk",
  "inv.felt": "Felt",
  "inv.aaruul": "Aaruul",
  "inv.spiritWater": "Spirit water",

  "item.milk.name": "Milk",
  "item.milk.desc": "Dairy · stored",
  "item.aaruul.name": "Aaruul",
  "item.aaruul.desc": "Dried curd from milk",
  "item.felt.name": "Felt",
  "item.felt.desc": "Made from wool",
  "item.wool.name": "Wool",
  "item.wool.desc": "Sheep / camel wool",
  "item.cashmere.name": "Cashmere",
  "item.cashmere.desc": "Goat cashmere",

  "end.win": "VICTORY!",
  "end.lose": "DEFEATED",
  "end.winSubtitle": "Iron Witch is slain and the family is whole again.",
  "end.winHerd": "VICTORY!",
  "end.winHerdSubtitle": "You grew the herd to 1000 head!",
  "end.hint": "Enter / P — main menu · your herd is saved, keep growing it",
  "end.loseHint": "Enter / P — main menu",
  "end.loseHintSkip":
    "Enter / P — menu · E — skip story, start with parents saved",

  "chest.title": "CHEST",
  "chest.empty": "None",
  "craft.title": "CRAFT",
  "craft.make": "Make",
  "craft.short": "Not enough",

  "craft.arrows.name": "Arrows",
  "craft.arrows.desc": "1 wood + 1 stone → 2 arrows",
  "craft.felt.name": "Felt",
  "craft.felt.desc": "3 wool → 1 felt",
  "craft.aaruul.name": "Aaruul",
  "craft.aaruul.desc": "2 milk → 1 aaruul",
  "craft.cashmereFelt.name": "Cashmere felt",
  "craft.cashmereFelt.desc": "2 cashmere → 2 felt",

  "common.backHint": "P / Enter — back",
};

const TABLES: Record<Lang, Record<StringKey, string>> = { mn: MN, en: EN };

let current: Lang = "mn";

export function getLang(): Lang {
  return current;
}

/** Аль хэл дээр байгааг товчоор — тохиргооны мөрд харуулна */
export function langLabel(lang: Lang = current): string {
  return lang === "mn" ? "Монгол" : "English";
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // localStorage хаалттай орчинд алдаа хаяхгүй
  }
}

export function toggleLang(): void {
  setLang(current === "mn" ? "en" : "mn");
}

export function loadLangSetting(): void {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw === "mn" || raw === "en") current = raw;
  } catch {
    // Хадгалсан тохиргоо байхгүй бол монголоор үлдэнэ
  }
}

export function t(key: StringKey): string {
  return TABLES[current][key] ?? MN[key];
}

/**
 * Эх мөрөөр орчуулах (gettext-ийн зарчим). Түүх, харилцан яриа, зурвас,
 * асуултууд гэх мэт мянга гаруй мөрийг байрандаа үлдээж, гаралтын цэгүүдэд
 * л дамжуулна. Орчуулга байхгүй бол монгол хувилбар нь өөрөө хариу болно —
 * тиймээс дутуу орчуулга ч тоглоомыг эвдэхгүй.
 */
export function tr(source: string): string {
  if (current !== "en") return source;
  return EN_TEXT.get(source) ?? source;
}

/** Хэсэгчилсэн орчуулга — тоо/нэр оруулсан мөрд хэрэглэнэ */
export function trFormat(
  source: string,
  params: Record<string, string | number>,
): string {
  let out = tr(source);
  for (const [key, value] of Object.entries(params)) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}
