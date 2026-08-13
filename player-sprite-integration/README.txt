PLAYER SPRITE INTEGRATION

Files included
--------------
lib/game/engine.ts
lib/game/render.ts

public/assets/player/player-idle.png
public/assets/player/player-run.png
public/assets/player/player-attack1.png
public/assets/player/player-attack2.png
public/assets/player/player-attack3.png
public/assets/player/player-parry.png
public/assets/player/player-dodge.png
public/assets/player/player-hurt.png

Sprite format
-------------
- 512 x 384 pixels per sheet
- 4 columns x 3 rows
- 128 x 128 pixels per frame
- Row 1: facing down
- Row 2: facing right
- Row 3: facing up
- Left is made by horizontally flipping the right row

Animation mapping
-----------------
idle -> player-idle.png
moving -> player-run.png
attackVariant 0 -> player-attack1.png
attackVariant 1 -> player-attack2.png
attackVariant 2 -> player-attack3.png
parryPhase -> player-parry.png
dodgePhase -> player-dodge.png
hurtFlash -> player-hurt.png

Install from the project root
-----------------------------
1. Extract this ZIP.

2. Run:

New-Item -ItemType Directory ".\public\assets\player" -Force

Copy-Item `
  ".\player-sprite-integration\lib\game\engine.ts" `
  ".\lib\game\engine.ts" `
  -Force

Copy-Item `
  ".\player-sprite-integration\lib\game\render.ts" `
  ".\lib\game\render.ts" `
  -Force

Copy-Item `
  ".\player-sprite-integration\public\assets\player\*.png" `
  ".\public\assets\player\" `
  -Force

3. Validate:

bun run lint
bun run build
bun run dev

Notes
-----
- While images are still loading, the old procedural character is used as fallback.
- Ranged bow/gun attacks also keep the old procedural renderer.
- Pixel smoothing is disabled when the sprite is drawn.
