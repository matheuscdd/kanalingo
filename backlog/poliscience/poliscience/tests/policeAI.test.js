import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  POLICE_CAR,
  createBrain,
  nextObstacleRow,
  blockedIntervals,
  planAvoidance,
  closingSpeed,
  policeDrive,
  updateBust,
  lateralReach,
  steerToward,
} from "../js/policeAI.js";
import { createState, step, lateralLimit } from "../js/carPhysics.js";
import { generateObstacles } from "../js/obstacleLayout.js";
import { POLICE, TRACK, CAR } from "../js/config.js";

const CFG = { POLICE, CAR: POLICE_CAR, TRACK };
const LIMIT = lateralLimit({ CAR: POLICE_CAR, TRACK });
const box = (x, z, w = 2.2, d = 2.2) => ({ x, z, w, h: 1.6, d, kind: "box" });

describe("antecipação de obstáculos", () => {
  test("encontra a fileira mais próxima à frente", () => {
    const row = nextObstacleRow([box(0, 80), box(3, 50), box(-3, 52)], 0, 40, CFG);
    assert.equal(row.length, 2);
    assert.deepEqual(row.map((o) => o.x).sort(), [-3, 3]);
  });

  test("ignora obstáculos que já ficaram para trás", () => {
    assert.equal(nextObstacleRow([box(0, -10)], 0, 30, CFG), null);
  });

  test("obstáculo ao lado do carro ainda conta", () => {
    assert.equal(nextObstacleRow([box(3, 0.5)], 0, 30, CFG).length, 1);
  });

  test("antecipação cresce com a velocidade", () => {
    assert.equal(nextObstacleRow([box(0, 60)], 0, 10, CFG), null);
    assert.ok(nextObstacleRow([box(0, 60)], 0, 50, CFG));
  });

  test("blockedIntervals une trechos sobrepostos", () => {
    const iv = blockedIntervals([box(0, 10), box(2, 10), box(6, 10)], 2, 0.5);
    // cada obstáculo bloqueia centro ±(1.1 + 1 + 0.5) = ±2.6
    assert.deepEqual(iv, [
      [-2.6, 4.6],
      [3.4, 8.6],
    ].reduce((acc, cur) => {
      const last = acc[acc.length - 1];
      if (last && cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
      else acc.push([...cur]);
      return acc;
    }, []));
  });
});

describe("planAvoidance", () => {
  // Obstáculo em x=0 bloqueia o centro do carro em ±(1.1 + 1 + 0.5) = ±2.6;
  // a viatura mira avoidInset para dentro do vão.
  const EDGE = 2.6 + POLICE.avoidInset;

  test("sai da frente de um obstáculo na faixa, pelo lado mais próximo do desejado", () => {
    const plan = planAvoidance(0, 0, 30, 1, [box(0, 40)], CFG);
    assert.ok(Math.abs(plan.targetX - EDGE) < 1e-9, `targetX ${plan.targetX}`);
    assert.equal(plan.brake, false);
  });

  test("desejado à esquerda: desvia pela esquerda", () => {
    const plan = planAvoidance(0, 0, 30, -0.5, [box(0, 40)], CFG);
    assert.ok(Math.abs(plan.targetX + EDGE) < 1e-9, `targetX ${plan.targetX}`);
  });

  test("já desviando por um lado, não troca de lado em cima da hora", () => {
    // Está em x=2 (indo pela direita); o jogador foi para a esquerda
    const plan = planAvoidance(2, 0, 50, -2, [box(0, 20)], CFG);
    assert.ok(plan.targetX > 2.6, `trocou de lado: targetX ${plan.targetX}`);
  });

  test("já se posiciona para a fileira seguinte", () => {
    // 1ª fileira livre à direita e à esquerda; a 2ª só é passável pela esquerda
    const rows = [box(0, 30), box(1.5, 60), box(5, 60)];
    const plan = planAvoidance(0, 0, 50, 3, rows, CFG);
    assert.ok(plan.targetX < -2.6, `deveria ir pela esquerda: targetX ${plan.targetX}`);
  });

  test("ao lado de uma fileira, fica no vão em que está", () => {
    // Carro em x=4 passando ao lado do obstáculo em x=0; o desejado é x=-4
    const plan = planAvoidance(4, 20, 40, -4, [box(0, 20)], CFG);
    assert.ok(plan.targetX >= 2.6, `atravessaria o obstáculo: targetX ${plan.targetX}`);
  });

  test("sem obstáculo no caminho, mantém o X desejado", () => {
    const plan = planAvoidance(0, 0, 30, -4, [box(3, 50)], CFG);
    assert.equal(plan.targetX, -4);
  });

  test("X desejado fora da pista é limitado", () => {
    assert.equal(planAvoidance(0, 0, 30, 20, [], CFG).targetX, LIMIT);
  });

  test("freia quando não dá tempo de desviar", () => {
    const plan = planAvoidance(0, 0, 30, 0, [box(0, 6)], CFG);
    assert.equal(plan.brake, true);
  });

  test("não freia se o obstáculo não está na sua faixa", () => {
    const plan = planAvoidance(-5, 0, 30, -5, [box(2, 6)], CFG);
    assert.equal(plan.brake, false);
  });

  test("fileira que fecha quase tudo: usa o único vão", () => {
    // obstáculos em -5.5, -1, 3.5 deixam vão perto de x = 5.95 (limite) ... escolhe livre
    const row = [box(-5.5, 40), box(-1, 40), box(3.1, 40)];
    const plan = planAvoidance(0, 0, 30, 0, row, CFG);
    const blocked = blockedIntervals(row, POLICE_CAR.width, POLICE.obstacleMargin);
    const inside = blocked.some(([l, r]) => plan.targetX > l && plan.targetX < r);
    assert.equal(inside, false, `targetX ${plan.targetX} está bloqueado`);
    assert.ok(Math.abs(plan.targetX) <= LIMIT + 1e-9);
  });
});

describe("alcance lateral e volante (modelo de bicicleta)", () => {
  test("sem espaço à frente não desloca nada; devagar desloca mais por metro que rápido", () => {
    assert.equal(lateralReach(0, 10), 0);
    assert.ok(lateralReach(40, 5) > lateralReach(40, 60));
    assert.ok(lateralReach(40, 60) > 0);
  });

  test("parado, o volante só vira as rodas na direção do alvo", () => {
    assert.equal(steerToward(3, 0), 1);
    assert.equal(steerToward(-3, 0), -1);
    assert.equal(steerToward(0.01, 0), 0);
  });

  test("andando, pede o ângulo que leva ao alvo; de ré o comando continua 'para o lado do alvo'", () => {
    assert.ok(steerToward(2, 30) > 0);
    assert.ok(steerToward(-2, 30) < 0);
    assert.equal(steerToward(0, 30), 0);
    // De ré: virar para a direita leva o carro para a direita (ver carPhysics.step)
    const s = createState();
    let x = 0;
    for (let i = 0; i < 90; i++) {
      s.speed = -5;
      step(s, { throttle: 0, steer: steerToward(3 - x, s.speed) }, DT, x, { CAR: POLICE_CAR, TRACK });
      x += s.vx * DT;
    }
    assert.ok(x > 0.5, `de ré deveria ir para a direita: x=${x.toFixed(2)}`);
  });

  test("perto demais de um obstáculo para desviar andando: dá ré", () => {
    const plan = planAvoidance(0, 0, 0, 0, [box(0, 5)], CFG);
    assert.equal(plan.speedCap, -POLICE.backupSpeed);
  });

  test("já inclinada para o lado certo, pode passar mais rápido", () => {
    const straight = planAvoidance(0, 0, 40, 3, [box(0, 25)], CFG, 0);
    const angled = planAvoidance(0, 0, 40, 3, [box(0, 25)], CFG, POLICE_CAR.headingMaxHigh);
    assert.ok(angled.speedCap > straight.speedCap, `${angled.speedCap} <= ${straight.speedCap}`);
  });

  test("alinhada atrás do jogador parado e perto demais para abrir para o lado: dá ré", () => {
    const out = policeDrive(createBrain(), { x: 0, z: 0, speed: 0 }, { x: 0, z: 7, speed: 0 }, [], true);
    assert.ok(out.throttle < 0, `throttle ${out.throttle}`);
  });
});

describe("closingSpeed", () => {
  test("perto do alvo é proporcional", () => {
    assert.ok(Math.abs(closingSpeed(12, 10) - 2 * POLICE.gapGain) < 1e-9);
  });
  test("perto demais: velocidade relativa negativa (recua)", () => {
    assert.ok(closingSpeed(5, 10) < 0);
  });
  test("longe: limitado ao máximo", () => {
    assert.equal(closingSpeed(1000, 10), POLICE.maxClosing);
    assert.equal(closingSpeed(-1000, 10), -POLICE.maxClosing);
  });

  test("a desaceleração exigida cabe no freio da viatura", () => {
    // d(closing)/dt = gapGain × closing ≤ gapGain × maxClosing
    assert.ok(POLICE.gapGain * POLICE.maxClosing < POLICE_CAR.brakeDecel);
  });
});

describe("policeDrive", () => {
  test("inativa e parada: não faz nada", () => {
    const b = createBrain();
    assert.deepEqual(policeDrive(b, { x: 0, z: 0, speed: 0 }, { x: 0, z: 30, speed: 0 }, [], false), {
      throttle: 0,
      steer: 0,
    });
    assert.equal(b.mode, "idle");
  });

  test("inativa em movimento: freia", () => {
    const out = policeDrive(createBrain(), { x: 0, z: 0, speed: 20 }, { x: 0, z: 30, speed: 0 }, [], false);
    assert.equal(out.throttle, -1);
  });

  test("longe atrás de um jogador rápido: acelera tudo", () => {
    const b = createBrain();
    const out = policeDrive(b, { x: 0, z: 0, speed: 30 }, { x: 0, z: 120, speed: 40 }, [], true);
    assert.equal(b.mode, "chase");
    assert.equal(out.throttle, 1);
  });

  test("na distância de perseguição com a mesma velocidade: quase sem acelerador", () => {
    const out = policeDrive(
      createBrain(),
      { x: 0, z: 0, speed: 50 },
      { x: 0, z: POLICE.followGap, speed: 50 },
      [],
      true
    );
    assert.ok(Math.abs(out.throttle) < 0.05, `throttle ${out.throttle}`);
    assert.equal(out.steer, 0);
  });

  test("segue o jogador para o lado", () => {
    const out = policeDrive(createBrain(), { x: 0, z: 0, speed: 50 }, { x: 3, z: 12, speed: 50 }, [], true);
    assert.ok(out.steer > 0);
  });

  test("jogador lento por perto: encurrala pelo lado do centro da pista", () => {
    const b = createBrain();
    policeDrive(b, { x: 3, z: 0, speed: 20 }, { x: 3, z: 20, speed: 0 }, [], true);
    assert.equal(b.mode, "box");
    assert.equal(b.side, -1);
    assert.ok(Math.abs(b.targetX - (3 - POLICE.sideOffset)) < 1e-9);
  });

  test("alinhado atrás ao encurralar: freia para não bater", () => {
    const out = policeDrive(createBrain(), { x: 0, z: 0, speed: 20 }, { x: 0, z: 12, speed: 0 }, [], true);
    assert.ok(out.throttle < 0, `throttle ${out.throttle}`);
  });

  test("já ao lado: avança até ficar emparelhado", () => {
    const b = createBrain();
    b.mode = "box";
    b.side = 1;
    const out = policeDrive(
      b,
      { x: POLICE.sideOffset, z: 0, speed: 0 },
      { x: 0, z: 8, speed: 0 },
      [],
      true
    );
    assert.ok(out.throttle > 0);
  });

  test("jogador lento mas longe: continua em perseguição", () => {
    const b = createBrain();
    policeDrive(b, { x: 0, z: 0, speed: 20 }, { x: 0, z: POLICE.boxEngageDistance + 20, speed: 0 }, [], true);
    assert.equal(b.mode, "chase");
  });

  test("histerese para sair do modo encurralar", () => {
    const b = createBrain();
    b.mode = "box";
    policeDrive(b, { x: 3, z: 0, speed: 10 }, { x: 0, z: 2, speed: POLICE.bustSpeed + 1 }, [], true);
    assert.equal(b.mode, "box");
    policeDrive(b, { x: 3, z: 0, speed: 10 }, { x: 0, z: 2, speed: POLICE.bustSpeed + POLICE.boxExitMargin + 1 }, [], true);
    assert.equal(b.mode, "chase");
  });

  test("freia quando o planejador manda", () => {
    const out = policeDrive(createBrain(), { x: 0, z: 0, speed: 40 }, { x: 0, z: 100, speed: 60 }, [box(0, 6)], true);
    assert.equal(out.throttle, -1);
  });
});

describe("updateBust", () => {
  const near = { distance: 3, playerSpeed: 0 };

  test("enche em bustTime segundos com a polícia perto e o jogador parado", () => {
    let m = 0;
    const dt = 1 / 60;
    let t = 0;
    while (m < 1 && t < 10) {
      m = updateBust(m, { ...near, dt });
      t += dt;
    }
    assert.equal(m, 1);
    assert.ok(Math.abs(t - POLICE.bustTime) < 0.05, `levou ${t}s`);
  });

  test("não enche se o jogador está rápido ou a polícia longe", () => {
    assert.equal(updateBust(0, { distance: 3, playerSpeed: POLICE.bustSpeed + 1, dt: 1 }), 0);
    assert.equal(updateBust(0, { distance: POLICE.bustRadius + 1, playerSpeed: 0, dt: 1 }), 0);
  });

  test("esvazia devagar ao escapar", () => {
    const m = updateBust(0.9, { distance: 50, playerSpeed: 40, dt: 1 });
    assert.ok(Math.abs(m - (0.9 - 1 / POLICE.bustRecoverTime)) < 1e-9);
  });

  test("limitado a 0..1", () => {
    assert.equal(updateBust(0.99, { ...near, dt: 5 }), 1);
    assert.equal(updateBust(0.01, { distance: 99, playerSpeed: 50, dt: 5 }), 0);
  });

  test("canBust=false nunca enche", () => {
    assert.equal(updateBust(0.5, { ...near, dt: 5 }, { ...POLICE, canBust: false }), 0);
  });
});

// --- Simulação cinemática da perseguição (mesmo modelo arcade do jogo, sem Havok) ---

const DT = 1 / 60;
const overlap = (a, b, aw, ad, bw, bd) =>
  Math.abs(a.x - b.x) < (aw + bw) / 2 && Math.abs(a.z - b.z) < (ad + bd) / 2;

function simulateChase({ obstacles, player, seconds }) {
  const brain = createBrain();
  const police = { x: POLICE.startPosition.x, z: POLICE.startPosition.z, state: createState() };
  let obstacleHits = 0;
  let playerHits = 0;
  let touchingObstacle = false;
  let touchingPlayer = false;
  let bust = 0;
  let bustAt = null;
  let minGapAfter10s = Infinity;
  let minSpeedAfter4s = Infinity;
  const n = Math.round(seconds / DT);

  for (let i = 0; i < n; i++) {
    const t = i * DT;
    const p = player(t);
    const input = policeDrive(
      brain,
      { x: police.x, z: police.z, speed: police.state.speed, heading: police.state.heading },
      p,
      obstacles,
      true
    );
    step(police.state, input, DT, police.x, { CAR: POLICE_CAR, TRACK });
    police.x = Math.max(-LIMIT, Math.min(LIMIT, police.x + police.state.vx * DT));
    police.z += police.state.vz * DT;
    if (t > 10) minGapAfter10s = Math.min(minGapAfter10s, p.z - police.z);
    if (t > 4) minSpeedAfter4s = Math.min(minSpeedAfter4s, police.state.speed);

    const hitO = obstacles.some((o) => overlap(police, o, CAR.width, CAR.length, o.w, o.d));
    if (hitO && !touchingObstacle) obstacleHits++;
    touchingObstacle = hitO;

    const hitP = overlap(police, p, CAR.width, CAR.length, CAR.width, CAR.length);
    if (hitP && !touchingPlayer) playerHits++;
    touchingPlayer = hitP;

    bust = updateBust(bust, { distance: Math.hypot(p.x - police.x, p.z - police.z), playerSpeed: p.speed, dt: DT });
    if (bust >= 1 && bustAt === null) bustAt = t;
  }
  return { police, brain, obstacleHits, playerHits, bustAt, minGapAfter10s, minSpeedAfter4s };
}

describe("simulação da perseguição", () => {
  // "Fantasma" do jogador: 50 m/s ziguezagueando, atravessa obstáculos (só a polícia desvia)
  const ghost = (t) => ({ x: 4 * Math.sin(t * 0.7), z: 20 + 50 * t, speed: 50 });

  for (const seed of [42, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    test(`seed ${seed}: a viatura cruza a pista sem bater em obstáculos e alcança o jogador`, () => {
      const obstacles = generateObstacles({ seed });
      const r = simulateChase({ obstacles, player: ghost, seconds: 19 });
      assert.equal(r.obstacleHits, 0, `bateu ${r.obstacleHits}x em obstáculos`);
      assert.equal(r.playerHits, 0, "bateu no jogador");
      // Alcança o jogador em algum momento (desvios podem fazê-la perder terreno depois)
      assert.ok(r.minGapAfter10s < 25, `nunca chegou perto: menor distância ${r.minGapAfter10s.toFixed(1)} m`);
      // Não "desiste": nunca fica quase parada por causa de um desvio
      assert.ok(r.minSpeedAfter4s > 15, `freou demais: ${r.minSpeedAfter4s.toFixed(1)} m/s`);
    });
  }

  test("jogador freia até parar: a viatura encosta ao lado sem bater e o pega", () => {
    // Jogador a 50 m/s freia com o freio do carro (35 m/s²) a partir de t = 7.6 s
    const brakeT = 7.6;
    const v0 = 50;
    const a = CAR.brakeDecel;
    const stopT = brakeT + v0 / a;
    const stopZ = 20 + v0 * brakeT + (v0 * v0) / (2 * a);
    const player = (t) => {
      if (t < brakeT) return { x: 1, z: 20 + v0 * t, speed: v0 };
      if (t < stopT) {
        const tb = t - brakeT;
        return { x: 1, z: 20 + v0 * brakeT + v0 * tb - 0.5 * a * tb * tb, speed: v0 - a * tb };
      }
      return { x: 1, z: stopZ, speed: 0 };
    };
    const r = simulateChase({ obstacles: [], player, seconds: stopT + 8 });
    assert.equal(r.playerHits, 0, "bateu no jogador");
    assert.equal(r.brain.mode, "box");
    assert.ok(Math.abs(r.police.x - 1) >= CAR.width + POLICE.sideClearance - 0.1, `não ficou ao lado: x=${r.police.x}`);
    assert.ok(Math.abs(r.police.z - stopZ) < 4, `não emparelhou: z=${r.police.z}`);
    assert.ok(r.bustAt !== null, "não pegou o jogador");
    assert.ok(r.bustAt - stopT < 7, `demorou ${(r.bustAt - stopT).toFixed(1)} s para pegar`);
  });

  test("catch-up: alcança um jogador perfeito a 60 m/s ainda durante a corrida", () => {
    // Jogador sai 1.2 s antes (atraso da viatura) acelerando como o carro real
    const player = (t) => {
      const v = Math.min(CAR.maxSpeed, CAR.acceleration * (t + 1.2));
      const tAcc = CAR.maxSpeed / CAR.acceleration;
      const tt = t + 1.2;
      const z = tt < tAcc ? 0.5 * CAR.acceleration * tt * tt : 0.5 * CAR.acceleration * tAcc * tAcc + CAR.maxSpeed * (tt - tAcc);
      return { x: 0, z: CAR.startPosition.z + z, speed: v };
    };
    // O jogador perfeito cruza a chegada ~17 s depois da viatura sair
    const r = simulateChase({ obstacles: [], player, seconds: 14 });
    const gap = player(14).z - r.police.z;
    assert.ok(gap < 25, `ainda longe depois de 14 s: ${gap.toFixed(1)} m`);
    assert.equal(r.playerHits, 0);
  });

  test("na distância de perseguição não passa do ritmo de cruzeiro", () => {
    const out = policeDrive(
      createBrain(),
      { x: 0, z: 0, speed: POLICE.cruiseSpeed },
      { x: 0, z: POLICE.followGap, speed: 69 },
      [],
      true
    );
    assert.ok(out.throttle <= 0, `acelerou além do cruzeiro: ${out.throttle}`);
  });

  test("jogador rápido e sem erros nunca é pego", () => {
    const player = (t) => ({ x: 0, z: 30 + 58 * t, speed: 58 });
    const r = simulateChase({ obstacles: [], player, seconds: 17 });
    assert.equal(r.bustAt, null);
    assert.equal(r.playerHits, 0);
  });
});
