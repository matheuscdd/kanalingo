import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateObstacles, largestGapPerRow, createRng } from "../js/obstacleLayout.js";
import { OBSTACLES, TRACK, CAR } from "../js/config.js";

const halfW = TRACK.width / 2;

describe("generateObstacles", () => {
  test("gera uma quantidade razoável de obstáculos", () => {
    const list = generateObstacles();
    assert.ok(list.length >= 15, `poucos obstáculos: ${list.length}`);
    assert.ok(list.length <= 80, `muitos obstáculos: ${list.length}`);
  });

  test("nenhum obstáculo na zona segura inicial", () => {
    const list = generateObstacles();
    for (const o of list) {
      assert.ok(
        o.z - o.d / 2 >= TRACK.startZ + OBSTACLES.safeZone - 4,
        `obstáculo em z=${o.z} dentro da zona segura`
      );
    }
  });

  test("nenhum obstáculo perto da chegada", () => {
    const list = generateObstacles();
    for (const o of list) {
      assert.ok(o.z + o.d / 2 < TRACK.finishZ - OBSTACLES.endMargin + 4, `z=${o.z} perto da chegada`);
    }
  });

  test("todos dentro da largura da pista", () => {
    const list = generateObstacles();
    for (const o of list) {
      assert.ok(o.x - o.w / 2 >= -halfW - 1e-9, `x=${o.x} fora à esquerda`);
      assert.ok(o.x + o.w / 2 <= halfW + 1e-9, `x=${o.x} fora à direita`);
    }
  });

  test("toda fileira deixa um vão maior que o carro", () => {
    const list = generateObstacles();
    const rows = largestGapPerRow(list, halfW);
    assert.ok(rows.length > 0);
    for (const r of rows) {
      assert.ok(
        r.gap >= CAR.width + 0.5,
        `fileira z=${r.z} (${r.count} obst.) com vão ${r.gap.toFixed(2)} < ${CAR.width + 0.5}`
      );
    }
  });

  test("determinístico para a mesma seed", () => {
    const a = generateObstacles({ seed: 7 });
    const b = generateObstacles({ seed: 7 });
    assert.deepEqual(a, b);
  });

  test("seeds diferentes geram layouts diferentes", () => {
    const a = generateObstacles({ seed: 1 });
    const b = generateObstacles({ seed: 2 });
    assert.notDeepEqual(a, b);
  });

  test("vários seeds respeitam o vão mínimo", () => {
    for (let seed = 0; seed < 50; seed++) {
      const list = generateObstacles({ seed });
      for (const r of largestGapPerRow(list, halfW)) {
        assert.ok(r.gap >= CAR.width + 0.5, `seed ${seed} fileira z=${r.z} vão ${r.gap}`);
      }
    }
  });

  test("tipos válidos", () => {
    const kinds = new Set(generateObstacles().map((o) => o.kind));
    for (const k of kinds) assert.ok(["box", "cone", "barrier"].includes(k));
  });
});

describe("createRng", () => {
  test("gera valores em [0, 1) e é determinístico", () => {
    const r1 = createRng(123);
    const r2 = createRng(123);
    for (let i = 0; i < 100; i++) {
      const v = r1();
      assert.ok(v >= 0 && v < 1);
      assert.equal(v, r2());
    }
  });
});

describe("largestGapPerRow", () => {
  test("calcula o vão entre dois obstáculos", () => {
    const rows = largestGapPerRow(
      [
        { x: -5, z: 100, w: 2, h: 1, d: 2, kind: "box" },
        { x: 5, z: 101, w: 2, h: 1, d: 2, kind: "box" },
      ],
      7
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].gap, 8); // de -4 a +4
  });

  test("vão na borda quando só há um obstáculo no centro", () => {
    const rows = largestGapPerRow([{ x: 0, z: 100, w: 2, h: 1, d: 2, kind: "box" }], 7);
    assert.equal(rows[0].gap, 6);
  });
});
