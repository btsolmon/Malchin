// Тоо/нэр шигтгэсэн мөрүүд — trFormat()-аар дуудагдана.
//
// Ийм мөр эхлээд бүрдэж байж дэлгэцэд гардаг тул бүтэн мөрөөр толиноос
// хайгдахгүй. Иймд загвар (`{n}` гэх мэт орон) нь өөрөө түлхүүр болно:
//
//   trFormat("Түлээ: {n} / {max}", { n: wood, max: CAMPFIRE_WOOD_COST })
//
// Орны нэрс хоёр хэлэнд ижил байх ёстой.

export const EN_FORMAT: Record<string, string> = {
  // Түвшин, XP, зоос
  "Түвшин ахихад {need} XP хэрэгтэй. Одоо {have} XP байна.":
    "Need {need} XP to level up. You have {have} XP.",
  "Түвшин {level} · XP {xp}/{next}": "Level {level} · XP {xp}/{next}",
  "{n} XP дутуу": "{n} XP short",
  "{n} XP ДУТУУ": "{n} XP SHORT",
  "Ур чадвар: {name}!": "Skill: {name}!",
  "{n} зоос": "{n} coins",
  "+{n} зоос": "+{n} coins",
  "−{n} зоос": "−{n} coins",
  "Зоос: {n}": "Coins: {n}",

  // Өдөр, улирал, бэлчээр
  "Өдөр {day}. {hint}": "Day {day}. {hint}",
  "Өдөр {day}: сүрэг +{n}. {hint}": "Day {day}: herd +{n}. {hint}",
  "Хавар -- болж өвс нахиалав ({grass}). Мал өснө · ямааны ноолуур энэ улиралд!":
    "Spring — pasture grew ({grass}). Herd grows · goat cashmere this season!",
  "Зун — бэлчээр дүүрэн ({grass}). Хоньны ноос энэ улиралд · мал бэлчээрт идүүлъя!":
    "Summer — pasture full ({grass}). Sheep wool this season · graze the herd!",
  "Намар — бэлчээр {grass}. Өвс хадгал, гэр нүүхэд бэлд!":
    "Autumn — pasture {grass}. Store hay, ready to move!",
  "Шинэ бэлчээр! Өвс {grass}. Хашаа бэлэн.":
    "New pasture! Grass {grass}. Fence ready.",
  "Сайхан унтаж амарлаа. Өглөө болов · +50 амь":
    "Slept well. Morning came · +50 health",

  // Мал, төллөлт, тэвш
  "+{n} мал": "+{n} livestock",
  "+{n} жимс": "+{n} berries",
  "−{n} мал!": "−{n} livestock!",
  "Мал {n} хоног хашаандаа байлаа — өлсөж үхэв! Өглөө бүр бэлчээрт гарга.":
    "Livestock stayed penned {n} days — starved! Let them out every morning.",
  "+{n} төллөлт": "+{n} births",
  "Хавар төллөлт! +{n} Нялх төл — шөнө дулаан байлга (гал/хашаа).":
    "Spring births! +{n} young — keep them warm at night (fire/fence).",
  "Өвс дүүрэн ({max}).": "Hay full ({max}).",
  "+{n} өвс → тэвш": "+{n} hay → trough",
  " {n} өвс хийлээ ({have}/{max})": "Put {n} hay in the trough ({have}/{max})",
  "{who} {name} барив!": "{who} caught a {name}!",
  "Сүрэг: {have} / 1000": "Herd: {have} / 1000",
  "Олсон мал: {have} / {total}": "Found: {have} / {total}",
  "Хотонд орсон мал: {have} / {total}": "In the pen: {have} / {total}",

  // Мод, түлээ, гал, зуух
  "+{n} түлээ": "+{n} firewood",
  "Аав +{n} түлээ": "Dad +{n} firewood",
  "+{n} мод": "+{n} wood",
  "−{n} мод": "−{n} wood",
  "−{n} жимс": "−{n} berries",
  "Галд {need} түлээ хэрэгтэй.": "Fire needs {need} firewood.",
  "Зууханд {need} түлээ хэрэгтэй.": "Stove needs {need} firewood.",
  "Түлээ: {have} / {need}": "Firewood: {have} / {need}",
  "Зууханд гал: {have} / 1": "Stove lit: {have} / 1",
  "Хүрэлцэхгүй — {desc}": "Not enough — {desc}",
  "{name} хийлээ!": "Made {name}!",

  // Хашаа
  "Модон хашаанд {need} мод хэрэгтэй.": "Wooden fence needs {need} wood.",
  "{name} — түвшин {level}+ хэрэгтэй.": "{name} — needs level {level}+.",
  "{name} болгоход {need} мод хэрэгтэй.": "{name} needs {need} wood.",
  "{name} — {need} зоос хэрэгтэй.": "{name} — needs {need} coins.",
  "{name} — {need} жимс хэрэгтэй.": "{name} — needs {need} berries.",
  "{name} болголоо!": "Upgraded to {name}!",

  // Түлхүүр товчны сануулга
  "E — Жимс түүх ({n})": "E — Pick berries ({n})",
  "E — Бүх жимс түүх ({n})": "E — Pick all berries ({n})",
  "E — Чулуу түүх ({n})": "E — Gather stone ({n})",
  "E —  өвс хийх ({n})": "E — Hay into trough ({n})",
  "E — Хараалт хаалга ({n} үлдсэн)": "E — Cursed gate ({n} left)",

  // Худалдаа
  "{name} алга.": "No {name}.",
  "{name} алга — олж ирээд зараарай.": "No {name} — go find some to sell.",
  "{name} аль хэдийн бий.": "{name} already owned.",
  "{name}: +{price} зоос": "{name}: +{price} coins",
  "{name} авлаа! (−{price})": "Bought {name}! (−{price})",
  "{name} худалдаж авлаа!": "Bought {name}!",
  "{name} худалдаж авлаа! (+1 {kind})": "Bought {name}! (+1 {kind})",
  "Зоос хүрэхгүй — {price} зоос хэрэгтэй.": "Not enough coins — need {price}.",
  "Зоос хүрэхгүй — {price} зоос хэрэгтэй. (Одоо: {have})":
    "Not enough coins — need {price}. (Now: {have})",

  // Хулгайч, чоно
  "Чоно {n}": "Wolves {n}",
  "Хулгайч (−{n})": "Thief (−{n})",
  "Хулгайч {n} мал авч зугтав! Гүйц!": "Thief stole {n} livestock! Chase him!",
  "Хулгайч {n} хонь авч зугтав! Гүйц!": "Thief stole {n} sheep! Chase him!",
  "Хулгайч зугтав… {n} Мал хорогдов.": "Thief escaped… {n} livestock lost.",
  "Хулгайч зугтав… {n} Хонь хорогдов.": "Thief escaped… {n} sheep lost.",
  "−{n} хонь!": "−{n} sheep!",
  "Хашаа хулгайчийг зогсоов! +{n} мал":
    "Fence stopped the thief! +{n} livestock",
  "Малaa буцааж авлаа! +{n} хонь": "Livestock recovered! +{n} sheep",
  "+{n} мал · +{xp} XP": "+{n} livestock · +{xp} XP",
  "+{n} хонь · +{xp} XP": "+{n} sheep · +{xp} XP",

  // Тулаан
  "СӨРӨГ ЦОХИЛТ! −{dmg}": "COUNTER! −{dmg}",
  "Ирсэн аюулыг эгц өөд нь буцаав! −{dmg}":
    "The great blow is hurled back! −{dmg}",
  "Баавгайн posture: {have}/{max}": "Bear posture: {have}/{max}",
  "Амь {hp} / {max}": "Health {hp} / {max}",
  "Тэнцвэр {hp} / {max}": "Posture {hp} / {max}",
  "Биеийн тэнцвэр {hp} / {max}": "Posture {hp} / {max}",

  // Эхний зам ба Төмөр шулмас
  "Эхний зам {have}/{total}": "First road {have}/{total}",
  "Сахиул: {have} / {total}": "Guardians: {have} / {total}",
  "{name}- Дайрч байна.": "{name} joins the fight.",
  "{name}-д ялагдлаа…": "Defeated by {name}…",
  "{name}-ын сүнс дээш одов.": "{name}'s spirit departs.",
  "Хараалт хаалга түгжээтэй. Замын {n} дайсан үлдлээ.":
    "Cursed gate is locked. {n} enemies left.",
  "Төмөр шулмас · Үе {n}": "Tömör Shulmas · Phase {n}",
  "Үе {n}": "Phase {n}",
  "Хаалт {n}": "Ward {n}",
  "Төмөр хаалт: {n}": "Iron ward: {n}",
  "ХАЛХАВЧЛАХ ТӨМӨР {have}/{max}": "IRON WARD {have}/{max}",

  // Яриа
  "{name} — яриа": "{name} — dialogue",
  "Хүү: «{line}»": "Boy: «{line}»",
  "Өвгөн: «Зөв! +{n} зоос.»": "Elder: «Correct! +{n} coins.»",
};
