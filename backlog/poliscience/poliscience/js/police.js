// Viatura de polícia: carro Havok controlado pela IA de policeAI.js, com giroflex
// (materiais emissivos + luz pontual alternando azul/vermelho) e batida carro-carro.

import { POLICE, RAM } from "./config.js";
import { createCar } from "./car.js";
import { loadCarModel } from "./carModel.js";
import { resolveCarCollision } from "./carPhysics.js";
import { POLICE_CAR, createBrain, policeDrive, updateBust } from "./policeAI.js";

/**
 * @param {BABYLON.Scene} scene
 * @param {{ player: ReturnType<import("./car.js").createCar>, obstacles: import("./obstacleLayout.js").ObstacleSpec[] }} deps
 */
export async function createPolice(scene, { player, obstacles }) {
  const BLUE = new BABYLON.Color3(0.15, 0.35, 1);
  const RED = new BABYLON.Color3(1, 0.08, 0.05);
  const OFF = BABYLON.Color3.Black();

  const aiInput = { throttle: 0, steer: 0 };
  const sortedObstacles = [...obstacles].sort((a, b) => a.z - b.z);
  let brain = createBrain();
  let active = false;
  let ramCooldown = 0;
  let rams = 0;
  const ramListeners = [];

  const distance = () =>
    Math.hypot(player.position.x - car.position.x, player.position.z - car.position.z);

  // IA: registrada ANTES do carro para que o comando valha já no passo deste frame
  // (observers do Babylon rodam na ordem de inserção).
  let car = null;
  scene.onBeforePhysicsObservable.add(() => {
    if (!car) return;
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
    ramCooldown = Math.max(0, ramCooldown - dt);

    const cmd = policeDrive(
      brain,
      { x: car.position.x, z: car.position.z, speed: car.state.speed, heading: car.state.heading },
      { x: player.position.x, z: player.position.z, speed: player.state.speed },
      sortedObstacles,
      active
    );
    aiInput.throttle = cmd.throttle;
    aiInput.steer = cmd.steer;

    if (active) {
      brain.bust = updateBust(brain.bust, { distance: distance(), playerSpeed: player.state.speed, dt });
    }
  });

  car = createCar(scene, aiInput, {
    name: "police",
    start: POLICE.startPosition,
    carCfg: POLICE_CAR,
    placeholderColor: { r: 0.08, g: 0.08, b: 0.1 },
    metadata: { isPolice: true },
  });

  // --- Modelo e giroflex ---
  let modelInfo = { loaded: false };
  let sirenLamps = [];
  try {
    const model = await loadCarModel(scene, {
      file: POLICE.model.file,
      flipFront: POLICE.model.flipFront,
      bodyMaterial: POLICE.model.bodyMaterial,
      name: "policeModel",
    });
    car.setVisualMesh(model);
    modelInfo = { loaded: true, ...model.metadata };

    // No modelo do Quaternius o giroflex usa "BlueLights" e o vermelho de "TailLights"
    // (compartilhado com as lanternas, que piscam junto)
    const byName = (n) => model.materials.find((m) => m.name === n);
    const blue = byName("BlueLights");
    const red = byName("TailLights");
    if (blue) sirenLamps.push({ mat: blue, color: BLUE, phase: 0 });
    if (red) sirenLamps.push({ mat: red, color: RED, phase: 1 });
  } catch (err) {
    console.warn("Modelo da viatura não carregou, usando placeholder:", err.message);
    modelInfo = { loaded: false, error: err.message };
  }
  if (sirenLamps.length === 0) sirenLamps = createLightBar(scene, car.visual, BLUE, RED);

  // Luz pontual no teto: pinta o asfalto e os carros próximos de azul/vermelho
  const sirenLight = new BABYLON.PointLight("sirenLight", new BABYLON.Vector3(0, 1.2, 0), scene);
  sirenLight.parent = car.root;
  sirenLight.range = 16;
  sirenLight.intensity = 1.4;

  let sirenTime = 0;
  let sirenPhase = -1;
  scene.onBeforeRenderObservable.add(() => {
    sirenTime += scene.getEngine().getDeltaTime() / 1000;
    const phase = Math.floor(sirenTime / POLICE.sirenInterval) % 2;
    if (phase === sirenPhase) return; // só mexe nos materiais na troca
    sirenPhase = phase;
    for (const lamp of sirenLamps) lamp.mat.emissiveColor = lamp.phase === phase ? lamp.color : OFF;
    const c = phase === 0 ? BLUE : RED;
    sirenLight.diffuse = c;
    sirenLight.specular = c;
  });

  // --- Batida carro-carro ---
  // Havok pode reportar o contato em qualquer um dos dois corpos; o cooldown evita
  // resolver a mesma batida duas vezes.
  function onContact(ev, other) {
    if (ev.type !== BABYLON.PhysicsEventType.COLLISION_STARTED) return;
    if (ev.collidedAgainst?.transformNode !== other.root) return;
    if (ramCooldown > 0) return;
    ramCooldown = RAM.cooldown;

    const policeBehind = car.position.z <= player.position.z;
    const rear = policeBehind ? car : player;
    const front = policeBehind ? player : car;
    const result = resolveCarCollision(rear.state, front.state, front.position.x - rear.position.x);
    if (result.rammed) rams++;
    ramListeners.forEach((fn) => fn({ ...result, policeBehind }));
  }
  car.body.getCollisionObservable().add((ev) => onContact(ev, player));
  player.body.getCollisionObservable().add((ev) => onContact(ev, car));

  return {
    car,
    get brain() {
      return brain;
    },
    /** A perseguição vale? (corrida em andamento e passado o atraso inicial) */
    setActive(value) {
      active = value;
    },
    get active() {
      return active;
    },
    /** Medidor de "pego" 0..1 */
    get bust() {
      return brain.bust;
    },
    get mode() {
      return brain.mode;
    },
    get distance() {
      return distance();
    },
    get rams() {
      return rams;
    },
    get sirenPhase() {
      return sirenPhase;
    },
    modelInfo,
    /** Registra callback de batida com o jogador: ({ rammed, closing, policeBehind }) */
    onRam(fn) {
      ramListeners.push(fn);
    },
    reset() {
      brain = createBrain();
      active = false;
      ramCooldown = 0;
      rams = 0;
      aiInput.throttle = 0;
      aiInput.steer = 0;
      car.reset();
    },
  };
}

/** Giroflex simples para o placeholder (se o .glb não carregar). */
function createLightBar(scene, parent, blue, red) {
  const lamps = [];
  for (const [side, color, phase] of [[-1, blue, 0], [1, red, 1]]) {
    const mat = new BABYLON.StandardMaterial(`sirenLamp_${phase}`, scene);
    mat.diffuseColor = color.scale(0.4);
    const lamp = BABYLON.MeshBuilder.CreateBox(`sirenLamp_${phase}`, { width: 0.45, height: 0.15, depth: 0.3 }, scene);
    lamp.position.set(side * 0.28, POLICE_CAR.height * 0.6, -0.2);
    lamp.material = mat;
    lamp.parent = parent;
    lamps.push({ mat, color, phase });
  }
  return lamps;
}
