import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createRaceState,
  updateRace,
  finishMessage,
  bustedMessage,
  READY_MESSAGE,
  progress,
} from "../js/gameState.js";
import { formatTime } from "../js/hud.js";
import { TRACK } from "../js/config.js";

const frame = (over = {}) => ({ dt: 1 / 60, anyInput: false, carZ: 0, bounces: 0, ...over });

describe("updateRace", () => {
  test("começa em ready e não conta tempo sem input", () => {
    const r = createRaceState();
    for (let i = 0; i < 120; i++) updateRace(r, frame());
    assert.equal(r.phase, "ready");
    assert.equal(r.elapsed, 0);
  });

  test("primeiro input inicia a corrida e emite 'started'", () => {
    const r = createRaceState();
    const ev = updateRace(r, frame({ anyInput: true }));
    assert.equal(ev, "started");
    assert.equal(r.phase, "racing");
  });

  test("tempo acumula enquanto corre", () => {
    const r = createRaceState();
    updateRace(r, frame({ anyInput: true }));
    for (let i = 0; i < 60; i++) updateRace(r, frame({ carZ: 10 }));
    assert.ok(Math.abs(r.elapsed - 1) < 1e-9);
  });

  test("cruzar a linha de chegada finaliza e registra o tempo", () => {
    const r = createRaceState();
    updateRace(r, frame({ anyInput: true }));
    for (let i = 0; i < 30; i++) updateRace(r, frame({ carZ: 100 }));
    const ev = updateRace(r, frame({ carZ: TRACK.finishZ + 0.1, bounces: 2 }));
    assert.equal(ev, "finished");
    assert.equal(r.phase, "finished");
    assert.ok(r.finalTime > 0);
    assert.equal(r.finalTime, r.elapsed);
    assert.equal(r.hits, 2);
  });

  test("depois de finalizar, o tempo não muda mais", () => {
    const r = createRaceState();
    updateRace(r, frame({ anyInput: true }));
    updateRace(r, frame({ carZ: TRACK.finishZ }));
    const t = r.elapsed;
    for (let i = 0; i < 60; i++) updateRace(r, frame({ carZ: TRACK.finishZ + 50, anyInput: true }));
    assert.equal(r.elapsed, t);
    assert.equal(r.phase, "finished");
  });

  test("dt negativo é ignorado", () => {
    const r = createRaceState();
    updateRace(r, frame({ anyInput: true }));
    updateRace(r, frame({ dt: -5 }));
    assert.equal(r.elapsed, 0);
  });
});

describe("mensagens e progresso", () => {
  test("finishMessage inclui tempo e batidas", () => {
    const r = { phase: "finished", elapsed: 65.5, finalTime: 65.5, hits: 3 };
    const msg = finishMessage(r, formatTime);
    assert.match(msg, /01:05\.50/);
    assert.match(msg, /3 batidas/);
    assert.match(msg, /R para/);
  });

  test("finishMessage singular e zero", () => {
    assert.match(finishMessage({ finalTime: 1, hits: 1 }, formatTime), /1 batida\b/);
    assert.match(finishMessage({ finalTime: 1, hits: 0 }, formatTime), /Sem batidas/);
  });

  test("progress vai de 0 a 1 e é limitado", () => {
    assert.equal(progress(TRACK.startZ), 0);
    assert.equal(progress(TRACK.finishZ), 1);
    assert.equal(progress(TRACK.finishZ + 100), 1);
    assert.equal(progress(-50), 0);
    const mid = progress((TRACK.startZ + TRACK.finishZ) / 2);
    assert.ok(Math.abs(mid - 0.5) < 1e-9);
  });
});

describe("pego pela polícia", () => {
  test("medidor cheio encerra a corrida como 'busted'", () => {
    const r = createRaceState();
    updateRace(r, frame({ anyInput: true }));
    for (let i = 0; i < 60; i++) updateRace(r, frame({ carZ: 300, bust: 0.5 }));
    const ev = updateRace(r, frame({ carZ: 312, bust: 1 }));
    assert.equal(ev, "busted");
    assert.equal(r.phase, "busted");
    assert.equal(r.bustedAt, 312);
    assert.equal(r.finalTime, r.elapsed);
  });

  test("medidor abaixo de 1 não encerra", () => {
    const r = createRaceState();
    updateRace(r, frame({ anyInput: true }));
    assert.equal(updateRace(r, frame({ bust: 0.99 })), null);
    assert.equal(r.phase, "racing");
  });

  test("cruzar a chegada no mesmo frame vence o 'pego'", () => {
    const r = createRaceState();
    updateRace(r, frame({ anyInput: true }));
    assert.equal(updateRace(r, frame({ carZ: TRACK.finishZ + 1, bust: 1 })), "finished");
  });

  test("antes da largada o medidor é ignorado", () => {
    const r = createRaceState();
    assert.equal(updateRace(r, frame({ bust: 1 })), null);
    assert.equal(r.phase, "ready");
  });

  test("depois de pego, o tempo congela", () => {
    const r = createRaceState();
    updateRace(r, frame({ anyInput: true }));
    updateRace(r, frame({ bust: 1, carZ: 100 }));
    const t = r.elapsed;
    for (let i = 0; i < 30; i++) updateRace(r, frame({ anyInput: true, carZ: 100 }));
    assert.equal(r.elapsed, t);
    assert.equal(r.phase, "busted");
  });

  test("bustedMessage mostra quanto faltava, o tempo e como tentar de novo", () => {
    const msg = bustedMessage({ finalTime: 12.5, bustedAt: 400 }, formatTime);
    assert.match(msg, /Pego/);
    assert.match(msg, new RegExp(`${TRACK.finishZ - 400} m`));
    assert.match(msg, /00:12\.50/);
    assert.match(msg, /R para/);
  });

  test("mensagem inicial menciona a polícia", () => {
    assert.match(READY_MESSAGE, /polícia/);
    assert.match(READY_MESSAGE, /Acelere/);
  });
});
