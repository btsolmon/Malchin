// Player death sequence: control lock, hurt animation, fade, then defeat screen.

import type { GameState } from "./types";
import { setMessage } from "./utils";

export const PLAYER_DEATH_DURATION_SECONDS = 1.05;
export const PLAYER_DEATH_FADE_START = 0.28;

export function beginPlayerDeath(
  state: GameState,
  message: string,
): void {
  if (state.phase !== "playing") return;

  const player = state.player;
  player.vitals.health = 0;
  player.moving = false;
  player.combatPhase = "idle";
  player.combatTimer = 0;
  player.attackAnim = 0;
  player.attackMelee = false;
  player.dodgePhase = "idle";
  player.dodgeTimer = 0;
  player.parryPhase = "idle";
  player.parryTimer = 0;
  player.parryArmed = false;
  player.invuln = Math.max(
    player.invuln,
    PLAYER_DEATH_DURATION_SECONDS + 0.2,
  );

  state.input.up = false;
  state.input.down = false;
  state.input.left = false;
  state.input.right = false;
  state.input.attack = false;
  state.input.dodge = false;
  state.input.parry = false;
  state.input.shoot = false;
  state.input.interact = false;

  state.deathTimer = PLAYER_DEATH_DURATION_SECONDS;
  state.fx.hurtFlash = Math.max(state.fx.hurtFlash, 1);
  state.phase = "dying";
  setMessage(state, message, 99);
}

export function updatePlayerDeath(
  state: GameState,
  dt: number,
): void {
  if (state.phase !== "dying") return;

  state.player.moving = false;
  state.deathTimer = Math.max(0, state.deathTimer - Math.max(0, dt));

  if (state.deathTimer <= 0) {
    state.phase = "lost";
  }
}

export function getPlayerDeathProgress(state: GameState): number {
  if (state.phase !== "dying") return 0;

  return Math.min(
    1,
    Math.max(
      0,
      1 - state.deathTimer / PLAYER_DEATH_DURATION_SECONDS,
    ),
  );
}
