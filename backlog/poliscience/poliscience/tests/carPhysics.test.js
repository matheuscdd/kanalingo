import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  step,
  lateralLimit,
  toKmh,
  applyBounce,
  resolveCarCollision,
  headingMax,
  maxYawRate,
} from "../js/carPhysics.js";
import { CAR, BOUNCE, RAM } from "../js/config.js";

const DT = 1 / 60;

function run(state, input, seconds, x = 0) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) step(state, input, DT, x);
  return state;
}

describe("longitudinal", () => {
  test("acelera até a velocidade máxima e não ultrapassa", () => {
    const s = run(createState(), { throttle: 1, steer: 0 }, 30);
    assert.equal(s.speed, CAR.maxSpeed);
  });

  test("acelera de forma progressiva", () => {
    const s = run(createState(), { throttle: 1, steer: 0 }, 1);
    assert.ok(s.speed > 0);
    assert.ok(s.speed < CAR.maxSpeed);
    assert.ok(Math.abs(s.speed - CAR.acceleration) < 0.5);
  });

  test("freia até parar e depois dá ré limitada", () => {
    const s = run(createState(), { throttle: 1, steer: 0 }, 3);
    run(s, { throttle: -1, steer: 0 }, 5);
    assert.ok(s.speed < 0, "deveria estar de ré");
    assert.equal(s.speed, -CAR.maxReverseSpeed);
  });

  test("sem input, o atrito desacelera até zero", () => {
    const s = run(createState(), { throttle: 1, steer: 0 }, 2);
    const before = s.speed;
    run(s, { throttle: 0, steer: 0 }, 0.5);
    assert.ok(s.speed < before);
    run(s, { throttle: 0, steer: 0 }, 30);
    assert.equal(s.speed, 0);
  });

  test("acelerar enquanto está de ré primeiro freia até zero", () => {
    const s = createState();
    s.speed = -5;
    run(s, { throttle: 1, steer: 0 }, 0.1);
    assert.ok(s.speed > -5 && s.speed <= 0);
  });

  test("dt muito grande é limitado (sem saltos absurdos)", () => {
    const s = createState();
    step(s, { throttle: 1, steer: 0 }, 5, 0);
    assert.ok(s.speed <= CAR.acceleration * 0.1 + 1e-9);
  });
});

/** Roda mantendo a velocidade fixa em `v` (isola a direção do acelerador). */
function runAt(state, v, steer, seconds, x = 0, onStep) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    state.speed = v;
    step(state, { throttle: 0, steer }, DT, x);
    onStep?.(state);
  }
  return state;
}

/** Deslocamento lateral acumulado em `seconds` a velocidade fixa. */
function lateralTravel(v, steer, seconds) {
  const s = createState();
  let x = 0;
  runAt(s, v, steer, seconds, 0, (st) => (x += st.vx * DT));
  return x;
}

