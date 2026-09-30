import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTime, policeStatus } from "../js/hud.js";

test("formatTime formata mm:ss.cc", () => {
  assert.equal(formatTime(0), "00:00.00");
  assert.equal(formatTime(5.25), "00:05.25");
  assert.equal(formatTime(65.5), "01:05.50");
  assert.equal(formatTime(600), "10:00.00");
});

test("formatTime não fica negativo", () => {
  assert.equal(formatTime(-3), "00:00.00");
});

test("policeStatus: distância arredondada e nível de alerta", () => {
  assert.deepEqual(policeStatus(120.4, 0), { text: "120 m", level: "calm", percent: 0 });
  assert.equal(policeStatus(22, 0).level, "warning");
  assert.equal(policeStatus(3, 0.4).level, "danger");
  assert.equal(policeStatus(3, 0.4).percent, 40);
});

test("policeStatus: limita o medidor e trata distância inválida", () => {
  assert.equal(policeStatus(5, 1.7).percent, 100);
  assert.equal(policeStatus(5, -1).percent, 0);
  assert.equal(policeStatus(NaN, 0).text, "-- m");
});
