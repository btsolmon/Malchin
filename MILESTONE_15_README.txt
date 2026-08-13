MILESTONE 15 — PLAYER DEATH + SMOOTH RESTART

Hiisen zuils:
- HP 0 bol shuud lost screen bish, ehleed 1.05 sec death sequence ajillana.
- Dying ued movement, attack, dodge, parry, interact buren lock hiigdэнэ.
- player-hurt.png 4 frame death animation bolgon ashiglana.
- Screen aajmaar harlana.
- Death animation duussanii daraa YALAGDLAA screen garna.
- R, Enter esvel mouse button deer darahad shine run shuud ehlene.
- Pause menu-iin "Undsen tses" heviin ajillana.
- Chono, baavgai, hulgaich, huiten, olsgolongoos uheh buh tohioldol neg death sequence ashiglana.
- Buh honi duusah loss ni player death bish tul huuchnaaraa shuud lost screen ruu orno.

Project root dotor ZIP-ee zadlah PowerShell command:

Expand-Archive "$HOME\Downloads\milestone15-death-restart-ready.zip" -DestinationPath . -Force

Daraa ni:

bun run build
bun run dev

Gol shine file:
lib/game/death.ts

Soligdson file-uud:
lib/game/types.ts
lib/game/engine.ts
lib/game/player.ts
lib/game/enemies.ts
lib/game/render.ts
lib/game/ui.ts
