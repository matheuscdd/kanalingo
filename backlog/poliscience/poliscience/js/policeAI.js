// IA da viatura (módulo puro, sem BABYLON, testável em Node).
// A cada frame decide acelerador/volante a partir das posições da polícia, do
// jogador e dos obstáculos, e atualiza o medidor de "pego".
//
// Modos:
//  - "idle"  : corrida não começou / acabou. Freia e fica parada.
//  - "chase" : segue o jogador na mesma faixa, a `followGap` metros atrás.
//  - "box"   : jogador lento por perto. Encosta ao lado dele para encurralar
//              (sem bater na traseira) e o medidor de "pego" enche.

import { CAR, TRACK, POLICE } from "./config.js";
import { lateralLimit, headingMax, steerLimit, maxLateralSpeed } from "./carPhysics.js";

/** Parâmetros do carro da polícia (CAR com as diferenças de POLICE.car). */
export const POLICE_CAR = { ...CAR, ...POLICE.car };

const DEFAULT_CFG = { POLICE, CAR: POLICE_CAR, TRACK };
const ROW_TOLERANCE = 8; // m: obstáculos a menos disso em Z formam a mesma fileira

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/** Estado interno da IA. */
export function createBrain() {
  return { mode: "idle", side: 1, targetX: 0, brake: false, bust: 0 };
}

/**
 * Próximas fileiras de obstáculos que ainda não ficaram para trás, dentro da
 * distância de antecipação (que cresce com a velocidade), da mais perto para a mais longe.
 * @returns {import("./obstacleLayout.js").ObstacleSpec[][]}
 */
export function upcomingRows(obstacles, z, speed, cfg = DEFAULT_CFG, maxRows = 2) {
  const halfLen = cfg.CAR.length / 2;
  const lookahead = Math.max(cfg.POLICE.lookaheadMin, Math.max(0, speed) * cfg.POLICE.lookaheadTime);
  const minZ = z - halfLen; // obstáculo ao lado do carro ainda conta
  const maxZ = z + halfLen + lookahead;

  const ahead = obstacles
    .filter((o) => o.z + o.d / 2 >= minZ && o.z - o.d / 2 <= maxZ)
    .sort((a, b) => a.z - b.z);

  const rows = [];
  for (const o of ahead) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(o.z - last[0].z) <= ROW_TOLERANCE) last.push(o);
    else if (rows.length < maxRows) rows.push([o]);
    else break;
  }
  return rows;
}

/** Próxima fileira (ou null). */
export function nextObstacleRow(obstacles, z, speed, cfg = DEFAULT_CFG) {
  return upcomingRows(obstacles, z, speed, cfg, 1)[0] ?? null;
}

/**
 * Faixas de X (posição do centro do carro) bloqueadas por uma fileira, já unidas.
 * @returns {[number, number][]}
 */
export function blockedIntervals(row, carWidth, margin) {
  const intervals = row
    .map((o) => [o.x - o.w / 2 - carWidth / 2 - margin, o.x + o.w / 2 + carWidth / 2 + margin])
    .sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [l, r] of intervals) {
    const last = merged[merged.length - 1];
    if (last && l <= last[1]) last[1] = Math.max(last[1], r);
    else merged.push([l, r]);
  }
  return merged;
}

/**
 * Trechos livres de X (complemento dos bloqueados dentro de [-limit, limit]).
 * @returns {[number, number][]}
 */
export function freeGaps(blocked, limit) {
  const gaps = [];
  let cursor = -limit;
  for (const [l, r] of blocked) {
    if (l > cursor) gaps.push([cursor, Math.min(l, limit)]);
    cursor = Math.max(cursor, r);
    if (cursor >= limit) break;
  }
  if (cursor < limit) gaps.push([cursor, limit]);
  return gaps.filter(([a, b]) => b > a);
}

/**
 * Melhor X livre numa fileira: o próprio desejado se estiver livre; senão o ponto
 * de algum vão mais perto dele, recuado `inset` para dentro do vão (não na borda).
 * `stick` pesa o quanto o carro teria de se mexer a partir de `px` (evita trocar
 * de lado em cima da hora).
 */
