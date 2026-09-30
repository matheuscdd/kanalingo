// Carrega um modelo .glb de carro e o normaliza para caber na caixa física:
// escala pelo comprimento, frente em +Z, rodas no fundo da caixa.
// Modelos: "Sports Car" e "Police Car" por Quaternius (CC0) via poly.pizza.
// Em caso de falha, o chamador mantém o placeholder.

import { CAR, MODEL } from "./config.js";

// Nós que não fazem parte do carro em si (bases, planos, câmeras de demonstração)
const EXCLUDE_NAME = /fabric|plane|ground|base|floor|camera/i;

/**
 * @param {BABYLON.Scene} scene
 * @param {Object} [opts]
 * @param {string} [opts.file] arquivo em MODEL.dir (padrão MODEL.file, o carro do jogador)
 * @param {boolean} [opts.flipFront] gira 180° (padrão MODEL.flipFront)
 * @param {string|null} [opts.bodyMaterial] material pintado com bodyColor (null = não pinta)
 * @param {{ r: number, g: number, b: number }} [opts.bodyColor] (padrão CAR.bodyColor)
 * @param {string} [opts.name] nome do nó raiz (padrão "carModel")
 * @returns {Promise<BABYLON.TransformNode>} nó pronto para ser parentado ao carro, com
 *          `.wheels` (rodas animáveis) e `.materials` (materiais únicos do modelo)
 */
export async function loadCarModel(scene, opts = {}) {
  const file = opts.file ?? MODEL.file;
  const flipFront = opts.flipFront ?? MODEL.flipFront;
  const bodyMaterial = opts.bodyMaterial === undefined ? MODEL.bodyMaterial : opts.bodyMaterial;
  const color = opts.bodyColor ?? CAR.bodyColor;
  const camerasBefore = new Set(scene.cameras);

  const result = await BABYLON.SceneLoader.ImportMeshAsync("", MODEL.dir, file, scene);

  // Descarta câmeras que o arquivo possa trazer
  for (const cam of [...scene.cameras]) {
    if (!camerasBefore.has(cam)) cam.dispose();
  }

  const root = result.meshes.find((m) => m.name === "__root__") ?? result.meshes[0];

  // Remove bases/planos e outros nós que não são o carro
  for (const m of result.meshes) {
    if (m !== root && EXCLUDE_NAME.test(m.name)) m.dispose(false, false);
  }
  for (const t of result.transformNodes ?? []) {
    if (EXCLUDE_NAME.test(t.name)) t.dispose(false, false);
  }

  // Materiais: pinta a carroceria e simplifica vidro com refração (caro)
  const bodyColor = new BABYLON.Color3(color.r, color.g, color.b);
  const seen = new Set();
  for (const m of result.meshes) {
    const mat = m.material;
    if (!mat || seen.has(mat)) continue;
    seen.add(mat);

    if (bodyMaterial && mat.name === bodyMaterial) {
      if (mat.albedoColor) mat.albedoColor = bodyColor; // PBRMaterial
      else if (mat.diffuseColor) mat.diffuseColor = bodyColor; // StandardMaterial
      if ("metallic" in mat) {
        mat.metallic = 0.3;
        mat.roughness = 0.35;
      }
    }
    if (mat.subSurface?.isRefractionEnabled) {
      mat.subSurface.isRefractionEnabled = false;
      mat.alpha = 0.35;
      mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    }
  }

  // Suporte que recebe rotação/escala/offset; o root do glTF fica intacto dentro dele
  const holder = new BABYLON.TransformNode(opts.name ?? "carModel", scene);
  root.parent = holder;

  // 1) Mede o modelo sem transformações para descobrir eixo do comprimento e escala
  let { min, max } = holder.getHierarchyBoundingVectors(true);
  let size = max.subtract(min);
  const lengthAlongZ = size.z >= size.x;
  const modelLength = lengthAlongZ ? size.z : size.x;
  const scale = CAR.length / modelLength;

  // 2) Aplica rotação (comprimento em X -> gira 90°; flip opcional) e escala
  let yaw = lengthAlongZ ? 0 : Math.PI / 2;
  if (flipFront) yaw += Math.PI;
  holder.rotation.y = yaw;
  holder.scaling.setAll(scale);

  // 3) Mede de novo já transformado e centraliza: XZ no centro, rodas no fundo da caixa
  ({ min, max } = holder.getHierarchyBoundingVectors(true));
  size = max.subtract(min);
  const centerX = (min.x + max.x) / 2;
  const centerZ = (min.z + max.z) / 2;
  holder.position.x -= centerX;
  holder.position.z -= centerZ;
  holder.position.y += -CAR.height / 2 - min.y;

  // 4) Rodas: ajusta o pivô para o centro de cada malha de roda para poder girá-las
  const wheels = setupWheels(result.meshes);

  holder.metadata = {
    source: MODEL.dir + file,
    flipFront,
    scale,
    size: { x: size.x, y: size.y, z: size.z },
    meshCount: result.meshes.filter((m) => !m.isDisposed()).length,
    wheelCount: wheels.length,
  };
  holder.wheels = wheels;
  holder.materials = [...seen];

  return holder;
}

