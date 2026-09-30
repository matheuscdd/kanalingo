// Pista: chão, paredes laterais, faixas, meios-fios e linha de chegada.

import { TRACK } from "./config.js";
import { makeStaticBox } from "./physics.js";

/**
 * Cria a pista completa e devolve referências úteis.
 * @param {BABYLON.Scene} scene
 */
export function createTrack(scene) {
  const halfW = TRACK.width / 2;
  // O asfalto começa `runUp` metros antes da largada (onde a polícia espera)
  const zMin = TRACK.startZ - (TRACK.runUp ?? 0);
  const zMax = TRACK.length;
  const totalLen = zMax - zMin;
  const centerZ = (zMin + zMax) / 2;

  // --- Chão (corpo físico estático) ---
  const ground = BABYLON.MeshBuilder.CreateBox(
    "ground",
    { width: TRACK.width, height: 0.5, depth: totalLen },
    scene
  );
  ground.position.set(0, -0.25, centerZ);
  ground.isVisible = false; // só física; o visual é o plano subdividido abaixo
  makeStaticBox(ground, { friction: 1.0, restitution: 0.0 });

  // --- Asfalto (visual) ---
  // Subdividido ao longo da pista: triângulos de mais de 1 km cortados pelo plano
  // próximo da câmera perdem precisão de profundidade e a grama "vaza" por cima.
  const asphalt = BABYLON.MeshBuilder.CreateGround(
    "asphalt",
    { width: TRACK.width, height: totalLen, subdivisionsX: 1, subdivisionsY: Math.ceil(totalLen / 20) },
    scene
  );
  asphalt.position.set(0, 0, centerZ);
  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.16, 0.16, 0.18);
  groundMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  asphalt.material = groundMat;

  // --- Grama ao redor (só visual) ---
  const grassLen = totalLen + 200;
  const grass = BABYLON.MeshBuilder.CreateGround(
    "grass",
    { width: TRACK.width * 12, height: grassLen, subdivisionsX: 4, subdivisionsY: Math.ceil(grassLen / 20) },
    scene
  );
  grass.position.set(0, -0.08, centerZ);
  const grassMat = new BABYLON.StandardMaterial("grassMat", scene);
  grassMat.diffuseColor = new BABYLON.Color3(0.13, 0.32, 0.14);
  grassMat.specularColor = BABYLON.Color3.Black();
  grass.material = grassMat;

  // --- Paredes laterais (físicas, invisíveis) ---
  const wallThickness = 0.5;
  const walls = [-1, 1].map((side) => {
    const wall = BABYLON.MeshBuilder.CreateBox(
      `wall_${side > 0 ? "R" : "L"}`,
      { width: wallThickness, height: TRACK.wallHeight * 2, depth: totalLen },
      scene
    );
    wall.position.set(side * (halfW + wallThickness / 2), TRACK.wallHeight, centerZ);
    wall.isVisible = false;
    makeStaticBox(wall, { restitution: 0.3, friction: 0.2 });
    return wall;
  });

  // --- Barreiras de fundo (início e fim da pista) para o carro não cair do asfalto ---
  for (const [name, z] of [["wall_back", zMin - wallThickness / 2], ["wall_end", zMax + wallThickness / 2]]) {
    const endWall = BABYLON.MeshBuilder.CreateBox(
      name,
      { width: TRACK.width + wallThickness * 2, height: TRACK.wallHeight * 2, depth: wallThickness },
      scene
    );
    endWall.position.set(0, TRACK.wallHeight, z);
    endWall.isVisible = false;
    makeStaticBox(endWall, { restitution: 0.3, friction: 0.2 });
    walls.push(endWall);
  }

  // --- Meios-fios vermelho/branco (visual) ---
  const curbMatRed = new BABYLON.StandardMaterial("curbRed", scene);
  curbMatRed.diffuseColor = new BABYLON.Color3(0.85, 0.12, 0.12);
  const curbMatWhite = new BABYLON.StandardMaterial("curbWhite", scene);
  curbMatWhite.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95);

  const curbLen = 4;
  const curbProtoRed = BABYLON.MeshBuilder.CreateBox(
    "curbProtoRed",
    { width: 0.6, height: 0.25, depth: curbLen },
    scene
  );
  curbProtoRed.material = curbMatRed;
  curbProtoRed.isVisible = false;
  const curbProtoWhite = curbProtoRed.clone("curbProtoWhite");
  curbProtoWhite.material = curbMatWhite;
  curbProtoWhite.isVisible = false;

  for (let z = zMin; z < zMax; z += curbLen) {
    const proto = Math.floor((z - zMin) / curbLen) % 2 === 0 ? curbProtoRed : curbProtoWhite;
    for (const side of [-1, 1]) {
      const inst = proto.createInstance(`curb_${side}_${z}`);
      inst.position.set(side * (halfW + 0.3), 0.125, z + curbLen / 2);
    }
  }

  // --- Faixas tracejadas (visual) ---
  const stripeMat = new BABYLON.StandardMaterial("stripeMat", scene);
  stripeMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.85);
  stripeMat.emissiveColor = new BABYLON.Color3(0.25, 0.25, 0.2);

  const dashLen = 3;
  const dashGap = 6;
  const stripeProto = BABYLON.MeshBuilder.CreateBox(
    "stripeProto",
    { width: 0.15, height: 0.02, depth: dashLen },
    scene
  );
  stripeProto.material = stripeMat;
  stripeProto.isVisible = false;

  const laneWidth = TRACK.width / TRACK.laneCount;
  for (let i = 1; i < TRACK.laneCount; i++) {
    const x = -halfW + i * laneWidth;
    for (let z = zMin; z < zMax; z += dashLen + dashGap) {
      const inst = stripeProto.createInstance(`stripe_${i}_${z}`);
      inst.position.set(x, 0.011, z + dashLen / 2);
    }
  }

  // --- Linha de largada e chegada (quadriculado) ---
  const finishDepth = 3;
  const finishLine = BABYLON.MeshBuilder.CreateGround(
    "finishLine",
    { width: TRACK.width, height: finishDepth },
    scene
  );
  finishLine.position.set(0, 0.012, TRACK.finishZ);
  finishLine.material = createCheckerMaterial(scene, "finishMat", TRACK.width, finishDepth, 0.75);

  const startDepth = 1.5;
  const startLine = BABYLON.MeshBuilder.CreateGround(
    "startLine",
    { width: TRACK.width, height: startDepth },
    scene
  );
  startLine.position.set(0, 0.012, TRACK.startZ);
  startLine.material = createCheckerMaterial(scene, "startMat", TRACK.width, startDepth, 0.75);

  // --- Pórtico da chegada ---
  createFinishGate(scene, halfW);

  // --- Postes laterais para sensação de velocidade ---
  createPoles(scene, halfW);

  return { ground, walls, finishLine };
}

