// Bootstrap: cria engine, cena, luzes, física, pista, carro, polícia, HUD e o loop do jogo.
// BABYLON é um global fornecido pelo CDN (ver index.html).

import { POLICE, MIRROR } from "./config.js";
import { initPhysics } from "./physics.js";
import { createTrack } from "./track.js";
import { createInput } from "./input.js";
import { createCar } from "./car.js";
import { createChaseCamera, createRearMirror } from "./camera.js";
import { createHud, formatTime } from "./hud.js";
import { createObstacles } from "./obstacles.js";
import { loadCarModel } from "./carModel.js";
import { createPolice } from "./police.js";
import { toKmh } from "./carPhysics.js";
import {
  createRaceState,
  updateRace,
  finishMessage,
  bustedMessage,
  READY_MESSAGE,
  progress,
} from "./gameState.js";

const canvas = document.getElementById("renderCanvas");
const loadingEl = document.getElementById("loading");

const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: false,
});

// Objeto de depuração exposto para ferramentas (tools/*.mjs)
const game = { ready: false, debug: () => ({}) };
window.__game = game;

// Parâmetros de URL para depuração/testes:
//   ?obstacles=0  desliga obstáculos     ?seed=N  muda o layout
//   ?police=0     desliga a polícia (e o retrovisor)
//   ?flip=0|1     força orientação do modelo do jogador
const params = new URLSearchParams(location.search);

function createLights(scene) {
  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.6;
  hemi.groundColor = new BABYLON.Color3(0.2, 0.2, 0.25);

  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.4, -1, 0.6), scene);
  sun.intensity = 0.9;
  return { hemi, sun };
}

const round = (v, d = 2) => Number(v.toFixed(d));

