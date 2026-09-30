// Modelo arcade do carro: módulo puro (sem BABYLON), testável em Node.
// O estado guarda velocidades; a posição real vem do corpo físico (Havok).
// Convenção: +Z é "para frente" na pista, X é lateral (direita positivo).

import { CAR, TRACK, BOUNCE, RAM } from "./config.js";

/**
 * @typedef {Object} CarState
 * @property {number} speed   velocidade do carro ao longo do próprio eixo (m/s); negativa = ré
 * @property {number} heading ângulo do carro em relação à pista (rad); positivo = nariz para a direita
 * @property {number} vx      velocidade lateral resultante (m/s) = speed·sin(heading) + slideVx
 * @property {number} vz      velocidade ao longo da pista (m/s) = speed·cos(heading)
 * @property {number} slideVx deslize lateral causado por batidas (m/s), some sozinho
 * @property {number} yaw     guinada visual do corpo (rad); igual a heading
 * @property {number} roll    rolagem visual do corpo em Z (rad); positivo = lado direito sobe
 * @property {number} pitch   mergulho visual em X (rad); positivo = nariz para baixo
 * @property {number} steerAngle esterço das rodas dianteiras em relação ao corpo (rad)
 * @property {number} stunTimer segundos restantes sem resposta do acelerador (pós-batida)
 * @property {number} bounceCount número de batidas (para HUD/estatística)
 */