describe("direção: o carro só vai para o lado andando", () => {
  test("parado, virar não desloca o carro nem gira o corpo (só as rodas)", () => {
    const s = run(createState(), { throttle: 0, steer: 1 }, 2);
    assert.equal(s.vx, 0);
    assert.equal(s.heading, 0);
    assert.ok(Math.abs(s.steerAngle - CAR.steerMax) < 1e-9, `rodas: ${s.steerAngle}`);
  });

  test("virar à direita andando: nariz para a direita e desloca para a direita", () => {
    const s = runAt(createState(), 30, 1, 1);
    assert.ok(s.heading > 0.05, `heading ${s.heading}`);
    assert.ok(s.vx > 0);
  });

  test("virar à esquerda andando: nariz e deslocamento para a esquerda", () => {
    const s = runAt(createState(), 30, -1, 1);
    assert.ok(s.heading < -0.05);
    assert.ok(s.vx < 0);
  });

  test("o deslocamento lateral vem do ângulo: vx = v·sin, vz = v·cos", () => {
    const s = runAt(createState(), 30, 1, 0.5);
    assert.ok(Math.abs(s.vx - s.speed * Math.sin(s.heading)) < 1e-9);
    assert.ok(Math.abs(s.vz - s.speed * Math.cos(s.heading)) < 1e-9);
  });

  test("devagar desloca bem menos que rápido", () => {
    const slow = lateralTravel(3, 1, 1);
    const fast = lateralTravel(30, 1, 1);
    assert.ok(slow > 0, "andando devagar ainda desloca um pouco");
    assert.ok(fast > slow * 4, `rápido ${fast.toFixed(2)} m vs devagar ${slow.toFixed(2)} m`);
  });

  test("gira aos poucos: nunca mais rápido que o entre-eixos permite", () => {
    for (const v of [2, 10, 30, CAR.maxSpeed]) {
      const s = createState();
      let prev = 0;
      runAt(s, v, 1, 1, 0, (st) => {
        assert.ok(st.heading - prev <= maxYawRate(v) * DT + 1e-9, `v=${v}: giro rápido demais`);
        prev = st.heading;
      });
    }
  });

  test("ângulo limitado e menor em alta velocidade", () => {
    const fast = runAt(createState(), CAR.maxSpeed, 1, 3);
    const slow = runAt(createState(), 8, 1, 3);
    assert.ok(Math.abs(fast.heading - CAR.headingMaxHigh) < 1e-3, `rápido: ${fast.heading}`);
    assert.ok(slow.heading <= headingMax(slow.speed) + 1e-9);
    assert.ok(slow.heading > fast.heading);
    // Na velocidade máxima a troca de faixa continua ágil (~9 m/s de lado)
    assert.ok(fast.vx > 8 && fast.vx < 10, `vx em velocidade máxima: ${fast.vx}`);
  });

  test("de ré, virar à direita leva o carro para a direita com o nariz para a esquerda", () => {
    const s = runAt(createState(), -CAR.maxReverseSpeed, 1, 1.5);
    assert.ok(s.vx > 0, `vx ${s.vx}`);
    assert.ok(s.heading < -0.02, `heading ${s.heading}`);
  });

  test("solta o volante: o carro endireita e segue reto", () => {
    const s = runAt(createState(), 30, 1, 1);
    runAt(s, 30, 0, 2);
    assert.ok(Math.abs(s.heading) < 1e-3, `heading ${s.heading}`);
    assert.ok(Math.abs(s.vx) < 0.05, `vx ${s.vx}`);
  });

  test("não empurra contra a parede direita nem aponta para ela", () => {
    const limit = lateralLimit();
    const s = runAt(createState(), 30, 1, 1, limit);
    assert.equal(s.vx, 0);
    assert.equal(s.heading, 0);
  });

  test("não empurra contra a parede esquerda", () => {
    const s = runAt(createState(), 30, -1, 1, -lateralLimit());
    assert.equal(s.vx, 0);
  });

  test("chegando inclinado na parede, o carro se alinha com ela", () => {
    const s = createState();
    s.heading = CAR.headingMaxHigh;
    runAt(s, 30, 1, 1, lateralLimit());
    assert.equal(s.vx, 0);
    assert.ok(Math.abs(s.heading) < 0.01, `heading ${s.heading}`);
  });

  test("encostado na parede ainda pode voltar para o centro", () => {
    const s = runAt(createState(), 30, -1, 1, lateralLimit());
    assert.ok(s.vx < 0);
  });
});

