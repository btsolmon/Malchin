import { sfx } from "../audio";
import type { GameState } from "../types";
import { setMessage } from "../utils";

/**
 * Handle the ZIP combat module's 1/2 weapon selection without changing the
 * existing survival-oriented player module.
 *
 * Returns true when either weapon-selection input was handled.
 */
export function trySwitchPlayerWeapon(state: GameState): boolean {
  const { input, player } = state;
  const wantsStaff = input.skill1;
  const wantsSword = input.skill2;
  if (!wantsStaff && !wantsSword) return false;

  if (
    player.combatPhase !== "idle" ||
    player.dodgePhase !== "idle" ||
    player.parryPhase !== "idle"
  ) {
    setMessage(state, "Тулааны хөдөлгөөн дууссаны дараа зэвсгээ солино.", 1.4);
    return true;
  }

  if (wantsStaff) {
    if (player.weapon !== "staff") {
      player.weapon = "staff";
      setMessage(state, "Нударгаа зангидлаа.", 1.4);
      sfx("select");
    }
    return true;
  }

  if (!player.hasSkySword) {
    setMessage(state, "Хөх тэнгэрийн сэлмийг хараахан олоогүй байна.", 1.8);
    sfx("move");
    return true;
  }

  if (player.weapon !== "skySword") {
    player.weapon = "skySword";
    setMessage(state, "Хөх тэнгэрийн сэлмээ сугаллаа.", 1.8);
    sfx("select");
  }
  return true;
}
