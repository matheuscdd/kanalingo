// Carro: corpo físico Havok controlado de forma arcade (velocidade definida a cada frame).
// A malha visual (placeholder ou .glb) é filha do root físico.

import { CAR, TRACK } from "./config.js";
import { createState, step, applyBounce } from "./carPhysics.js";

/**
 * @param {BABYLON.Scene} scene
 * @param {{ throttle: number, steer: number }} input  lido a cada frame (teclado ou IA)
 * @param {Object} [opts]
 * @param {string} [opts.name] prefixo dos nós (padrão "car")
 * @param {{ x: number, y: number, z: number }} [opts.start] posição inicial/reset
 * @param {typeof CAR} [opts.carCfg] parâmetros do modelo arcade (padrão CAR)
 * @param {{ r: number, g: number, b: number }} [opts.placeholderColor]
 * @param {Object} [opts.metadata] metadados extras no root físico
 */
export function createCar(scene, input, opts = {}) {
  const carCfg = opts.carCfg ?? CAR;
  const name = opts.name ?? "car";
  const physicsCfg = { CAR: carCfg, TRACK };
  const state = createState();
  const start = opts.start ?? CAR.startPosition;
  let controlsEnabled = true;

  // --- Root físico: caixa invisível com as dimensões do carro ---
  const root = BABYLON.MeshBuilder.CreateBox(
    `${name}Root`,
    { width: carCfg.width, height: carCfg.height, depth: carCfg.length },
    scene
  );
  root.position.set(start.x, start.y, start.z);
  root.isVisible = false;
  root.metadata = { isCar: true, carName: name, ...opts.metadata };

  const aggregate = new BABYLON.PhysicsAggregate(
    root,
    BABYLON.PhysicsShapeType.BOX,
    { mass: carCfg.mass, restitution: 0.1, friction: 0.5 },
    scene
  );
  const body = aggregate.body;
  // Trava rotação: o carro nunca capota nem gira ao bater.
  // (mass precisa ser repassada: userMassProps é substituído por inteiro)
  body.setMassProperties({
    mass: carCfg.mass,
    inertia: new BABYLON.Vector3(0, 0, 0),
  });
  body.setAngularDamping(1);
  body.setLinearDamping(0);
  body.setCollisionCallbackEnabled(true);

  // --- Visual placeholder (substituído pelo .glb quando carregado) ---
  const visual = new BABYLON.TransformNode(`${name}Visual`, scene);
  visual.parent = root;
  const placeholder = createPlaceholderMesh(scene, carCfg, name, opts.placeholderColor);
  placeholder.parent = visual;

  // Callbacks de colisão externos (obstáculos)
  const hitListeners = [];

  // Rodas do modelo carregado (giram com a velocidade)
  let wheels = [];

  // --- Atualização por frame: antes do passo de física ---
  const tmpVel = new BABYLON.Vector3();
  scene.onBeforePhysicsObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
    // Controles desligados (ex.: pego pela polícia): freia até parar
    const cmd = controlsEnabled
      ? { throttle: input.throttle, steer: input.steer }
      : { throttle: Math.abs(state.speed) > 0.3 ? -Math.sign(state.speed) : 0, steer: 0 };
    step(state, cmd, dt, root.position.x, physicsCfg);

    // Rodas: giram proporcionalmente à distância percorrida; as dianteiras esterçam
    for (const w of wheels) {
      w.mesh.rotation.x = (w.mesh.rotation.x + (w.rollSign * state.speed * dt) / w.radius) % (Math.PI * 2);
      if (w.steerable) w.mesh.rotation.y = w.baseY + w.yawSign * state.steerAngle;
    }

    // Mantém o Y da física (gravidade) e impõe X/Z do modelo arcade
    // (o carro anda na direção do nariz: vz = v·cos, vx = v·sin + deslize)
    body.getLinearVelocityToRef(tmpVel);
    tmpVel.x = state.vx;
    tmpVel.z = state.vz;
    body.setLinearVelocity(tmpVel);

    // Defesa extra além da inércia zero
    body.setAngularVelocity(BABYLON.Vector3.Zero());

    // Pose visual do corpo: mergulho (X), guinada (Y) e rolagem sutil (Z).
    // O corpo físico continua alinhado com a pista; só a malha gira.
    visual.rotation.set(state.pitch, state.yaw, state.roll);
  });

  // --- Colisões ---
  body.getCollisionObservable().add((ev) => {
    if (ev.type !== BABYLON.PhysicsEventType.COLLISION_STARTED) return;
    const other = ev.collidedAgainst?.transformNode;
    if (!other || !other.metadata?.isObstacle) return;

    // Havok pode reportar vários eventos para o mesmo contato; enquanto o carro
    // está atordoado (acabou de rebater) ignoramos novos impactos para não
    // inverter a velocidade de novo e deixar o carro "grudado" no obstáculo.
    if (state.stunTimer > 0) return;

    // Direção lateral do obstáculo em relação ao carro
    const dx = other.getAbsolutePosition().x - root.position.x;
    const hitDirX = Math.abs(dx) < 0.6 ? 0 : Math.sign(dx);
    const impactSpeed = state.speed;

    if (applyBounce(state, impactSpeed, hitDirX)) {
      hitListeners.forEach((fn) => fn({ impactSpeed, hitDirX, obstacle: other }));
    }
  });

  /** Move o carro para (x, z) parado, zerando o estado arcade. */
  function teleport(x, z) {
    Object.assign(state, createState());
    body.disablePreStep = false;
    root.position.set(x, start.y, z);
    root.rotationQuaternion = BABYLON.Quaternion.Identity();
    body.setLinearVelocity(BABYLON.Vector3.Zero());
    body.setAngularVelocity(BABYLON.Vector3.Zero());
    // Volta ao padrão no próximo frame para a física não copiar a pose toda vez
    scene.onAfterPhysicsObservable.addOnce(() => {
      body.disablePreStep = true;
    });
  }

  function reset() {
    teleport(start.x, start.z);
  }

  // Havok só lê a transformação do mesh quando disablePreStep=false;
  // deixamos true (padrão) e só habilitamos no reset.
  body.disablePreStep = true;

  return {
    name,
    root,
    visual,
    body,
    state,
    reset,
    teleport,
    /** Liga/desliga a resposta aos comandos (desligado: freia até parar). */
    setControlsEnabled(enabled) {
      controlsEnabled = enabled;
    },
    get controlsEnabled() {
      return controlsEnabled;
    },
    /** Substitui o placeholder pela malha carregada (com rodas opcionais para girar). */
    setVisualMesh(mesh) {
      placeholder.dispose();
      mesh.parent = visual;
      wheels = mesh.wheels ?? [];
    },
    /** Registra callback chamado quando o carro bate num obstáculo. */
    onHit(fn) {
      hitListeners.push(fn);
    },
    get speed() {
      return state.speed;
    },
    get position() {
      return root.position;
    },
  };
}