async function createScene() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.45, 0.65, 0.9, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
  scene.fogColor = new BABYLON.Color3(0.6, 0.75, 0.9);
  scene.fogStart = 150;
  scene.fogEnd = 400;

  createLights(scene);

  await initPhysics(scene);
  createTrack(scene);

  const obstacles =
    params.get("obstacles") === "0"
      ? { specs: [], meshes: [], dispose() {} }
      : createObstacles(scene, { seed: params.has("seed") ? Number(params.get("seed")) : undefined });

  const input = createInput(window);
  const car = createCar(scene, input, { name: "player" });
  const chase = createChaseCamera(scene, car);
  const hud = createHud();

  // Modelo .glb do carro esportivo; se falhar, o placeholder continua
  let modelInfo = { loaded: false };
  try {
    const flipParam = params.get("flip");
    const model = await loadCarModel(scene, {
      flipFront: flipParam === null ? undefined : flipParam === "1",
    });
    car.setVisualMesh(model);
    modelInfo = { loaded: true, ...model.metadata };
  } catch (err) {
    console.warn("Modelo do carro não carregou, usando placeholder:", err.message);
    modelInfo = { loaded: false, error: err.message };
  }

  // --- Polícia + retrovisor ---
  let police = null;
  let mirror = null;
  if (params.get("police") !== "0") {
    police = await createPolice(scene, { player: car, obstacles: obstacles.specs });
    mirror = createRearMirror(scene, car);
    hud.showMirrorFrame(MIRROR.viewport);
    hud.showPolice(true);

    police.onRam(({ rammed, closing }) => {
      if (rammed) {
        hud.flashHit();
        chase.shake(Math.min(1, closing / 25));
      } else {
        chase.shake(0.15); // raspada lateral
      }
    });
  }
  const gameCameras = () => [chase.camera, mirror?.camera].filter(Boolean);
  scene.activeCameras = gameCameras();

  // --- Estado da corrida ---
  let race = createRaceState();

  function restart() {
    race = createRaceState();
    car.reset();
    car.setControlsEnabled(true);
    police?.reset();
    chase.snapToCar();
    hud.setTime(0);
    hud.showMessage(READY_MESSAGE);
  }

  input.onReset(restart);

  car.onHit(({ impactSpeed }) => {
    hud.flashHit();
    chase.shake(Math.min(1, Math.abs(impactSpeed) / 30));
  });

  // Loop do jogo (antes de cada render)
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);

    // A viatura só sai depois de um pequeno atraso após a largada
    police?.setActive(race.phase === "racing" && race.elapsed >= POLICE.startDelay);

    const event = updateRace(race, {
      dt,
      anyInput: input.throttle !== 0 || input.steer !== 0,
      carZ: car.position.z,
      bounces: car.state.bounceCount,
      bust: police?.bust ?? 0,
    });

    if (event === "started") hud.hideMessage();
    if (event === "finished") {
      hud.setTime(race.finalTime);
      hud.showMessage(finishMessage(race, formatTime));
    }
    if (event === "busted") {
      car.setControlsEnabled(false);
      police.setActive(false);
      hud.setTime(race.finalTime);
      hud.showMessage(bustedMessage(race, formatTime));
    }

    hud.setSpeed(car.speed);
    if (race.phase === "racing") hud.setTime(race.elapsed);
    if (police) hud.setPolice(police.distance, police.bust);
  });

  hud.showMessage(READY_MESSAGE);

  // --- Depuração / ferramentas ---
  const text = (id) => document.getElementById(id).textContent;
  game.debug = () => ({
    race: {
      phase: race.phase,
      elapsed: round(race.elapsed),
      finalTime: round(race.finalTime),
      hits: race.hits,
      bustedAt: round(race.bustedAt),
    },
    progress: round(progress(car.position.z), 3),
    message: document.getElementById("message").classList.contains("hidden") ? null : text("message"),
    timer: text("timer"),
    model: modelInfo,
    obstacles: obstacles.specs.length,
    bounces: car.state.bounceCount,
    stun: round(car.state.stunTimer),
    controlsEnabled: car.controlsEnabled,
    heading: round(car.state.heading, 3),
    pose: {
      yaw: round(car.state.yaw, 3),
      roll: round(car.state.roll, 3),
      pitch: round(car.state.pitch, 3),
      steer: round(car.state.steerAngle, 3),
    },
    cameraFov: round(chase.camera.fov, 3),
    cameras: scene.activeCameras.map((c) => c.name),
    hudSpeed: text("speedValue"),
    meshes: scene.meshes.length,
    physics: !!scene.getPhysicsEngine(),
    fps: Math.round(engine.getFps()),
    speedKmh: toKmh(car.speed),
    speed: round(car.speed),
    vx: round(car.state.vx),
    pos: { x: round(car.position.x), y: round(car.position.y), z: round(car.position.z) },
    input: { throttle: input.throttle, steer: input.steer },
    police: police && {
      active: police.active,
      mode: police.mode,
      bust: round(police.bust, 3),
      distance: round(police.distance, 1),
      speed: round(police.car.speed),
      pos: {
        x: round(police.car.position.x),
        y: round(police.car.position.y),
        z: round(police.car.position.z),
      },
      targetX: round(police.brain.targetX),
      bounces: police.car.state.bounceCount,
      rams: police.rams,
      sirenPhase: police.sirenPhase,
      model: police.modelInfo,
      hudDistance: text("policeDistance"),
      hudBust: document.getElementById("bustMeter").getAttribute("aria-valuenow"),
    },
  });
  game.car = car;
  game.police = police;
  game.obstacles = obstacles;
  game.restart = restart;

  // Câmera de inspeção: game.viewFrom([x,y,z],[tx,ty,tz]) / game.viewChase()
  let debugCam = null;
  game.viewFrom = (pos, target) => {
    if (!debugCam) {
      debugCam = new BABYLON.UniversalCamera("debugCam", BABYLON.Vector3.Zero(), scene);
      debugCam.inputs.clear();
    }
    debugCam.position.set(pos[0], pos[1], pos[2]);
    debugCam.setTarget(new BABYLON.Vector3(target[0], target[1], target[2]));
    scene.activeCameras = [debugCam];
  };
  game.viewChase = () => {
    scene.activeCameras = gameCameras();
  };

  return scene;
}

async function start() {
  const scene = await createScene();

  loadingEl.classList.add("hidden");

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => engine.resize());

  scene.executeWhenReady(() => {
    game.ready = true;
  });
}

start().catch((err) => {
  console.error(err);
  loadingEl.textContent = "Erro ao iniciar: " + err.message;
});
