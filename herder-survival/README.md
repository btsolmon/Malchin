# Малчин — Survival Core Prototype

Vite + Vanilla TypeScript + HTML5 Canvas.

## Яагаад top-down?

| | Top-down | Side-scroller |
|---|---|---|
| Мал хариулах | Бэлчээрт сүрэг хөтлөхөд тохиромжтой | Хэцүү |
| Нүүдэл / газрын зураг | Зон/камп солиход энгийн | Platform world шаардлагатай |
| Don't Starve мэдрэмж | Ойрхон | Terraria-д ойр |
| Тулаан (чоно) | 360° | Чиглэлтэй, давуу талтай |

**Санал:** top-down (энэ prototype). Тулааны гүн нэмэхэд later-д hybrid (бэлчээр top-down, чоны довтолгоонд side-view vignette) хийж болно.

## Ажиллуулах

```bash
cd herder-survival
npm install
npm run dev
```

Браузер: http://localhost:3000

## Удирдлага

- **WASD / сум** — хөдлөх
- **E / Space** — ойрхон мод огтлох
- **F** — гал түлэх (түлээ ≥ 3, гал дэргэд)

## v0.1-д байгаа зүйл

- World + camera follow
- Player vitals: Health, Warmth
- Wood gathering + tree respawn
- Campfire (түлээ шатааж дулаацах)
- Өдөр/шөнө + цаг агаар (HUD)
- Score

## Дараагийн алхам (санал)

1. Хонь/ямаа AI + бэлчээр
2. Thirst / хоол
3. Чоно шөнийн raid
4. Өвөлжөө ↔ хаваржаа zone swap
