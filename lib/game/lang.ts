// Хэлний тохиргоо ба орчуулга (mn / en)
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
  "menu.skipStory": "Түүхийг алгасаад эхлэх",
  "menu.watchStory": "Түүхийг эхнээс нь эхлэх",
  "menu.storyChoiceTitle": "Эхнээс нь эхлэх үү?",
  "menu.storyChoiceHint": "Та өмнө нь аав ээжийгээ аварсан",
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
  "controls.attack": "Item ашиглах",
  "controls.bow": "Нум · J барьж charge хийгээд харвах",
  "controls.dodge": "Бултах",
  "controls.parry": "Дайралт няцаах",
  "controls.interact": "Харьцах",
  "controls.eat": "Item идэх",
  "controls.rashaan": "Рашаан уух (сүнс · 1 балга = бүтэн амь)",
  "controls.fire": "Хүссэн газартаа гал түлэх",
  "controls.fence": "Хашаа · J барих",
  "controls.herd": "Мал туух",
  "controls.packGer": "Гэр моринд ачих / буулгах",
  "controls.horse": "Морь унах / буух",
  "controls.bag": "Богц нээх / хаах",

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
  "hud.bag": "БОГЦ",
  "hud.bagHint": "WASD / сумаар — соль · Enter - сонго",
  "hotbar.fists": "Нударга",
  "hotbar.sword": "Сэлэм",
  "hotbar.bow": "Нум",
  "hotbar.fence": "Хашаа",
  "hotbar.empty": "Нүх хоосон",
  "hotbar.clear": "Хоослох",
  "hotbar.notConsumable": "Q — зөвхөн хоол/уух. Зэвсэг J.",
  "hotbar.cycleHint": "← → зүйл солих · Q ашиглах",
  "hotbar.invEmpty": "Богц хоосон",
  "consume.title": "ХООЛ · УУХ",
  "consume.hint": "← → сонго · Q идэх/уух · P хаах",
  "consume.berry": "Жимс",
  "consume.berryHint": "+28 хоол · +4 амь",
  "consume.fish": "Загас",
  "consume.fishHint": "+36 хоол · +20 амь",
  "consume.aaruul": "Ааруул",
  "consume.aaruulHint": "+40 хоол · +8 дулаан",
  "consume.milk": "Сүү",
  "consume.milkHint": "+24 хоол · +10 дулаан",
  "consume.spirit": "Рашаан",
  "consume.spiritHint": "Амь бүрэн нөхөнө",
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
  "craft.cashmereFelt.name": "Ноолууран утас.",
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
  "controls.attack": "Use item",
  "controls.bow": "Bow · hold J to charge & shoot",
  "controls.dodge": "Dodge",
  "controls.parry": "Parry",
  "controls.interact": "Interact",
  "controls.eat": "Eat item",
  "controls.rashaan": "Drink sacred water (spirit · 1 sip = full health)",
  "controls.fire": "Light a fire anywhere",
  "controls.fence": "Fence · J to build",
  "controls.herd": "Herd livestock",
  "controls.packGer": "Load / unload ger onto horse",
  "controls.horse": "Mount / dismount horse",
  "controls.bag": "Open / close bag",

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
  "hud.bag": "BAG",
  "hud.bagHint": "WASD / arrows — pick · Enter — assign · Tab close",
  "hotbar.fists": "Fists",
  "hotbar.sword": "Sword",
  "hotbar.bow": "Bow",
  "hotbar.fence": "Fence",
  "hotbar.empty": "Empty slot",
  "hotbar.clear": "Clear",
  "hotbar.notConsumable": "Q is for food/drink. Tools use J.",
  "hotbar.cycleHint": "← → change item · Q use",
  "hotbar.invEmpty": "Bag is empty",
  "consume.title": "FOOD · DRINK",
  "consume.hint": "← → select · Q eat/drink · P close",
  "consume.berry": "Berries",
  "consume.berryHint": "+28 food · +4 HP",
  "consume.fish": "Fish",
  "consume.fishHint": "+36 food · +20 HP",
  "consume.aaruul": "Aaruul",
  "consume.aaruulHint": "+40 food · +8 warmth",
  "consume.milk": "Milk",
  "consume.milkHint": "+24 food · +10 warmth",
  "consume.spirit": "Sacred water",
  "consume.spiritHint": "Fully restores health",
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