describe("pose visual (guinada, esterço, rolagem, mergulho)", () => {
  test("o corpo aponta para onde o carro vai (yaw = heading)", () => {
    const s = runAt(createState(), 30, 1, 0.4);
    assert.equal(s.yaw, s.heading);
  });

  test("rodas esterçam enquanto o carro gira e ficam retas na diagonal", () => {
    const s = createState();
    let maxSteer = 0;
    runAt(s, 30, 1, 0.3, 0, (st) => (maxSteer = Math.max(maxSteer, st.steerAngle)));
    assert.ok(maxSteer > 0.02, `esterço durante o giro: ${maxSteer}`);
    runAt(s, 30, 1, 2); // ângulo já no máximo, seguindo reto na diagonal
    assert.ok(Math.abs(s.steerAngle) < 0.01, `esterço na diagonal: ${s.steerAngle}`);
  });

  test("ao soltar o volante as rodas contra-esterçam para endireitar", () => {
    const s = runAt(createState(), 30, 1, 1.5);
    let minSteer = 0;
    runAt(s, 30, 0, 0.3, 0, (st) => (minSteer = Math.min(minSteer, st.steerAngle)));
    assert.ok(minSteer < -0.01, `contra-esterço: ${minSteer}`);
  });

  test("rolagem sutil para fora da curva enquanto gira, e some em linha reta", () => {
    const s = createState();
    let maxRoll = 0;
    runAt(s, 30, 1, 0.5, 0, (st) => (maxRoll = Math.max(maxRoll, st.roll)));
    // Curva à direita: lado direito sobe (roll positivo), no máximo rollAngle
    assert.ok(maxRoll > 0.005, `roll: ${maxRoll}`);
    assert.ok(maxRoll <= CAR.rollAngle + 1e-9);
    assert.ok(CAR.rollAngle < 0.06, "rolagem configurada é sutil");
    runAt(s, 30, 1, 2);
    assert.ok(Math.abs(s.roll) < 0.002, `roll na diagonal: ${s.roll}`);
  });

  test("solta o volante: guinada, esterço e rolagem voltam a zero", () => {
    const s = runAt(createState(), 30, 1, 1.5);
    runAt(s, 30, 0, 3);
    assert.ok(Math.abs(s.yaw) < 1e-3);
    assert.ok(Math.abs(s.steerAngle) < 1e-3);
    assert.ok(Math.abs(s.roll) < 1e-3);
  });

  test("acelerar levanta o nariz e frear mergulha", () => {
    const acc = run(createState(), { throttle: 1, steer: 0 }, 1);
    assert.ok(acc.pitch < 0, `acelerando: pitch ${acc.pitch}`);
    assert.ok(Math.abs(acc.pitch) <= CAR.pitchMax + 1e-9);

    const brk = createState();
    brk.speed = 40;
    run(brk, { throttle: -1, steer: 0 }, 0.5);
    assert.ok(brk.pitch > 0, `freando: pitch ${brk.pitch}`);
    assert.ok(brk.pitch <= CAR.pitchMax + 1e-9);
  });

  test("velocidade constante: sem mergulho", () => {
    const s = run(createState(), { throttle: 1, steer: 0 }, 30); // atinge o máximo
    run(s, { throttle: 1, steer: 0 }, 1);
    assert.ok(Math.abs(s.pitch) < 1e-6, `pitch em velocidade constante: ${s.pitch}`);
  });
});

describe("utilidades", () => {
  test("toKmh converte e arredonda", () => {
    assert.equal(toKmh(10), 36);
    assert.equal(toKmh(-10), 36);
    assert.equal(toKmh(0), 0);
  });
});

