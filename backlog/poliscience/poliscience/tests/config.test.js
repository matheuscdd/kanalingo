import { test } from "node:test";
import assert from "node:assert/strict";
import { TRACK, CAR, BOUNCE, OBSTACLES, POLICE, MIRROR } from "../js/config.js";

test("linha de chegada fica dentro da pista", () => {
  assert.ok(TRACK.finishZ > TRACK.startZ);
  assert.ok(TRACK.finishZ <= TRACK.length);
});

test("carro cabe na pista e no vão mínimo dos obstáculos", () => {
  assert.ok(CAR.width < TRACK.width);
  assert.ok(OBSTACLES.minGap > CAR.width);
});

test("parâmetros de rebote são coerentes", () => {
  assert.ok(BOUNCE.speedFactor > 0 && BOUNCE.speedFactor < 1);
  assert.ok(BOUNCE.stunDuration > 0);
});

test("viatura começa atrás do jogador, dentro do asfalto antes da largada", () => {
  const p = POLICE.startPosition;
  assert.ok(p.z < CAR.startPosition.z - CAR.length * 2, "longe o bastante para não encostar");
  assert.ok(p.z - CAR.length / 2 > -TRACK.runUp, "dentro da área antes da largada");
});

test("encurralar deixa a viatura ao lado sem encostar e dentro do raio de 'pego'", () => {
  assert.ok(POLICE.sideOffset > CAR.width + POLICE.sideClearance);
  assert.ok(Math.hypot(POLICE.sideOffset, POLICE.boxGap) < POLICE.bustRadius);
  assert.ok(POLICE.tailGap > CAR.length, "distância de espera atrás maior que um carro");
  assert.ok(POLICE.followGap > POLICE.tailGap);
});

test("retrovisor ocupa uma área válida da tela", () => {
  const v = MIRROR.viewport;
  assert.ok(v.x >= 0 && v.y >= 0 && v.x + v.w <= 1 && v.y + v.h <= 1);
  assert.ok(MIRROR.minZ > CAR.length / 2, "recorta a traseira do próprio carro");
});
