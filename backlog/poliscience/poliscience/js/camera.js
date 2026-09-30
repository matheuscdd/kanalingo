// Câmera de perseguição (chase cam) estilo Need for Speed:
// fica atrás e acima do carro, suaviza o movimento e abre o FOV com a velocidade.

import { CAMERA, CAR, MIRROR } from "./config.js";

/**
 * @param {BABYLON.Scene} scene
 * @param {ReturnType<import("./car.js").createCar>} car
 */
export function createChaseCamera(scene, car) {
  const camera = new BABYLON.UniversalCamera(
    "chaseCam",
    new BABYLON.Vector3(0, CAMERA.height, -CAMERA.distance),
    scene
  );
  camera.fov = CAMERA.fovMin;
  // Plano próximo afastado para ganhar precisão de profundidade (a câmera fica ~9 m atrás
  // do carro); o distante cobre bem além do fog (400 m).
  camera.minZ = 1;
  camera.maxZ = 800;
  // Sem controle por mouse/teclado: a câmera é totalmente programática
  camera.inputs.clear();

  const desiredPos = new BABYLON.Vector3();
  const target = new BABYLON.Vector3();
  const shake = { time: 0, strength: 0 };

  function snapToCar() {
    const p = car.position;
    camera.position.set(p.x * 0.6, p.y + CAMERA.height, p.z - CAMERA.distance);
    target.set(p.x, p.y + 0.6, p.z + CAMERA.lookAhead);
    camera.setTarget(target);
  }
  snapToCar();

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
    const p = car.position;
    const speedRatio = Math.min(Math.abs(car.speed) / CAR.maxSpeed, 1);

    // Recua um pouco mais em alta velocidade
    const dist = CAMERA.distance + speedRatio * 1.5;
    const height = CAMERA.height + speedRatio * 0.6;

    // A câmera acompanha o X do carro parcialmente para dar noção de deslocamento lateral
    desiredPos.set(p.x * 0.6, p.y + height, p.z - dist);

    // Suavização independente do frame rate: lerp exponencial
    const t = 1 - Math.pow(1 - CAMERA.lerp, dt * 60);
    BABYLON.Vector3.LerpToRef(camera.position, desiredPos, t, camera.position);

    // Sacudida após batida
    if (shake.time > 0) {
      shake.time -= dt;
      const s = shake.strength * (shake.time / 0.35);
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s * 0.6;
    }

    target.set(p.x, p.y + 0.6, p.z + CAMERA.lookAhead);
    camera.setTarget(target);

    // FOV aumenta com a velocidade (sensação de rapidez)
    const desiredFov = CAMERA.fovMin + (CAMERA.fovMax - CAMERA.fovMin) * speedRatio;
    camera.fov += (desiredFov - camera.fov) * Math.min(1, dt * 4);
  });

  return {
    camera,
    /** Reposiciona imediatamente (usado no reset). */
    snapToCar,
    /** Dispara uma sacudida curta na câmera (0..1). */
    shake(strength = 0.5) {
      shake.time = 0.35;
      shake.strength = strength;
    },
  };
}

/**
 * Retrovisor: câmera olhando para trás, desenhada numa faixa no topo da tela e
 * espelhada na horizontal (o que está à esquerda do carro aparece à esquerda,
 * como num espelho de verdade).
 *
 * O espelhamento inverte X na projeção. Isso também inverte o sentido dos
 * triângulos na tela, então durante esta câmera marcamos a cena como "espelhada"
 * (`_mirroredCameraPosition`), que é o mesmo mecanismo que o MirrorTexture do
 * Babylon usa para inverter o culling.
 *
 * @param {BABYLON.Scene} scene
 * @param {ReturnType<import("./car.js").createCar>} car
 */
export function createRearMirror(scene, car, cfg = MIRROR) {
  const engine = scene.getEngine();
  const cam = new BABYLON.UniversalCamera("mirrorCam", new BABYLON.Vector3(0, 0, 0), scene);
  cam.inputs.clear();
  cam.fov = cfg.fov;
  cam.minZ = cfg.minZ;
  cam.maxZ = cfg.maxZ;
  const v = cfg.viewport;
  cam.viewport = new BABYLON.Viewport(v.x, v.y, v.w, v.h);

  const proj = new BABYLON.Matrix();
  const flipX = BABYLON.Matrix.Scaling(-1, 1, 1);
  function updateProjection() {
    const aspect = (engine.getRenderWidth() * v.w) / Math.max(1, engine.getRenderHeight() * v.h);
    BABYLON.Matrix.PerspectiveFovLHToRef(cfg.fov, aspect, cfg.minZ, cfg.maxZ, proj, true, engine.isNDCHalfZRange);
    cam.freezeProjectionMatrix(proj.multiply(flipX));
  }
  updateProjection();
  const resizeObserver = engine.onResizeObservable.add(updateProjection);

  const beforeObserver = scene.onBeforeCameraRenderObservable.add((c) => {
    scene._mirroredCameraPosition = c === cam ? cam.globalPosition.clone() : null;
  });
  const afterObserver = scene.onAfterCameraRenderObservable.add((c) => {
    if (c === cam) scene._mirroredCameraPosition = null;
  });

  // Acompanha o carro (alinhado com a pista, sem girar com a guinada visual)
  const target = new BABYLON.Vector3();
  const poseObserver = scene.onBeforeRenderObservable.add(() => {
    const p = car.position;
    cam.position.set(p.x, p.y + cfg.height, p.z);
    target.set(p.x, p.y + 0.3, p.z - cfg.lookBehind);
    cam.setTarget(target);
  });

  return {
    camera: cam,
    dispose() {
      engine.onResizeObservable.remove(resizeObserver);
      scene.onBeforeCameraRenderObservable.remove(beforeObserver);
      scene.onAfterCameraRenderObservable.remove(afterObserver);
      scene.onBeforeRenderObservable.remove(poseObserver);
      scene._mirroredCameraPosition = null;
      cam.dispose();
    },
  };
}