function createPlaceholderMesh(scene, carCfg, name, color = { r: 0.85, g: 0.1, b: 0.1 }) {
  const group = new BABYLON.TransformNode(`${name}Placeholder`, scene);

  const bodyMat = new BABYLON.StandardMaterial(`${name}BodyMat`, scene);
  bodyMat.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b);
  bodyMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);

  const chassis = BABYLON.MeshBuilder.CreateBox(
    `${name}Chassis`,
    { width: carCfg.width * 0.95, height: carCfg.height * 0.45, depth: carCfg.length },
    scene
  );
  chassis.position.y = -carCfg.height * 0.15;
  chassis.material = bodyMat;
  chassis.parent = group;

  const cabin = BABYLON.MeshBuilder.CreateBox(
    `${name}Cabin`,
    { width: carCfg.width * 0.75, height: carCfg.height * 0.45, depth: carCfg.length * 0.45 },
    scene
  );
  cabin.position.set(0, carCfg.height * 0.3, -carCfg.length * 0.05);
  const cabinMat = new BABYLON.StandardMaterial(`${name}CabinMat`, scene);
  cabinMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.15);
  cabin.material = cabinMat;
  cabin.parent = group;

  const wheelMat = new BABYLON.StandardMaterial(`${name}WheelMat`, scene);
  wheelMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  const wheelR = carCfg.height * 0.28;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const wheel = BABYLON.MeshBuilder.CreateCylinder(
      `${name}Wheel`,
      { height: 0.3, diameter: wheelR * 2 },
      scene
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx * carCfg.width * 0.5, -carCfg.height * 0.5 + wheelR, sz * carCfg.length * 0.32);
    wheel.material = wheelMat;
    wheel.parent = group;
  }

  return group;
}
