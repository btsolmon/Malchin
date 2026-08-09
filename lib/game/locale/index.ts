// Англи орчуулгын сан — эх монгол мөрөөр индексчилнэ.
//
// Тоглоомын зурвас/сануулга, түүхийн харилцан яриа, өвгөний соёлын асуултууд
// гэж хуваасан (асуулт нь том тул хоёр файл). Шинэ мөр нэмэхэд зөвхөн эдгээр
// файлыг хөндөнө, тоглоомын логикт хүрэх шаардлагагүй.

import { EN_GAME } from "./en-game";
import { EN_DIALOGUE } from "./en-dialogue";
import { EN_FORMAT } from "./en-format";
import { EN_QUIZ_A } from "./en-quiz-a";
import { EN_QUIZ_B } from "./en-quiz-b";

/** Хайлт frame тутам болдог тул Map — объектын key хайлтаас хурдан */
export const EN_TEXT: Map<string, string> = new Map<string, string>([
  ...Object.entries(EN_GAME),
  ...Object.entries(EN_DIALOGUE),
  ...Object.entries(EN_FORMAT),
  ...Object.entries(EN_QUIZ_A),
  ...Object.entries(EN_QUIZ_B),
]);