const CHECKER_CELLS = 8;

function createCheckerTexture(scene, name = "checker") {
  const size = 256;
  const tex = new BABYLON.DynamicTexture(name, size, scene, true);
  // DynamicTexture vem com CLAMP; com uScale/vScale > 1 precisamos repetir o padrão
  tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  const ctx = tex.getContext();
  const cell = size / CHECKER_CELLS;
  for (let y = 0; y < CHECKER_CELLS; y++) {
    for (let x = 0; x < CHECKER_CELLS; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#f2f2f2" : "#111111";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  tex.update();
  return tex;
}

/**
 * Material quadriculado com células quadradas de `cellSize` metros,
 * independente das dimensões (width x depth) do mesh.
 */
function createCheckerMaterial(scene, name, width, depth, cellSize) {
  const tex = createCheckerTexture(scene, `${name}_tex`);
  tex.uScale = width / cellSize / CHECKER_CELLS;
  tex.vScale = depth / cellSize / CHECKER_CELLS;
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseTexture = tex;
  mat.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
  mat.specularColor = BABYLON.Color3.Black();
  return mat;
}

function createFinishGate(scene, halfW) {
  const mat = new BABYLON.StandardMaterial("gateMat", scene);
  mat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);

  const postH = 6;
  for (const side of [-1, 1]) {
    const post = BABYLON.MeshBuilder.CreateBox(
      `gatePost_${side}`,
      { width: 0.4, height: postH, depth: 0.4 },
      scene
    );
    post.position.set(side * (halfW + 1), postH / 2, TRACK.finishZ);
    post.material = mat;
  }
  const beam = BABYLON.MeshBuilder.CreateBox(
    "gateBeam",
    { width: TRACK.width + 2.4, height: 0.8, depth: 0.4 },
    scene
  );
  beam.position.set(0, postH, TRACK.finishZ);
  beam.material = createCheckerMaterial(scene, "beamMat", TRACK.width + 2.4, 0.8, 0.4);
}

function createPoles(scene, halfW) {
  const mat = new BABYLON.StandardMaterial("poleMat", scene);
  mat.diffuseColor = new BABYLON.Color3(0.75, 0.75, 0.8);

  const proto = BABYLON.MeshBuilder.CreateCylinder(
    "poleProto",
    { height: 4, diameter: 0.25 },
    scene
  );
  proto.material = mat;
  proto.isVisible = false;

  for (let z = 20; z < TRACK.length; z += 40) {
    for (const side of [-1, 1]) {
      const inst = proto.createInstance(`pole_${side}_${z}`);
      inst.position.set(side * (halfW + 3), 2, z);
    }
  }
}
