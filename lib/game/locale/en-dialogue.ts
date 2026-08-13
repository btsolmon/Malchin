// Түүхийн харилцан яриа — өвгөн, хүү, аав, ээж.
// Түлхүүр нь elder.ts доторх монгол мөртэй яг ижил байна.

export const EN_DIALOGUE: Record<string, string> = {
  // Гарчиг, дүрүүд
  "Анхны шөнө": "The first night",
  "Голомтын дэргэд": "By the hearth",
  "Үүрийн цагаан гэгээ": "The white light of dawn",
  "Хар мөрийн хариу": "The answer in the black trail",
  "Доод тив рүү одох": "Enter the Lower Continent",
  "Доод тив": "The Lower Continent",
  "Сүнсний орноос буцсан нь": "Return from the spirit realm",
  "Гэр бүл эргэн нэгдэв": "The family is whole again",
  "Аав ээжийн тухай": "About my parents",
  "Сүнсний орон руу очих": "Enter the spirit realm",
  "Бэлтгэл хангах": "Make ready",
  Хүү: "Boy",
  Өвгөн: "Elder",
  Аав: "Father",
  Ээж: "Mother",

  // Анхны шөнө
  "Хүү минь, бүү сандар. Би дэргэд чинь байна.":
    "My boy, do not panic. I am here beside you.",
  "Та хэн бэ? Надад туслаач.": "Who are you? Please help me.",
  "Мэдэхгүй байх гэм биш ээ. Харин харалгүй дайрах нь л аюултай.":
    "There is no shame in not knowing. The danger is in rushing in without looking.",
  "Ташуураа чанга атгаад сайтар ажигла.":
    "Hold your whip firmly and watch carefully.",

  // Голомтын дэргэд
  "Нааш суу, хүү минь. Шөнийн хүйтэн биеэс чинь хараахан гараагүй байна.":
    "Sit closer, my boy. The night's cold has not yet left your body.",
  "Та намайг хаанаас ажиглаж байсан юм бэ?": "Where were you watching me from?",
  "Дайраад өнгөрсөн муу ёрыг өвгөн ах нь мөрөөр нь мөшгиж, замаар нь дагаж явна.":
    "This old man has been following the trail of the ill omen that passed through here.",
  "Өнгөрсөн шөнийн шуурга эцэг эхийг минь авч одов. Өвгөн ах минь, та надад туслаач.":
    "Last night's storm carried away my mother and father. Elder, please help me.",
  "Өнгөрсөн шөнийн шуурга аав, ээжийг минь авч одсон.":
    "Last night's storm carried away my mother and father.",
  "Тэр салхи тэнгэрийнх бус байлаа. Хүйтэн инээдийг нь би ч бас сонссон.":
    "That wind was not of the sky. I too heard its cold laughter.",
  "Тэр салхи энгийн салхи бус, шуналаар тэжээгдсэн шулмасын шуурга билээ. Би энэ шуурганы мөрийг даган энэ хорвоог туулж явна.":
    "That was no ordinary wind, but a demon's storm fed by greed. I have wandered this world following its trail.",
  "Тэгвэл та тэднийг хаашаа одсоныг мэдэх үү?":
    "Then do you know where they were taken?",
  "Шөнийн аймшгийг үүрийн гэгээ тайлдаг учиртай. Голомтоо түшиж амар, хүү минь.":
    "The light of dawn has a way of revealing the terror of night. Rest by your hearth, my boy.",
  "Нар ургахад зүүн толгодын бууцанд минь ир. Мэдэх бүхнээ тэнд би чамд өчье.":
    "Come to my camp by the eastern hills at sunrise. There I will tell you all I know.",
  // Үүрийн цагаан гэгээ
  "Өглөөний салхи өнөөх шуурганы мөрийг дарж амжаагүй байна.":
    "The morning wind has not yet covered the trail of that storm.",
  "Та хар шуурганы учрыг хэлнэ гэсэн.":
    "You said you would explain the black storm.",
  "Тэр хар үүл бол тэнгэрт атаархаж, газарт өсөрхсөн шулмын цээжнээс гарсан хар амьсгал юм.":
    "That black cloud is the dark breath of a demon that envied the sky and bore a grudge against the earth.",
  "Эцэг эх минь энх мэнд байгаа болов уу?": "Could my parents still be safe?",
  "Эцэг эх чинь эрүүл саруул байвч хүний хөл хүрэх замд бус, ил ба далдын завсарт хүлээстэй байна.":
    "Your parents are alive and well, but they are bound beyond any road a human foot can reach, between the seen and the unseen.",
  "Хүний нүдэнд үл үзэгдэх, ил ба далдын завсарт орших газарт оджээ.":
    "They were taken to a place unseen by human eyes, between the visible and the hidden.",
  "Тэр газар нь Сүнсний орон гэж үү?": "Is that place the spirit realm?",
  "Хуучин цагт тэгж нэрлэдэгсэн. Тийшээ хүрэх замыг хүчтэн бус, ухаантан нээдэг юм.":
    "So it was called in olden times. The way there is opened not by the strong, but by the wise.",
  "Би хаанаас эхлэх вэ?": "Where do I begin?",
  "Хорсолт шулмасаас үлдсэн хар үнс, хачин мөр зүүн хойших чулуун завсарт үлджээ. Тэнд очоод газарт юу үлдсэнийг нь сайтар ажиглаад ир.":
    "Black ash and a strange trail left by the spiteful demon remain in the rocky cleft to the northeast. Go there and study carefully what was left on the ground.",
  "Оюунаа чөлөөлж чадваас, очих замыг нь би газарчилна. Хайсан хүн олдог, яарсан хүн хол төөрдөг юм шүү, хүү минь.":
    "If you can free your mind, I will guide you to the road. One who searches finds; one who rushes may wander far, my boy.",

  // Хар мөрийн хариу
  "Мөрийг олж харав уу, хүү минь?": "Did you find the trail, my boy?",
  "Хар үнс салхины өөдөөс хөдөлж, чулуун завсраас өнөөх хүйтэн инээд сонсогдсон.":
    "The black ash moved against the wind, and that cold laughter came from the cleft in the rocks.",
  "Тэгвэл тэр өнөөх гайгийн мөр мөнөөс мөн ажээ.":
    "Then it is indeed the trail of that calamity.",
  "Өчигдрийг тольдож, өнөөдрийг зурдаг толиороо онгод тэнгэрийн заагийг нээнэ. Гэвч цаана нь хараалд автсан таван сахиул зам манана.":
    "With the mirror that reflects yesterday and traces today, I will open the boundary of the spirit realm. But five cursed guardians watch the road beyond.",
  "Эхэнд зүүн тэнгэрт Зургаан нар гарна. Тэдгээрийг зөвхөн нум сумаар харвах ёстой. Би чамд нум, сум өгье.":
    "First, six suns will rise in the eastern sky. I will lend you a bow and arrows for that trial.",
  "Дараа нь Хар могой мөлхөнө. Унагасны дараа зуун чулуугаар дарж алаарай. Гэвч энэ удаа чулуу цуглуулах цаг байхгүй. Зөвхөн тагнаад, үхэлгүй буцаж ирээрэй.":
    "Then the Black Serpent will appear. This time you will not have time to gather what you need, so scout the path and return safely.",
  "Тэнд эцэг эх минь буй бол би эргэж огт буцахгүй!":
    "If my parents are there, I will not turn back!",
  "Энэ удаа зөвхөн тагнаж үз. Буцахдаа хар мөрийн чулуун овоогоор гар. Тэндээс л хүний ертөнц рүү харина. Харсан зүйлээ надад даруй хэлээрэй.":
    "This time, only scout the path. Return through the stone ovoo on the black trail; that is the way back to the human world. Tell me at once what you saw.",

  // Сүнсний орноос буцсан нь
  "Эсэн мэнд ирэв үү, хүү минь? Царай чинь цайжээ. Тэнд юу харав?":
    "You returned safely, my boy. Your face has gone pale. What did you see there?",
  "Зүүн тэнгэрт зургаан нар шатаж, хар могой хүлээж байв. Чулуу байгаагүй тул могойг дарж чадсангүй. Цааших сахиулуудыг хараагүй. Гэвч эцэг эхийн минь мөр тэнд буйг би мэдэрч байна.":
    "Six suns burned in the eastern sky, and the Black Serpent waited there. I could not overcome it without what I needed, and I did not see the guardians beyond. But I can feel that my parents' trail is there.",
  "Эсэн мэнд ирсэн чинь сайн хэрэг. Энэ удаа чи зөвхөн замыг тагналаа. Дараагийн удаа орвол зорьсноо гүйцээж байж буцах зам нээгдэнэ шүү.":
    "It is good that you returned safely. This time you only scouted the road. Next time, the way back will open only after you finish what you set out to do.",
  "Гэвч эргэж ирэхгүй байх аюул бий. Заавал тийшээ явах албагүй шүү, хүү минь. Малаа өсгөж, хотоо сахин амар тайван амьдарч болно.":
    "There is still a danger that you may not return. You do not have to go, my boy. You may tend your herd, guard your livestock camp, and live in peace.",
  "Явахаар шийдвэл хэрэгтэй зүйлсээ сайтар базаа. Бэлэн болмогц хар салхины мөр дээр чулуун овоо босгоод түүгээр ороорой.":
    "If you decide to go, prepare what you need. When you are ready, raise a stone ovoo on the black wind's trail and enter through it.",
  "Ойлголоо.": "I understand.",
  "За. Би дахин толиороо нээхгүй. Тэр чулуун овоо л хаалга болно шүү!":
    "Good. I will not open the way with my mirror again. That stone ovoo alone will be the gate.",

  // Сүнсний орон — хуучин ярианы цэс
  "Ивий, жаахан үр минь, эцэж цуцсан харагдана. Чамайг төрүүлсэн эцэг эх чинь хаана байна?":
    "Oh, little one, you look exhausted. Where are the parents who raised you?",
  "Өвгөн ах минь, би эжий аавтайгаа хамт энэ нутагт суудагсан. Гэтэл өчигдөр газар тэнгэрийг нийлүүлсэн мэт гамшигт их шуурга дэгдэж, хахир муухай хоолой чангаар инээн, эгэл бор гэрээс минь эжий аавыг минь авч одов.":
    "Elder, I lived in this land with my mother and father. Yesterday a terrible storm rose as if joining earth and sky, and a harsh voice laughed aloud as it carried my parents away from our humble ger.",
  "Шуугих их шуургыг чухам хэн дэгдээв? Эцэг эх хоёрыг минь эндээс юу авч одов?":
    "Who raised that roaring storm? What took my parents from here?",
  "Өндөр наст өвгөний хөвд сахал чичирч, хүрэн бор царай нь хүйт даасан мэт харагдана...":
    "The aged elder's mossy beard trembles, and his weathered brown face seems chilled...",
  "Тэр салхи энгийн салхи бус, шулмасын шуурга билээ. Эцэг эх чинь амьд боловч ил ба далдын завсарт хүлээстэй байна.":
    "That was no ordinary wind, but a demon's storm. Your parents are alive, yet bound between the seen and the unseen.",
  "Юу гэсэн үг вэ? Тэд минь... энэ дэлхийд байхгүй гэж үү?!":
    "What do you mean? Are they... no longer in this world?!",
  "Тэгвэл тэд маань хаашаа одсон байж таарах вэ?":
    "Then do you know where they were taken?",
  "Тэр газар нь Доод тив гэж үү?": "Is that place the Lower Continent?",
  "Хуучин цагт тэгж нэрлэдэгсэн. Тийшээ хүрэх замыг **тэнхээтэн биш, сэхээтэн** нээдэг юм.":
    "So the ancients named it. Its gate opens not to the brave, but to the one who reads the trail rightly.",
  "Оюунаа чи чөлөөлж чадваас, очих замыг нь би газарчилна. Хайсан хүн олдог, яарсан хүн төөрдөг юм шүү, хүү минь.":
    "If the trail accepts you, I will open the next road. A hurried foot goes astray; a watchful eye finds the way.",

  // Доод тив рүү одох
  "Би Өчигдрийг тольдож, өнөөдрийг зурдаг толиороо онгод тэнгэрийн заагийг нээнэ..Тэр ертөнцөд өнгөрсөн, одоо нэгэн цагт орших тул мал сүрэгтээ бүү санаа чилээ. Гэвч тэнд төөрөлдсөн олон бие буйг санагтун. Хүү минь, чи явахад бэлэн үү?":
    "With my shaman's mirror I will open the seam between the worlds. While you are there, time in this world stands still, so no harm will come to your sheep and goats — go with an easy mind. But remember: dangerous spirits wait on the other side. Are you ready to go?",
  "Би бэлэн байна, Өвгөн ахаа! Замыг минь нээж өгнө үү.":
    "I am ready, elder! Open the way for me.",
  "Надад тулааны зэвсэг, хоол хүнсээ арай сайн бэлдэх цаг хэрэгтэй байна.":
    "I need more time to ready my weapons and food.",
  "Надад ямар ч аюул тохиосон хамаагүй! Би аав, ээжийгээ заавал буцааж авчирна. Би яаж тийшээ очих вэ?":
    "Whatever danger comes, I don't care! I will bring my mother and father back. How do I get there?",
  "Тэнд эцэг эх минь буй бол би эргэж огт буцахгүй!.":
    "If my parents' trail lies beyond them, I will not turn back.",
  "Тэгвэл амьсгалаа тогтоож, харсан бүхнээ санаж яв. Яарсан гар бус, анзаарсан нүд чамайг буцааж авчирна.":
    "Then steady your breath and remember all you see. Not a hurried hand but a watchful eye will bring you back.",
  "Бөөгийн толинд үлдсэн гэгээгээр ил ба далдын завсрыг түр нээж болно. Гэвч цаана нь хараалд автсан таван сахиул зам манана.":
    "The light left in the shaman's mirror can hold the seam open for a while. But beyond it, five cursed guardians watch the road.",
  "Ил ба далдын завсар нээгдэв. Замыг манах таван сахиулыг дар.":
    "The seam between the seen and unseen is open. Strike down the five guardians of the road.",

  "Харин тэр овоон дээр шилэн лонхтой рашаан үлдээнэ. Гурван балга л байна. R дарж нэг балгавал амьны үзүүлэлт бүрэн дүүрнэ. Могойг дарсны дараа Шидэт харваач, Шулмасын зарц, Талын харагч гэсэн үлдсэн гурав босно.":
    "On that ovoo I will leave a glass bottle of sacred spring water. Only three sips. Press Q to choose it — one sip fills your health bar completely. All five guardians appear at once — crush the Black Snake with stones after you fell it.",
  "Харин тэр овоон дээр шилэн лонхтой рашаан үлдээнэ. Гурван балга л байна. Q дарж сонгоод нэг балгавал амьны үзүүлэлт бүрэн дүүрнэ. Могойг дарсны дараа Шидэт харваач, Шулмасын зарц, Талын харагч гэсэн үлдсэн гурав босно.":
    "On that ovoo I will leave a glass bottle of sacred spring water. Only three sips. Press Q to choose it — one sip fills your health bar completely. After you crush the snake, the Magic Archer, Demon's Servant, and Steppe Seer will rise.",
  "Харин тэр овоон дээр шилэн лонхтой рашаан үлдээнэ. Гурван балга л байна. Q дарж сонгоод нэг балгавал амьны үзүүлэлт бүрэн дүүрнэ. Таван сахиул зэрэг гарч ирнэ — Аварга могойг унагасны дараа чулуугаар дарж алаарай.":
    "On that ovoo I will leave a glass bottle of sacred spring water. Only three sips. Press Q to choose it — one sip fills your health. All five guardians appear at once — crush the Giant Snake with stones after you fell it.",

  "Тэнд Бар хул, Лалар, Чөтгөр, Харваач чөтгөр, Аварга могой зэрэг хүлээж байгаа. Би чамд нум, сум өгье — холхоос харвахад хэрэгтэй.":
    "There Bar Khul, Lalar, Demon, Archer Demon, and the Giant Snake wait. I will give you a bow and arrows — useful for shooting from afar.",
  "Аварга могойг унагасны дараа зуун чулуугаар дарж алаарай. Гэвч энэ удаа чулуу цуглуулах цаг байхгүй. Зөвхөн тагнаад, үхэлгүй буцаж ирээрэй.":
    "After you fell the Giant Snake, crush it with a hundred stones. But this time there is no time to gather stones. Only scout, and return alive.",
  "Бар хул, Лалар, Чөтгөр болон бусад сахиулууд хүлээж байв. Чулуугүй учир могойг дарах боломжгүй байлаа. Гэвч аав, ээжийн минь мөр тэнд байна гэдгийг би мэдэрч байна.":
    "Bar Khul, Lalar, Demon and other guardians waited there. Without stones I could not crush the snake. But I felt that my mother and father's trail is there.",
  "Би бөөгийн толиороо орон зайн заагийг нээнэ. Тэр ертөнцөд ороход бодит дэлхийн цаг хугацаа зогсох тул чиний хонь, ямаанд аюул тохиолдохгүй. Гэвч тэнд Аварга могой, Лалар, Бар хул, Чөтгөр, Харваач чөтгөр хүлээж байгааг санагтун! Чи явахад бэлэн үү?":
    "With my shaman's mirror I will open the seam of space. When you enter that world, time in the real world stops — your sheep and goats will be safe. But remember: the Giant Snake, Lalar, Bar Khul, Demon, and Archer Demon wait there! Are you ready to go?",
  'Энэ дэлхийн хүний хөл хүрэх газарт бус гэсэн үг. Тэд "Сүнсний орон"-д хүлээстэй байна. Эртний шулмас, сүнсний сахиулууд тэднийг татан оджээ. Чиний насны хүүг тийш явуулж аюулд оруулмааргүй ч эцэг эхээ гэсэн сэтгэл чинь Сүнсний замыг нээхэд хүрчээ.':
    "I mean they are beyond any place human feet can reach. They are bound in the Spirit Realm. Ancient demons and spirit guardians took them there. I would rather not send one so young into danger, but your devotion to your parents has brought you to the Spirit Road.",
  "Ташуураа чанга атган, тууштай харна":
    "Grips the whip firmly and looks on with resolve",
  "Тэнд эцэг эх минь буй бол би эргэж огт буцахгүй! Би яаж тийшээ очих вэ?":
    "If my parents are there, I will not turn back. How do I get there?",
  "Өчигдрийг тольдож, өнөөдрийг зурдаг толиороо онгод тэнгэрийн заагийг нээнэ. Тэр ертөнцөд өнгөрсөн хийгээд одоо нэгэн цагт орших тул мал сүрэгтээ бүү санаа чилээ. Гэвч тэнд төөрөлдсөн олон сүнс буйг санагтун. Хүү минь, чи явахад бэлэн үү?":
    "With the mirror that reflects yesterday and traces today, I will open the boundary of the spirit realm. Past and present meet there, so do not worry for your herd. But remember that many lost spirits dwell beyond. My boy, are you ready?",
  "Би бэлэн байна, өвгөн ахаа! Замыг минь нээж өгнө үү.":
    "I am ready, elder. Open the way for me.",
  "Надад тэртээх ертөнцөд одохын өмнө бэлтгэх цаг хэрэгтэй бололтой.":
    "I need some time to prepare before I go to that other realm.",

  // Гэр бүл эргэн нэгдэв
  "Хүү минь... голомтын чинь гал биднийг харанхуйн дундаас замчилж ирлээ.":
    "My boy... the fire of your hearth guided us out of the darkness.",
  "Аав аа... Ээж ээ... Би та хоёрыг заавал олно гэж өөртөө амласан.":
    "Father... Mother... I promised myself I would find you both.",
  "Амлалт чинь биднийг бус, чамайг энд хүртэл авчирчээ. Нааш ир, үр минь.":
    "Your promise did not bring us here; it carried you this far. Come here, my child.",
  "Хар шуурга нутгийн сүргийг тарааж, бууцыг хоосолжээ. Гэвч голомт асаж байхад амьдрал дахин дэлгэрнэ.":
    "The black storm scattered the herds and emptied the camps. But while the hearth burns, life will flourish again.",
  "Тэгвэл бид нутгаа дахин сэргээж, сүргээ урьдынхаас ч олон болгоно.":
    "Then we will restore our homeland and make the herd greater than before.",
  "Тийн ээ, хүү минь. Голомтоо сахиж, сүргээ өсгөе. Энэ удаа бид хамт байна.":
    "Yes, my boy. Let us keep the hearth and grow the herd. This time we are together.",

  // Түүхийн богино зурвасууд
  "Өвгөн талын харанхуйд чимээгүйхэн одов.":
    "The elder went silently into the darkness of the steppe.",
  "Өвгөн зүүн хойших чулуун завсрыг заав.":
    "The elder pointed to the rocky cleft to the northeast.",
  "Бэлэн болмогц хэрэгтэй зүйлсээ базаагаад хар мөр дээр чулуун овоо босгон ор. Яарах албагүй.":
    "When you are ready, prepare what you need and raise a stone ovoo on the black trail. There is no need to rush.",
  "Голомтоо сахиж, сүргээ 1000 толгойд хүргэ.":
    "Keep the hearth and grow your herd to 1000 head.",

  // Өвгөний дэлгүүр
  Алга: "None",
  зоос: "coins",
  "Эзэмшсэн ✓": "Owned ✓",
  'Тэд чинь амьд, гэхдээ бодит ба далд ертөнцийн зааг болох "Доод тив"-д хүлээстэй байна. Эртний шулмас, сүнсний эзэд тэднийг татаж одсон юм. Би чиний насны хүүг тийшээ явуулж, аюулд унагамааргүй байна... Гэвч чиний аав ээжээ гэсэн халуун сэтгэл чинь Доод тивийн замыг нээх хэмжээнд хүрэв.':
    "They are alive, but held at the seam of the seen and unseen — the Lower Continent. Ancient shulmas spirits dragged them there. I would not send a boy your age into that danger… yet your love for your parents has opened the path to the Lower Continent.",
  "Доод тивээс буцсан нь": "Returned from the Lower Continent",
};
