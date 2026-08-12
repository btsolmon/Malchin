import { sfx } from "../audio";
import type { GameState } from "../types";

/**
 * Hotbar-аас tool идэвхтэй.
 * J — цохих / хашаа / чулуу шидэх; нум үед J бариад charge харвах.
 */
export function applySelectedToolInput(state: GameState): void {
  const { player, input } = state;
  const tool = player.tool ?? "melee";
  if (tool === "bow") {
    if (input.attack || input.attackPressed) {
      input.shoot = true;
      input.attack = false;
      input.attackPressed = false;
    }
    return;
  }
  if (tool === "fence") {
    if (input.attackPressed) input.buildFence = true;
    input.attack = false;
    input.attackPressed = false;
    return;
  }
  if (tool === "stone") {
    // Чулуу шидэлтийг combat update боловсруулна (attackPressed)
    return;
  }
}

/** @deprecated Hotbar 1–4 ашиглана */
export function trySelectTool(_state: GameState): boolean {
  return false;
}
