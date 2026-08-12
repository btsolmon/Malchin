import { sfx } from "../audio";
import type { GameState, PlayerTool } from "../types";
import { setMessage } from "../utils";

/**
 * 1 — нударга, 2 — нум, 3 — хашаа. J-ээр сонгосон зүйлийг хэрэглэнэ.
 */
export function trySelectTool(state: GameState): boolean {
  const { input, player } = state;
  let next: PlayerTool | null = null;
  if (input.skill1) next = "melee";
  else if (input.skill2) next = "bow";
  else if (input.skill3) next = "fence";
  if (!next) return false;

  if (
    player.combatPhase !== "idle" ||
    player.dodgePhase !== "idle" ||
    player.parryPhase !== "idle"
  ) {
    setMessage(state, "Тулааны хөдөлгөөн дууссаны дараа зэвсгээ солино.", 1.4);
    return true;
  }

  if (player.tool === next) return true;

  player.tool = next;
  if (next !== "fence") state.fencePreview = false;
  if (next === "melee") {
    player.weapon = player.hasSkySword ? "skySword" : "staff";
    setMessage(
      state,
      player.hasSkySword
        ? "Цохих сонголоо. J — цавчих."
        : "Нударга сонголоо. J — цохих.",
      1.6,
    );
  } else if (next === "bow") {
    setMessage(state, "Нум сонголоо. J — харвах.", 1.6);
  } else {
    setMessage(state, "Хашаа сонголоо. J — барих.", 1.6);
  }
  sfx("select");
  return true;
}

/** J-г сонгосон зэвсгийн үйлдэл рүү хөрвүүлнэ */
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
  }
}
