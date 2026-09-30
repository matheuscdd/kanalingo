// Máquina de estados da corrida (módulo puro, testável em Node).
// Estados: "ready" (aguardando primeiro input) -> "racing" -> "finished" | "busted".

import { TRACK } from "./config.js";

/**
 * @typedef {Object} RaceState
 * @property {"ready"|"racing"|"finished"|"busted"} phase
 * @property {number} elapsed  segundos desde a largada
 * @property {number} finalTime tempo registrado na chegada ou quando foi pego (0 antes disso)
 * @property {number} hits batidas registradas na corrida atual
 * @property {number} bustedAt posição Z em que o jogador foi pego (0 se não foi)
 */

/** @returns {RaceState} */
export function createRaceState() {
  return { phase: "ready", elapsed: 0, finalTime: 0, hits: 0, bustedAt: 0 };
}

/**
 * Avança a corrida em `dt` segundos.
 * @param {RaceState} race
 * @param {{ dt: number, anyInput: boolean, carZ: number, bounces: number, bust?: number }} frame
 *        bust: medidor de "pego" da polícia (0..1); ao chegar em 1 a corrida termina
 * @param {typeof TRACK} [track]
 * @returns {"started"|"finished"|"busted"|null} evento ocorrido neste passo (se algum)
 */
export function updateRace(race, frame, track = TRACK) {
  if (race.phase === "ready") {
    if (frame.anyInput) {
      race.phase = "racing";
      return "started";
    }
    return null;
  }

  if (race.phase === "racing") {
    race.elapsed += Math.max(0, frame.dt);
    race.hits = frame.bounces;
    // Cruzar a chegada tem prioridade sobre ser pego no mesmo frame
    if (frame.carZ >= track.finishZ) {
      race.phase = "finished";
      race.finalTime = race.elapsed;
      return "finished";
    }
    if ((frame.bust ?? 0) >= 1) {
      race.phase = "busted";
      race.finalTime = race.elapsed;
      race.bustedAt = frame.carZ;
      return "busted";
    }
  }

  return null;
}

/** Texto exibido ao cruzar a chegada. */
export function finishMessage(race, formatTime) {
  const hitsText =
    race.hits === 0 ? "Sem batidas!" : race.hits === 1 ? "1 batida" : `${race.hits} batidas`;
  return `Chegada!\nTempo: ${formatTime(race.finalTime)}\n${hitsText}\n\nPressione R para correr de novo`;
}

/** Texto exibido quando a polícia pega o jogador. */
export function bustedMessage(race, formatTime, track = TRACK) {
  const left = Math.max(0, Math.round(track.finishZ - race.bustedAt));
  return `Pego pela polícia!\nFaltavam ${left} m para a chegada\nTempo: ${formatTime(race.finalTime)}\n\nPressione R para tentar de novo`;
}

/** Texto exibido antes da largada. */
export const READY_MESSAGE =
  "Reta Final\n\nFuja da polícia até a chegada\nSetas ou WASD para dirigir\nR para reiniciar\n\nAcelere para começar";

/** Progresso 0..1 ao longo da pista. */
export function progress(carZ, track = TRACK) {
  const p = (carZ - track.startZ) / (track.finishZ - track.startZ);
  return Math.min(1, Math.max(0, p));
}
