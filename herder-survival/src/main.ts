/**
 * Vite entry — shared game logic from repo root lib/
 */
import { mountHerderGame } from "../../lib/herder-game";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#game canvas олдсонгүй");
mountHerderGame(canvas);
