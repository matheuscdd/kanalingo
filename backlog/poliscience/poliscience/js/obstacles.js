// Obstáculos estáticos na pista: caixas, cones e barreiras (massa 0).
// Cada mesh recebe metadata.isObstacle = true para o carro identificar a colisão.

import { OBSTACLES } from "./config.js";
import { generateObstacles } from "./obstacleLayout.js";

/**
 * @param {BABYLON.Scene} scene
 * @param {{ seed?: number }} [opts]
 */
export function createObstacles(scene, opts = {}) {
  const specs = generateObstacles({ seed: opts.seed });
  const mats = createMaterials(scene);
  const meshes = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const mesh = createObstacleMesh(scene, spec, i, mats);
    mesh.metadata = { isObstacle: true, kind: spec.kind, index: i };
    meshes.push(mesh);
  }

  return {
    specs,
    meshes,
    dispose() {
      for (const m of meshes) {
        m.physicsBody?.dispose();
        m.dispose();
      }
      meshes.length = 0;
    },
  };
}

function createMaterials(scene) {
  const box = new BABYLON.StandardMaterial("obsBoxMat", scene);
  box.diffuseColor = new BABYLON.Color3(0.85, 0.55, 0.15);
  box.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

  const cone = new BABYLON.StandardMaterial("obsConeMat", scene);
  cone.diffuseColor = new BABYLON.Color3(1.0, 0.45, 0.05);
  cone.emissiveColor = new BABYLON.Color3(0.25, 0.08, 0.0);

  const barrier = new BABYLON.StandardMaterial("obsBarrierMat", scene);
  barrier.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.92);
  barrier.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

  const stripe = new BABYLON.StandardMaterial("obsStripeMat", scene);
  stripe.diffuseColor = new BABYLON.Color3(0.9, 0.1, 0.1);

  return { box, cone, barrier, stripe };
}

/**
 * Cria o visual do obstáculo e um corpo físico BOX estático com o tamanho do spec.
 * O corpo físico fica no mesh raiz (uma caixa invisível) para simplificar a colisão.
 */
function createObstacleMesh(scene, spec, index, mats) {
  const name = `obstacle_${index}`;

  // Raiz física: caixa invisível com as dimensões do spec
  const root = BABYLON.MeshBuilder.CreateBox(
    name,
    { width: spec.w, height: spec.h, depth: spec.d },
    scene
  );
  root.position.set(spec.x, spec.h / 2, spec.z);
  root.isVisible = false;

  // Visual filho conforme o tipo
  let visual;
  if (spec.kind === "cone") {
    visual = BABYLON.MeshBuilder.CreateCylinder(
      `${name}_cone`,
      { height: spec.h, diameterTop: 0.15, diameterBottom: Math.min(spec.w, spec.d) * 0.9, tessellation: 12 },
      scene
    );
    visual.material = mats.cone;
    // Base do cone
    const base = BABYLON.MeshBuilder.CreateBox(
      `${name}_base`,
      { width: spec.w * 0.9, height: 0.08, depth: spec.d * 0.9 },
      scene
    );
    base.position.y = -spec.h / 2 + 0.04;
    base.material = mats.box;
    base.parent = root;
  } else if (spec.kind === "barrier") {
    visual = BABYLON.MeshBuilder.CreateBox(
      `${name}_barrier`,
      { width: spec.w, height: spec.h, depth: spec.d },
      scene
    );
    visual.material = mats.barrier;
    // Faixas vermelhas
    for (const yOff of [-0.25, 0.25]) {
      const band = BABYLON.MeshBuilder.CreateBox(
        `${name}_band`,
        { width: spec.w + 0.02, height: spec.h * 0.18, depth: spec.d + 0.02 },
        scene
      );
      band.position.y = yOff * spec.h;
      band.material = mats.stripe;
      band.parent = root;
    }
  } else {
    visual = BABYLON.MeshBuilder.CreateBox(
      `${name}_box`,
      { width: spec.w, height: spec.h, depth: spec.d },
      scene
    );
    visual.material = mats.box;
    // Leve rotação visual para variar (não afeta a física)
    visual.rotation.y = ((index * 37) % 20 - 10) * (Math.PI / 180);
  }
  visual.parent = root;

  new BABYLON.PhysicsAggregate(
    root,
    BABYLON.PhysicsShapeType.BOX,
    { mass: 0, restitution: OBSTACLES.restitution, friction: 0.6 },
    scene
  );

  return root;
}