describe("rebote (applyBounce)", () => {
  test("batida frontal joga o carro para trás", () => {
    const s = createState();
    s.speed = 40;
    const applied = applyBounce(s, 40, 0);
    assert.equal(applied, true);
    assert.ok(s.speed < 0, `speed deveria ser negativa, foi ${s.speed}`);
    assert.ok(Math.abs(s.speed) < 40, "recuo é menor que a velocidade de impacto");
    assert.equal(s.stunTimer, BOUNCE.stunDuration);
    assert.equal(s.bounceCount, 1);
  });

  test("recuo é proporcional à velocidade de impacto", () => {
    const slow = createState();
    applyBounce(slow, 20, 0);
    const fast = createState();
    applyBounce(fast, 60, 0);
    assert.ok(Math.abs(fast.speed) > Math.abs(slow.speed));
    assert.equal(fast.speed, -60 * BOUNCE.speedFactor);
  });

  test("batida lenta ainda gera recuo mínimo", () => {
    const s = createState();
    applyBounce(s, BOUNCE.minImpactSpeed + 0.1, 0);
    assert.equal(s.speed, -BOUNCE.minSpeed);
  });

  test("encosto muito leve é ignorado", () => {
    const s = createState();
    s.speed = 0.5;
    const applied = applyBounce(s, 0.5, 0);
    assert.equal(applied, false);
    assert.equal(s.speed, 0.5);
    assert.equal(s.bounceCount, 0);
  });

  test("obstáculo à direita empurra para a esquerda e vice-versa", () => {
    const r = createState();
    applyBounce(r, 30, 1);
    assert.equal(r.vx, -BOUNCE.lateralPush);

    const l = createState();
    applyBounce(l, 30, -1);
    assert.equal(l.vx, BOUNCE.lateralPush);

    const c = createState();
    applyBounce(c, 30, 0);
    assert.equal(c.vx, 0);
  });

  test("o empurrão lateral é um deslize que perde força sozinho", () => {
    const s = createState();
    s.speed = 30;
    applyBounce(s, 30, 1);
    assert.equal(s.slideVx, -BOUNCE.lateralPush);
    run(s, { throttle: 0, steer: 0 }, 1);
    assert.equal(s.slideVx, 0);
  });

  test("batida de ré joga o carro para frente", () => {
    const s = createState();
    applyBounce(s, -6, 0);
    assert.ok(s.speed > 0);
  });

  test("durante o atordoamento o acelerador não responde", () => {
    const s = createState();
    applyBounce(s, 40, 0);
    const recoil = s.speed;
    // 0,1 s acelerando: a velocidade deve continuar negativa (só atrito atua)
    run(s, { throttle: 1, steer: 0 }, 0.1);
    assert.ok(s.speed < 0, `ainda em recuo: ${s.speed}`);
    assert.ok(s.speed > recoil, "atrito reduz o recuo");
    assert.ok(s.stunTimer > 0 && s.stunTimer < BOUNCE.stunDuration);
  });

  test("atordoamento expira e o carro volta a acelerar", () => {
    const s = createState();
    applyBounce(s, 40, 0);
    run(s, { throttle: 1, steer: 0 }, BOUNCE.stunDuration + 2);
    assert.equal(s.stunTimer, 0);
    assert.ok(s.speed > 0, `deveria estar indo para frente: ${s.speed}`);
  });
});

describe("batida entre carros (resolveCarCollision)", () => {
  test("carro de trás mais rápido: troca parte da velocidade e conserva o momento", () => {
    const rear = createState();
    const front = createState();
    rear.speed = 30;
    front.speed = 10;
    const r = resolveCarCollision(rear, front, 0);
    assert.equal(r.rammed, true);
    assert.equal(r.closing, 20);
    assert.ok(rear.speed < 30 && front.speed > 10);
    assert.ok(rear.speed < front.speed, "depois da batida eles se afastam");
    assert.ok(Math.abs(rear.speed + front.speed - 40) < 1e-9, "momento conservado (massas iguais)");
    assert.equal(rear.stunTimer, RAM.stun);
    assert.equal(front.stunTimer, RAM.stun);
  });

  test("jogador recuando contra a viatura parada", () => {
    const police = createState(); // atrás
    const player = createState(); // na frente, mas vindo de ré após bater num obstáculo
    player.speed = -13;
    const r = resolveCarCollision(police, player, 0);
    assert.equal(r.rammed, true);
    assert.ok(player.speed > police.speed, "separam");
    assert.ok(police.speed < 0, "a viatura é empurrada para trás");
  });

  test("encosto lento: só separa de lado, sem mudar a velocidade", () => {
    const rear = createState();
    const front = createState();
    rear.speed = 20.5;
    front.speed = 20;
    const r = resolveCarCollision(rear, front, 2);
    assert.equal(r.rammed, false);
    assert.equal(rear.speed, 20.5);
    assert.equal(front.speed, 20);
    assert.equal(rear.vx, -RAM.lateralPush);
    assert.equal(front.vx, RAM.lateralPush);
    assert.equal(rear.stunTimer, 0);
  });

  test("afastando: nada acontece na longitudinal", () => {
    const rear = createState();
    const front = createState();
    rear.speed = 10;
    front.speed = 30;
    assert.equal(resolveCarCollision(rear, front, 0).rammed, false);
    assert.equal(rear.speed, 10);
    assert.equal(front.speed, 30);
  });

  test("alinhados (dx ~ 0): sem empurrão lateral", () => {
    const rear = createState();
    const front = createState();
    rear.speed = 30;
    resolveCarCollision(rear, front, 0.1);
    assert.equal(rear.vx, 0);
    assert.equal(front.vx, 0);
  });
});