/** @returns {CarState} */
export function createState() {
  return {
    speed: 0,
    heading: 0,
    vx: 0,
    vz: 0,
    slideVx: 0,
    yaw: 0,
    roll: 0,
    pitch: 0,
    steerAngle: 0,
    stunTimer: 0,
    bounceCount: 0,
  };
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function speedRatioOf(speed, car) {
  return Math.min(Math.abs(speed) / car.maxSpeed, 1);
}

/** Ângulo máximo do carro em relação à pista para a velocidade atual (rad). */
export function headingMax(speed, car = CAR) {
  const r = speedRatioOf(speed, car);
  return car.headingMaxLow + (car.headingMaxHigh - car.headingMaxLow) * r;
}

/** Esterço máximo das rodas para a velocidade atual (rad): menor em alta velocidade. */
export function steerLimit(speed, car = CAR) {
  return car.steerMax * (1 - (1 - car.steerHighSpeedFactor) * speedRatioOf(speed, car));
}

/**
 * Maior taxa de giro possível (rad/s) no modelo de bicicleta: ω = v / entre-eixos · tan(esterço).
 * Zero com o carro parado: sem andar, não gira.
 */
export function maxYawRate(speed, car = CAR) {
  return (Math.abs(speed) / car.wheelbase) * Math.tan(steerLimit(speed, car));
}

/** Maior velocidade lateral alcançável andando a `speed` (m/s). Zero parado. */
export function maxLateralSpeed(speed, car = CAR) {
  return Math.abs(speed) * Math.sin(headingMax(speed, car));
}

/** Recalcula as componentes de velocidade a partir de speed/heading/slideVx. */
function updateVelocity(state) {
  state.vx = state.speed * Math.sin(state.heading) + state.slideVx;
  state.vz = state.speed * Math.cos(state.heading);
}

/** Limite lateral do centro do carro para não atravessar as paredes. */
export function lateralLimit(cfg = { CAR, TRACK }) {
  return cfg.TRACK.width / 2 - cfg.CAR.width / 2 - 0.05;
}

function approach(value, target, maxDelta) {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return value;
}

/**
 * Avança o estado do carro em `dt` segundos.
 * @param {CarState} state
 * @param {{ throttle: number, steer: number }} input  throttle/steer em [-1, 1]
 * @param {number} dt
 * @param {number} currentX posição lateral atual do corpo físico
 * @param {{ CAR: typeof CAR, TRACK: typeof TRACK }} [cfg]
 * @returns {CarState} o mesmo objeto, mutado
 */
export function step(state, input, dt, currentX, cfg = { CAR, TRACK }) {
  const car = cfg.CAR;
  dt = Math.min(Math.max(dt, 0), 0.1); // evita saltos em quedas de FPS

  // --- Atordoamento pós-batida: acelerador não responde ---
  let throttle = input.throttle || 0;
  if (state.stunTimer > 0) {
    state.stunTimer = Math.max(0, state.stunTimer - dt);
    throttle = 0;
  }

  // --- Longitudinal ---
  const s = state.speed;
  if (throttle > 0) {
    if (s >= 0) {
      state.speed = approach(s, car.maxSpeed, car.acceleration * throttle * dt);
    } else {
      // Está de ré e quer ir para frente: freia até parar
      state.speed = approach(s, 0, car.brakeDecel * dt);
    }
  } else if (throttle < 0) {
    if (s > 0) {
      state.speed = approach(s, 0, car.brakeDecel * -throttle * dt);
    } else {
      state.speed = approach(s, -car.maxReverseSpeed, car.acceleration * 0.5 * -throttle * dt);
    }
  } else {
    // Sem input: atrito/arrasto leva a velocidade a zero
    state.speed = approach(s, 0, car.coastDecel * dt);
  }

  // --- Direção (modelo de bicicleta) ---
  // O volante pede um ângulo do carro em relação à pista; o carro só gira andando,
  // no máximo v / entre-eixos · tan(esterço) rad/s. O deslocamento lateral vem de
  // andar com o nariz apontado para o lado: vx = v · sin(ângulo). Parado, não sai do lugar.
  const steer = clamp(input.steer || 0, -1, 1);
  const v = state.speed;
  // De ré, virar à direita leva a traseira para a direita: o nariz aponta para a esquerda
  const dir = v < 0 ? -1 : 1;
  let targetHeading = steer * headingMax(v, car) * dir;

  // Encostado na parede: não aponta contra ela (o carro se alinha com a parede)
  const limit = lateralLimit(cfg);
  const intoRight = (h) => currentX >= limit && v * Math.sin(h) > 0;
  const intoLeft = (h) => currentX <= -limit && v * Math.sin(h) < 0;
  if (intoRight(targetHeading) || intoLeft(targetHeading)) targetHeading = 0;

  const prevHeading = state.heading;
  const yawCap = maxYawRate(v, car);
  const yawRate = clamp((targetHeading - prevHeading) * car.headingResponse, -yawCap, yawCap);
  state.heading = prevHeading + yawRate * dt;

  // Deslize lateral de batidas: independe do volante e perde força com o atrito
  state.slideVx = approach(state.slideVx, 0, car.slideDecel * dt);
  updateVelocity(state);
  if ((currentX >= limit && state.vx > 0) || (currentX <= -limit && state.vx < 0)) {
    state.vx = 0;
    state.slideVx = 0;
  }

  // --- Pose visual (não afeta a física) ---
  // O corpo aponta para onde o carro está indo
  state.yaw = state.heading;

  // Rodas: parado, seguem o volante; andando, mostram o esterço que produz o giro atual
  // (em linha reta, mesmo inclinado na pista, ficam retas, como num carro de verdade)
  const moving = Math.min(Math.abs(v) / 1, 1);
  const physicalSteer =
    Math.abs(v) > 0.1 ? clamp(Math.atan((yawRate * car.wheelbase) / v), -car.steerMax, car.steerMax) : 0;
  const targetSteer = (1 - moving) * steer * steerLimit(v, car) + moving * physicalSteer;
  state.steerAngle = approach(state.steerAngle, targetSteer, car.steerRate * dt);

  // Rolagem leve para FORA da curva, proporcional à aceleração lateral (v · ω)
  const lateralAccel = v * yawRate;
  const targetRoll = clamp(lateralAccel / car.rollAccelRef, -1, 1) * car.rollAngle;
  state.roll = approach(state.roll, targetRoll, car.rollAngle * 6 * dt);

  // Mergulho ao frear (nariz baixa) e agachamento ao acelerar (nariz sobe)
  const accel = dt > 0 ? (state.speed - s) / dt : 0;
  const targetPitch = clamp(-accel * car.pitchPerAccel, -car.pitchMax, car.pitchMax);
  state.pitch = approach(state.pitch, targetPitch, car.pitchMax * 8 * dt);

  return state;
}

/**
 * Aplica o efeito de rebote após colisão com obstáculo.
 * @param {CarState} state
 * @param {number} impactSpeed velocidade longitudinal no momento do impacto (m/s, > 0)
 * @param {number} hitDirX direção lateral do obstáculo em relação ao carro: -1 (esquerda), +1 (direita), 0 (frontal)
 * @param {typeof BOUNCE} [cfg]
 * @returns {boolean} true se o rebote foi aplicado (impacto relevante)
 */
export function applyBounce(state, impactSpeed, hitDirX = 0, cfg = BOUNCE) {
  if (Math.abs(impactSpeed) < cfg.minImpactSpeed) return false;

  const recoil = Math.max(Math.abs(impactSpeed) * cfg.speedFactor, cfg.minSpeed);
  // Recuo na direção oposta ao movimento
  state.speed = impactSpeed > 0 ? -recoil : recoil;
  // Empurrão lateral (deslize) para longe do obstáculo; 0 em batida frontal
  state.slideVx = hitDirX > 0 ? -cfg.lateralPush : hitDirX < 0 ? cfg.lateralPush : 0;
  state.stunTimer = cfg.stunDuration;
  state.bounceCount += 1;
  updateVelocity(state);
  return true;
}

/**
 * Batida entre dois carros de mesma massa (jogador x polícia).
 * Troca parte da velocidade longitudinal (colisão parcialmente elástica) e
 * empurra os dois para lados opostos, para que não fiquem grudados.
 *
 * @param {CarState} rear  carro de trás (menor Z)
 * @param {CarState} front carro da frente
 * @param {number} dx      front.x - rear.x no momento do contato
 * @param {typeof RAM} [cfg]
 * @returns {{ rammed: boolean, closing: number }} rammed=true se foi uma batida de verdade
 *          (aproximação acima de minClosingSpeed); caso contrário só houve separação lateral
 */
export function resolveCarCollision(rear, front, dx, cfg = RAM) {
  const closing = rear.speed - front.speed; // > 0: o de trás está alcançando o da frente

  // Separação lateral (deslize): cada um para o seu lado (encostos laterais também)
  const side = Math.abs(dx) < 0.3 ? 0 : Math.sign(dx);
  if (side !== 0) {
    rear.slideVx = -side * cfg.lateralPush;
    front.slideVx = side * cfg.lateralPush;
  }

  let rammed = false;
  if (closing >= cfg.minClosingSpeed) {
    // Massas iguais: velocidade média ± parte da velocidade relativa
    const mean = (rear.speed + front.speed) / 2;
    const half = (cfg.restitution * closing) / 2;
    rear.speed = mean - half;
    front.speed = mean + half;
    rear.stunTimer = Math.max(rear.stunTimer, cfg.stun);
    front.stunTimer = Math.max(front.stunTimer, cfg.stun);
    rammed = true;
  }
  updateVelocity(rear);
  updateVelocity(front);
  return { rammed, closing };
}

/** Converte m/s para km/h arredondado. */
export function toKmh(speedMs) {
  return Math.round(Math.abs(speedMs) * 3.6);
}
