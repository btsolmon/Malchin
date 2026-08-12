// Түүхийн харилцан яриа — өвгөн, хүү, аав, ээж.
// Түлхүүр = кодод байгаа монгол мөр яг тэр хэлбэрээр (elder.ts).
//
// Уран сайхны хэв маягийг англи дээр ч хадгалахыг зорьсон: өвгөн нь хэвшсэн
// зүйр цэцэн үгээр, хүү нь шулуун, ойлгомжтой хэллэгээр ярина.

export const EN_DIALOGUE: Record<string, string> = {
  // Ярианы гарчиг ба өгүүлэгчийн нэрс
  "Анхны шөнө": "The first night",
  "Голомтын дэргэд": "By the hearth",
  "Үүрийн цагаан гэгээ": "The white light of dawn",
  "Хар мөрийн хариу": "The answer in the black trail",
  "Сүнсний ертөнц рүү одох": "Depart for the spirit world",
  "Сүнсний орон": "The spirit realm",
  "Гэр бүл эргэн нэгдэв": "The family is whole again",
  "Аав ээжийн тухай": "About my parents",
  "Бэлтгэл хангах": "Make ready",
  Хүү: "Boy",
  Өвгөн: "Elder",
  Аав: "Father",
  Ээж: "Mother",

  // Анхны шөнө — өвгөн хүүг тайвшруулна
  "Хүү минь, бүү сандар. Би дэргэд чинь байна.":
    "My boy, do not be afraid. I am here beside you.",
  "Та хэн бэ? Надад туслаач.": "I don't know what to do.",
  "Мэдэхгүй байх гэм биш ээ. Харин харалгүй дайрах нь л аюултай.":
    "There is no shame in not knowing. The danger is in striking before you look.",
  "Араатны нүдийг бус, хөдөлгөөнийг нь ажигла.":
    "Do not watch the beast's eyes. Watch how it moves.",
  "Ташуураа чанга атгаад сайтар ажигла.":
    "Grip your whip tight and hold your gaze",

  // Голомтын дэргэд — танилцах
  "Нааш суу, хүү минь. Шөнийн хүйтэн биеэс чинь хараахан гараагүй байна.":
    "Sit closer, my boy. The night's cold has not yet left your body.",
  "Та намайг хаанаас ажиглаж байсан юм бэ?": "Where were you watching me from?",
  "Дайраад өнгөрсөн муу ёрыг өвгөн ах нь мөрөөр нь мөшгиж, замаар нь дагаж явна.":
    "An old man's eyes notice not what is far, but what is wrong.",
  "Өнгөрсөн шөнийн шуурга эцэг эхийг минь авч одов. Өвгөн ах минь, та надад туслаач.":
    "Last night's storm carried away my mother and fatheТэр салхи энгийн салхи бус, шуналын эрчимд тэжээгдсэн шулмасын шуурга билээ. Энэ шуурганы мөрөөр дагаж, энэ хорвоог туулж явна.r.",
  "": "That wind was not of the sky. I too heard its cold laughter.",
  "Шөнийн аймшгийг үүрийн гэгээ тайлдаг учиртай. Голомтоо түшиж амар, хүү минь.":
    "Words spoken at night must be read in the light of dawn. Now rest by your hearth, my boy.",
  "Нар ургахад зүүн толгодын бууцанд минь ир. Мэдэх бүхнээ тэнд би чамд өчье.":
    "Come to my camp by the eastern hills at sunrise. There I will tell you all I know.",
  "Өндөр наст өвгөний хөвд сахал чичирч, хүрэн бор царай нь хүйт дааж харагданa...":
    "The aged elder's mossy beard trembled, and his weathered brown face looked chilled to the bone...",
  "Ивий жаахан үр минь эцэж юунд цуцав, энэ биеийг нь төрүүлсэн эцэг эх чинь алив?":
    "Oh, my little one, what has worn you down so? And where are the parents who gave you this body?",
  "Өвгөн ах минь, би эжий аавтайгаа хамт энэ нутагт суудагсан. Гэтэл гэнэт өчигдөр газар тэнгэрийг нийлүүлсэн гамшигт их шуурга дэгдэж, хахир муухай хоолой хачин чангаар инээж, эгэл бор гэрээс минь эжий аавыг минь аван одов.":
    "Elder, I lived in this land with my mother and father. Then yesterday a ruinous storm rose up and joined earth to sky, a harsh and ugly voice laughed strangely, and it carried my mother and father away from our plain brown ger.",
  "Шүүгих их шуургыг чухам хэн дэгдээв? Эцэг эх хоёрыг минь эндээс юу авч одов?":
    "Who raised that howling storm? What took my parents from here?",

  // Үүрийн цагаан гэгээ — шуурганы сураг
  "Өглөөний салхи өнөөх шуурганы мөрийг дарж амжаагүй байна.":
    "So you came, my boy. The white light of dawn has not yet hidden the night's tracks.",
  "Та хар шуурганы учрыг хэлнэ гэсэн.":
    "You said you would explain the black storm.",
  "Тэр хар үүл бол тэнгэрт атаархаж, газарт өсөрхсөн шулмын цээжнээс гарсан салхи сэвэлзсэн нь тэр.":
    "That black cloud did not gather in the sky. It was an evil breath, asleep deep in the earth, stirring across the steppe.",
  "Би хаанаас эхлэх вэ?": "Where do I begin?",
  "Бууцнаас минь зүүн хойших чулуун завсартХорсолт шулмасаас үлдсэн хар үнс, хачин мөр үлджээ. Тэнд очоод газарт юу үлдсэнийг нь сайтар ажиглаад ир.":
    "Northeast of my camp, in the cleft of the rocks, black ash and a bitter cold trail were left behind. Go there, but do not touch it with your hands. Stand upwind and notice what stirs.",
  "Өвгөн зүүн хойших чулуун завсрыг заав.":
    "The elder pointed to the cleft in the rocks to the northeast.",

  // Хар мөрийн хариу — сураг шинжилсний дараа
  "Мөрийг олж харав уу, хүү минь?": "Did you find the trail, my boy?",
  "Хар үнс салхины өөдөөс хөдөлж, чулуун завсраас өнөөх хүйтэн инээд сонсогдсон.":
    "The black ash moved against the wind, and that cold laughter came again from the cleft in the rocks.",
  "Тэгвэл тэр өнөөх гайхлын мөр мөнөөс мөн ажээ.":
    "Then you did not merely see the trail — the trail has recognized you.",
  "Эцэг эх минь энх мэнд байгаа болов уу?":
    "Are my mother and father still alive?",
  "Эцэг эх чинь эрүүл саруул байвч хүний хөлөөр хүрдэг замд бус, ил ба далдын завсарт хүлээстэй байна.":
    "The thread of their lives is not cut, my boy. But they are bound where no human foot can walk — in the seam between the seen and the unseen.",
  "Юу гэсэн үг вэ? Тэд минь... энэ дэлхийд байхгүй гэж үү?!":
    "What do you mean? Are they... no longer in this world?!",
  "Тэгвэл тэд маань хаашаа одсон байж таарах вэ?":
    "Then do you know where they were taken?",
  "Тэр газар нь Сүнсний орон гэж үү?": "Is that place the spirit realm?",
  "Хуучин цагт тэгж нэрлэдэгсэн. Тийшээ хүрэх замыг **тэнхээтэн биш, сэхээтэн** нээдэг юм.":
    "So the ancients named it. Its gate opens not to the brave, but to the one who reads the trail rightly.",
  "Оюунаа чи чөлөөлж чадваас, очих замыг нь би газарчилна. Хайсан хүн олдог, яарсан хүн төөрдөг юм шүү, хүү минь.":
    "If the trail accepts you, I will open the next road. A hurried foot goes astray; a watchful eye finds the way.",

  // Сүнсний ертөнц рүү одох
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
  "Өвгөн талын харанхуйд чимээгүйхэн одов.":
    "The elder went off silently into the darkness of the steppe.",

  "Харин тэр овоон дээр шилэн лонхтой рашаан үлдээнэ. Гурван балга л байна. R дарж нэг балгавал амьны үзүүлэлт бүрэн дүүрнэ. Могойг дарсны дараа Шидэт харваач, Шулмасын зарц, Талын харагч гэсэн үлдсэн гурав босно.":
    "On that ovoo I will leave a glass bottle of sacred spring water. Only three sips. Press Q to choose it — one sip fills your health bar completely. After you crush the snake, the Magic Archer, Demon's Servant, and Steppe Seer will rise.",
  "Харин тэр овоон дээр шилэн лонхтой рашаан үлдээнэ. Гурван балга л байна. Q дарж сонгоод нэг балгавал амьны үзүүлэлт бүрэн дүүрнэ. Могойг дарсны дараа Шидэт харваач, Шулмасын зарц, Талын харагч гэсэн үлдсэн гурав босно.":
    "On that ovoo I will leave a glass bottle of sacred spring water. Only three sips. Press Q to choose it — one sip fills your health bar completely. After you crush the snake, the Magic Archer, Demon's Servant, and Steppe Seer will rise.",

  // Гэр бүл эргэн нэгдэв
  "Хүү минь... голомтын чинь гал биднийг харанхуйн дундаас замчилж ирлээ.":
    "My boy... the fire of your hearth guided us out of the darkness.",
  "Аав аа... Ээж ээ... Би та хоёрыг заавал олно гэж өөртөө амласан.":
    "Father... Mother... I promised myself I would find you both.",
  "Амлалт чинь биднийг бус, чамайг энд хүртэл авчирчээ. Нааш ир, үр минь.":
    "Your promise did not bring us back — it carried you this far. Come here, my child.",
  "Тэгвэл бид нутгаа дахин сэргээж, сүргээ урьдынхаас ч олон болгоно.":
    "Then we will restore our land and make the herd greater than before.",
  "Тийн ээ, хүү минь. Голомтоо сахиж, сүргээ өсгөе. Энэ удаа бид хамт байна.":
    "Yes, my boy. Let us keep the hearth and grow the herd. This time we are together.",
  "Хар шуурга нутгийн сүргийг тарааж, бууцыг хоосолжээ. Гэвч голомт асаж байхад амьдрал дахин дэлгэрнэ.":
    "The black storm scattered the herds and emptied the camps. But while the hearth burns, life will spread again.",
  "Голомтоо сахиж, сүргээ 1000 толгойд хүргэ.":
    "Keep the hearth and grow your herd to 1000 head.",

  // Өвгөний дэлгүүрийн мөрүүд
  Алга: "None",
  зоос: "coins",
  "Эзэмшсэн ✓": "Owned ✓",
};