function chooseInRow(gaps, desiredX, px, inset, stick) {
  let best = null;
  let bestCost = Infinity;
  for (const [a, b] of gaps) {
    const pad = Math.min(inset, (b - a) / 2);
    const c = clamp(desiredX, a + pad, b - pad);
    const cost = Math.abs(c - desiredX) + stick * Math.abs(c - px);
    if (cost < bestCost) {
      best = c;
      bestCost = cost;
    }
  }
  return best;
}

/**
 * Escolhe um X livre perto do desejado e calcula a velocidade máxima que ainda
 * permite sair da frente do próximo obstáculo a tempo.
 *
 * Planeja de trás para frente pelas duas próximas fileiras: o alvo da fileira
 * mais distante vira o "desejado" da mais próxima, para já se posicionar para a seguinte.
 * @returns {{ targetX: number, brake: boolean, speedCap: number }}
 *          brake=true quando a velocidade atual passa do limite
 */
export function planAvoidance(px, pz, speed, desiredX, obstacles, cfg = DEFAULT_CFG, heading = 0) {
  const { POLICE: P, CAR: C, TRACK: T } = cfg;
  const limit = lateralLimit({ CAR: C, TRACK: T });
  let targetX = clamp(desiredX, -limit, limit);

  const rows = upcomingRows(obstacles, pz, speed, cfg, 2);
  if (rows.length === 0) return { targetX, brake: false, speedCap: Infinity };

  const halfLen = C.length / 2;
  const plans = rows.map((row) => {
    const blocked = blockedIntervals(row, C.width, P.obstacleMargin);
    return {
      row,
      blocked,
      gaps: freeGaps(blocked, limit),
      nearZ: Math.min(...row.map((o) => o.z - o.d / 2)),
      farZ: Math.max(...row.map((o) => o.z + o.d / 2)),
      target: null,
    };
  });

  // Da fileira mais distante para a mais próxima
  for (let i = plans.length - 1; i >= 0; i--) {
    const stick = i === 0 ? P.avoidStick : 0;
    const choice = chooseInRow(plans[i].gaps, targetX, px, P.avoidInset, stick);
    if (choice !== null) targetX = choice;
    plans[i].target = targetX;
  }

  const near = plans[0];
  const blockIn = (plan, x) => plan.blocked.find(([l, r]) => x > l && x < r);

  // Já ao lado da fileira: não atravessa obstáculos de lado, fica no vão atual
  const alongside = pz + halfLen > near.nearZ && pz - halfLen < near.farZ;
  if (alongside) {
    const gap = near.gaps.find(([a, b]) => px >= a && px <= b);
    if (gap) targetX = clamp(targetX, gap[0], gap[1]);
  }

  // --- Limite de velocidade para dar tempo de desviar ---
  // Maior velocidade que permite deslocar `need` metros de lado em `window` metros
  // à frente (ver lateralReach). -1 = impossível mesmo devagar: precisa dar ré.
  // `h0`: ângulo que o carro já tem na direção do desvio (economiza parte do giro).
  const shiftSpeed = (window, need, h0 = 0) => {
    const reach = (v) => lateralReach(window, v, C, P, h0);
    if (!(need > 0)) return Infinity;
    if (need === Infinity || reach(0) < need) return -1;
    if (reach(C.maxSpeed) >= need) return Infinity;
    let lo = 0;
    let hi = C.maxSpeed;
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (reach(mid) >= need) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  // Até onde a velocidade pode ficar agora para ainda chegar a `cap` em `dist` metros
  const withBraking = (cap, dist) => Math.sqrt(cap * cap + 2 * P.planDecel * Math.max(0, dist));
  // Distância lateral para sair do trecho bloqueado de `plan` que contém x, rumo a `toX`
  const exitDistance = (plan, x, toX) => {
    const b = blockIn(plan, x);
    if (!b) return 0;
    if (blockIn(plan, toX)) return Infinity;
    return toX > x ? b[1] - x : x - b[0];
  };

  let speedCap = Infinity;

  // 1) Está na frente de um obstáculo da próxima fileira. Se nem devagar dá para
  //    sair da frente (perto demais), dá ré para ganhar espaço: parado o carro não
  //    se desloca de lado.
  const need1 = exitDistance(near, px, targetX);
  if (need1 > 0) {
    const exitDir = targetX > px ? 1 : -1;
    // Ângulo atual "a favor" do desvio (considera a ré, em que o nariz aponta ao contrário)
    const h0 = Math.abs(heading) * (Math.sign(speed * Math.sin(heading)) === exitDir ? 1 : -1);
    const cap1 = shiftSpeed(Math.max(0, near.nearZ - (pz + halfLen)), need1, h0);
    speedCap = cap1 < 0 ? -P.backupSpeed : cap1;
  }

  // 2) Chicane: o vão desta fileira não serve para a seguinte. O desvio só começa
  //    depois de passar esta fileira, então a velocidade precisa já estar baixa ali.
  if (plans.length > 1) {
    const next = plans[1];
    const need2 = exitDistance(next, near.target, next.target);
    if (need2 > 0) {
      const window = next.nearZ - near.farZ - C.length;
      const cap2 = shiftSpeed(window, need2);
      // Apertada demais até devagar: segue em marcha lenta e resolve na próxima fileira
      speedCap = Math.min(speedCap, withBraking(cap2 < 0 ? P.crawlSpeed : cap2, near.farZ + halfLen - pz));
    }
  }

  return { targetX, brake: speedCap < speed, speedCap };
}

/**
 * Deslocamento lateral que o carro consegue fazer percorrendo `window` metros à
 * frente a velocidade `v` (modelo de carPhysics.step): primeiro reage e gira até
 * o ângulo máximo, depois anda inclinado a sin(ângulo) metros de lado por metro.
 * Em baixa velocidade o ângulo permitido é maior, então desloca mais por metro.
 */
export function lateralReach(window, v, C = POLICE_CAR, P = POLICE, h0 = 0) {
  const av = Math.abs(v);
  const h = headingMax(av, C);
  // h0: ângulo atual na direção do desvio (negativo = inclinado para o lado errado)
  const turn = h - clamp(h0, -h, h);
  const turnDistance = (turn * C.wheelbase) / Math.tan(steerLimit(av, C)) + (av / C.headingResponse) * (turn / h);
  const straight = window - av * P.reactionTime - turnDistance;
  return Math.max(0, straight) * Math.sin(h);
}

/**
 * Volante para levar o carro ao X alvo: pede uma velocidade lateral proporcional ao
 * erro, converte no ângulo que a produz (vx = v·sin) e no comando correspondente.
 * Parado, o carro não se desloca de lado: só vira as rodas na direção do alvo.
 */
export function steerToward(err, speed, C = POLICE_CAR, P = POLICE) {
  if (Math.abs(speed) < 0.5) return Math.abs(err) < P.steerDeadband ? 0 : Math.sign(err);
  const vxMax = maxLateralSpeed(speed, C);
  const vxWanted = clamp(err * P.steerGain, -vxMax, vxMax);
  const hWanted = Math.asin(clamp(vxWanted / speed, -1, 1));
  // De ré o comando é invertido (ver carPhysics.step)
  const dir = speed < 0 ? -1 : 1;
  return clamp((hWanted * dir) / headingMax(speed, C), -1, 1);
}

/**
 * Velocidade relativa desejada para fechar (ou abrir) a distância até `desiredGap`.
 * Proporcional ao erro: a aproximação desacelera sozinha ao chegar perto
 * (no máximo gapGain × maxClosing m/s²), sem passar do ponto.
 */
export function closingSpeed(gap, desiredGap, P = POLICE) {
  return clamp((gap - desiredGap) * P.gapGain, -P.maxClosing, P.maxClosing);
}

/**
 * Decide os comandos da viatura para este frame.
 * @param {ReturnType<typeof createBrain>} brain  mutado (modo, alvo, lado)
 * @param {{ x: number, z: number, speed: number, heading?: number }} police
 * @param {{ x: number, z: number, speed: number }} player
 * @param {import("./obstacleLayout.js").ObstacleSpec[]} obstacles
 * @param {boolean} active  a perseguição está valendo?
 * @returns {{ throttle: number, steer: number }}
 */
export function policeDrive(brain, police, player, obstacles, active, cfg = DEFAULT_CFG) {
  const { POLICE: P, CAR: C, TRACK: T } = cfg;

  if (!active) {
    brain.mode = "idle";
    brain.brake = false;
    const throttle = Math.abs(police.speed) > 0.3 ? -Math.sign(police.speed) : 0;
    return { throttle, steer: 0 };
  }

  const limit = lateralLimit({ CAR: C, TRACK: T });
  const playerAbs = Math.abs(player.speed);
  const dx = player.x - police.x;
  const gap = player.z - police.z;
  const dist = Math.hypot(dx, gap);

  // Modo, com histerese para não alternar a cada frame
  const wasBox = brain.mode === "box";
  const box = wasBox
    ? playerAbs <= P.bustSpeed + P.boxExitMargin
    : playerAbs < P.bustSpeed && dist < P.boxEngageDistance;
  if (box && !wasBox) brain.side = player.x > 0 ? -1 : 1; // encosta pelo lado com mais espaço
  brain.mode = box ? "box" : "chase";

  let desiredX;
  let desiredGap;
  if (box) {
    desiredX = clamp(player.x + brain.side * P.sideOffset, -limit, limit);
    // Enquanto ainda está alinhado atrás, fica longe o bastante para conseguir abrir
    // para o lado andando para frente (o carro não se desloca de lado parado).
    // Se estiver mais perto que isso, dá ré para ganhar espaço.
    const aligned = Math.abs(dx) < C.width + P.sideClearance;
    const openDistance = Math.abs(desiredX - police.x) / Math.sin(C.headingMaxLow);
    desiredGap = aligned ? Math.max(P.tailGap, C.length + P.boxMargin + openDistance) : P.boxGap;
  } else {
    desiredX = player.x;
    desiredGap = P.followGap;
  }

  const plan = planAvoidance(police.x, police.z, police.speed, desiredX, obstacles, cfg, police.heading ?? 0);
  brain.targetX = plan.targetX;
  brain.brake = plan.brake;

  // Velocidade: segue o jogador, limitada pelo que o desvio de obstáculos permite.
  // "Catch-up": longe dá para ir até maxSpeed; perto, fica no ritmo de cruzeiro.
  const ramp = clamp((gap - P.followGap) / (P.catchUpGap - P.followGap), 0, 1);
  const speedLimit = P.cruiseSpeed + (C.maxSpeed - P.cruiseSpeed) * ramp;
  const desiredSpeed = clamp(
    Math.min(player.speed + closingSpeed(gap, desiredGap, P), plan.speedCap, speedLimit),
    -C.maxReverseSpeed,
    C.maxSpeed
  );
  const throttle = clamp((desiredSpeed - police.speed) * P.throttleGain, -1, 1);

  const steer = steerToward(plan.targetX - police.x, police.speed, C, P);

  return { throttle, steer };
}

/**
 * Medidor de "pego" (0..1): enche enquanto a polícia está perto e o jogador lento,
 * esvazia caso contrário.
 * @param {number} meter
 * @param {{ distance: number, playerSpeed: number, dt: number }} f
 */
export function updateBust(meter, f, P = POLICE) {
  if (!P.canBust) return 0;
  const dt = Math.max(0, f.dt);
  const caught = f.distance < P.bustRadius && Math.abs(f.playerSpeed) < P.bustSpeed;
  const next = caught ? meter + dt / P.bustTime : meter - dt / P.bustRecoverTime;
  return clamp(next, 0, 1);
}