/**
 * Prepara as malhas de roda: pivô no centro da roda, sinais de rotação corrigidos
 * pelo espelhamento do glTF e marcação das dianteiras como esterçáveis.
 *
 * Uma roda pode vir como várias primitivas (pneu + aro) irmãs sob o mesmo nó;
 * elas compartilham o mesmo pivô para não se separarem ao esterçar.
 *
 * @returns {{ mesh: BABYLON.AbstractMesh, radius: number, rollSign: number, yawSign: number, baseY: number, steerable: boolean }[]}
 */
function setupWheels(meshes) {
  const isWheel = (n) => /wheel/i.test(n?.name ?? "");
  const candidates = meshes.filter((m) => !m.isDisposed() && isWheel(m) && m.getTotalVertices() > 0);

  // Agrupa primitivas irmãs da mesma roda
  const groups = new Map();
  for (const m of candidates) {
    const key = m.parent && isWheel(m.parent) ? m.parent : m;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }

  const wheels = [];
  for (const [key, group] of groups) {
    // Pivô comum: centro da união dos bounding boxes locais (irmãs compartilham o espaço local)
    let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
    let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
    for (const m of group) {
      const bb = m.getBoundingInfo().boundingBox;
      min = BABYLON.Vector3.Minimize(min, bb.minimum);
      max = BABYLON.Vector3.Maximize(max, bb.maximum);
    }
    const pivot = min.add(max).scale(0.5);

    const steerable = /front|frente|dianteir/i.test(key.name) || group.some((m) => /front|frente|dianteir/i.test(m.name));

    for (const mesh of group) {
      mesh.setPivotPoint(pivot.clone());

      // Troca quaternion por Euler para poder ajustar rotation.x/rotation.y
      const euler = mesh.rotationQuaternion ? mesh.rotationQuaternion.toEulerAngles() : mesh.rotation.clone();
      mesh.rotationQuaternion = null;
      mesh.rotation.copyFrom(euler);
      mesh.computeWorldMatrix(true);

      // Raio em metros (metade da altura da roda no mundo)
      const worldBB = mesh.getBoundingInfo().boundingBox;
      const radius = Math.max(0.05, (worldBB.maximumWorld.y - worldBB.minimumWorld.y) / 2);

      // Sinais: o loader do glTF espelha um eixo no __root__, o que inverte o sentido
      // de algumas rotações locais. Testamos para onde os eixos locais apontam no mundo.
      const wm = mesh.getWorldMatrix();
      const fwd = BABYLON.Vector3.TransformNormal(BABYLON.Vector3.Forward(), wm);
      const right = BABYLON.Vector3.TransformNormal(BABYLON.Vector3.Right(), wm);
      const up = BABYLON.Vector3.TransformNormal(BABYLON.Vector3.Up(), wm);
      const rollSign = Math.sign(fwd.z * up.y) || 1; // girar +X local leva o topo para +Z?
      const yawSign = Math.sign(right.x * fwd.z) || 1; // girar +Y local leva a frente para +X?

      wheels.push({ mesh, radius, rollSign, yawSign, baseY: euler.y, steerable });
    }
  }
  return wheels;
}
